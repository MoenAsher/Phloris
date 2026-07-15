"""Public tracking routes (no auth) — UR-04..UR-07, UR-09.

These endpoints back the opaque links embedded in simulation emails. They are
deliberately unauthenticated (a recipient clicking a link has no JWT) and
resolve an opaque token to its (campaign, target) pair internally.

Ethical safeguards (Section 11) are enforced here: the only thing recorded is
an Event (type + UTC timestamp). No IP address, user-agent, referrer, or any
other request metadata is read or stored.
"""

from flask import Blueprint, request, jsonify, redirect, current_app

from ..extensions import db
from ..models import Event, EventType, TrackingToken
from ..utils.time import utcnow

tracking_bp = Blueprint("tracking", __name__)


def _feedback_url(token: str, *, reported: bool = False) -> str:
    """Build the recipient-facing feedback page URL on the frontend."""
    base = current_app.config["FRONTEND_ORIGIN"].rstrip("/")
    url = f"{base}/feedback/{token}"
    return f"{url}?reported=1" if reported else url


def _record_event(token: str, event_type: EventType) -> TrackingToken | None:
    """Record a behavioural event for a token, or return None if unknown.

    Each interaction is stored as its own Event; rate metrics count distinct
    targets, not raw events, so repeated clicks/reports are harmless. Only the
    event type and timestamp are captured.
    """
    tracking = TrackingToken.query.filter_by(token=token).first()
    if tracking is None:
        return None

    db.session.add(
        Event(
            campaign_id=tracking.campaign_id,
            target_id=tracking.target_id,
            event_type=event_type,
            timestamp=utcnow(),
        )
    )
    db.session.commit()
    return tracking


@tracking_bp.get("/track/click/<token>")
def track_click(token):
    """Record a `clicked` event, then redirect to the educational feedback page."""
    tracking = _record_event(token, EventType.clicked)
    if tracking is None:
        return jsonify({"error": "invalid tracking token"}), 404
    return redirect(_feedback_url(token), code=302)


@tracking_bp.post("/report")
def report():
    """Record a `reported` event from the token in the request body (JSON/form)."""
    data = request.get_json(silent=True) or {}
    token = data.get("token") or request.form.get("token")
    if not token:
        return jsonify({"error": "token is required"}), 400

    tracking = _record_event(token, EventType.reported)
    if tracking is None:
        return jsonify({"error": "invalid tracking token"}), 404
    return (
        jsonify(
            {"data": {"message": "Thank you for reporting this simulated phishing email."}}
        ),
        200,
    )


@tracking_bp.get("/report")
def report_via_link():
    """Record a `reported` event from an emailed report link (`/report?token=`).

    The report URL embedded in emails is a plain link, so clicking it issues a
    GET. This mirrors the POST handler and then sends the recipient to the
    feedback page, flagged as a report so the page can acknowledge the good
    behaviour.
    """
    token = request.args.get("token")
    if not token:
        return jsonify({"error": "token is required"}), 400

    tracking = _record_event(token, EventType.reported)
    if tracking is None:
        return jsonify({"error": "invalid tracking token"}), 404
    return redirect(_feedback_url(token, reported=True), code=302)
