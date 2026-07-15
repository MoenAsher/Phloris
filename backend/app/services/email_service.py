"""Campaign launch and email sending (Section 8 of the project spec).

This service owns the send flow for `POST /api/campaigns/:id/launch`:

    1. Load the campaign, its template, and every target in the target group.
    2. For each target: mint an opaque token, build the click/report URLs,
       render the template body, send the mail through Mailtrap, and record a
       `sent` Event.
    3. Flip the campaign to `running` and stamp `launched_at`.

Ethical safeguards (Section 11) are enforced here by construction:
  - Tokens are opaque URL-safe random strings carrying no personal data; a
    recipient's identity is only resolvable internally via `TrackingToken`.
  - Nothing beyond the (campaign, target, event_type, timestamp) tuple is
    persisted — no IP address, user-agent, or fingerprint is available to or
    recorded by this code path.
"""

from __future__ import annotations

import time
from dataclasses import dataclass, field

from flask import current_app
from flask_mail import Message

from ..extensions import db, mail
from ..models import Campaign, CampaignStatus, Event, EventType, TrackingToken
from ..utils.time import utcnow


@dataclass
class LaunchResult:
    """Outcome of a launch attempt, returned to the route for the response."""

    total_targets: int = 0
    sent_count: int = 0
    failed: list[dict] = field(default_factory=list)


def launch_campaign(campaign: Campaign) -> LaunchResult:
    """Send the campaign to every target in its group and record `sent` events.

    Persists a `TrackingToken` and a `sent` `Event` only for targets whose mail
    is accepted by the SMTP server, so a delivery failure never leaves an orphan
    token or a phantom `sent` event that would skew metric denominators. The
    campaign is promoted to `running` only if at least one email was sent.

    Assumes the caller has already validated that the campaign is launchable
    (draft/scheduled) and that its target group is non-empty.
    """
    template = campaign.template
    targets = campaign.target_group.targets
    base_url = current_app.config["TRACKING_BASE_URL"].rstrip("/")
    send_delay = current_app.config.get("MAIL_SEND_DELAY", 0)

    result = LaunchResult(total_targets=len(targets))

    for index, target in enumerate(targets):
        # Space out sends to stay under the SMTP provider's rate limit
        # (Mailtrap's free tier caps at roughly one email per second).
        if index > 0 and send_delay:
            time.sleep(send_delay)

        token = TrackingToken.generate_token()
        click_url = f"{base_url}/track/click/{token}"
        report_url = f"{base_url}/report?token={token}"

        subject = _render(
            template.subject, target, click_url, report_url
        )
        body_html = _render(
            template.body_html, target, click_url, report_url
        )

        try:
            _send_email(subject, target.email, body_html)
        except Exception as exc:  # noqa: BLE001 - surface any SMTP failure per target
            result.failed.append(
                {"target_id": target.id, "email": target.email, "error": str(exc)}
            )
            continue

        # Only persist the token + sent event once delivery has been accepted.
        db.session.add(
            TrackingToken(
                token=token,
                campaign_id=campaign.id,
                target_id=target.id,
            )
        )
        db.session.add(
            Event(
                campaign_id=campaign.id,
                target_id=target.id,
                event_type=EventType.sent,
                timestamp=utcnow(),
            )
        )
        result.sent_count += 1

    if result.sent_count > 0:
        campaign.status = CampaignStatus.running
        campaign.launched_at = utcnow()
        db.session.commit()
    else:
        # Nothing was delivered; discard any pending state and leave the
        # campaign in its current (draft/scheduled) status for a retry.
        db.session.rollback()

    return result


def _render(text: str, target, tracking_link: str, report_link: str) -> str:
    """Substitute the supported placeholders in a template string.

    Recognises `{{first_name}}`, `{{last_name}}`, `{{tracking_link}}`, and
    `{{report_link}}`. Missing personalisation fields collapse to an empty
    string so partial target data never leaks a literal placeholder into the
    delivered email.
    """
    return (
        text.replace("{{first_name}}", target.first_name or "")
        .replace("{{last_name}}", target.last_name or "")
        .replace("{{tracking_link}}", tracking_link)
        .replace("{{report_link}}", report_link)
    )


def _send_email(subject: str, recipient: str, html_body: str) -> None:
    """Send a single HTML email via Flask-Mail (Mailtrap sandbox).

    The sender is taken from `MAIL_DEFAULT_SENDER`. Raises on SMTP failure so
    the caller can record the failure per target.
    """
    message = Message(subject=subject, recipients=[recipient], html=html_body)
    mail.send(message)
