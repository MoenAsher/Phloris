"""Recipient self-service performance route (UR-10) — PUBLIC, token-scoped.

A recipient reaches this from the opaque token in their own feedback link, so
there is no JWT. The token resolves to exactly one target; this endpoint then
reports only that target's history across the campaigns they received.

Ethical safeguard (UR-08): the query is filtered by the resolved `target_id`
alone, so it is structurally impossible for the response to include another
recipient's data. Personal data is minimised — only the recipient's own first
name is echoed (already present in their email), never anyone else's details.
"""

from flask import Blueprint, jsonify

from ..extensions import db
from ..models import Campaign, Target, Event, EventType, TrackingToken

performance_bp = Blueprint("performance", __name__)


@performance_bp.get("/performance/<token>")
def performance(token):
    """Return the token-holder's own outcomes for every campaign they received."""
    tracking = TrackingToken.query.filter_by(token=token).first()
    if tracking is None:
        # Generic 404 — do not reveal whether a token ever existed.
        return jsonify({"error": "not found"}), 404

    target_id = tracking.target_id
    target = db.session.get(Target, target_id)

    # Scope strictly to this one target. No other recipient's rows are queried.
    events = Event.query.filter_by(target_id=target_id).all()

    # Earliest timestamp per (campaign, event_type) for this target.
    by_campaign: dict[int, dict] = {}
    for event in events:
        per_campaign = by_campaign.setdefault(event.campaign_id, {})
        if event.event_type not in per_campaign or event.timestamp < per_campaign[event.event_type]:
            per_campaign[event.event_type] = event.timestamp

    campaigns = []
    for campaign_id, info in by_campaign.items():
        sent_ts = info.get(EventType.sent)
        click_ts = info.get(EventType.clicked)
        report_ts = info.get(EventType.reported)

        clicked = click_ts is not None
        reported = report_ts is not None
        if clicked:
            outcome = "clicked"
        elif reported:
            outcome = "reported"
        else:
            outcome = "ignored"

        campaign = db.session.get(Campaign, campaign_id)
        campaigns.append(
            {
                "campaign_id": campaign_id,
                "campaign_name": campaign.name if campaign else None,
                "clicked": clicked,
                "reported": reported,
                "outcome": outcome,
                "time_to_click_seconds": (
                    (click_ts - sent_ts).total_seconds() if clicked and sent_ts else None
                ),
                "time_to_report_seconds": (
                    (report_ts - sent_ts).total_seconds() if reported and sent_ts else None
                ),
            }
        )

    campaigns.sort(key=lambda c: c["campaign_id"])

    return (
        jsonify(
            {
                "data": {
                    "first_name": target.first_name if target else None,
                    "campaigns": campaigns,
                }
            }
        ),
        200,
    )
