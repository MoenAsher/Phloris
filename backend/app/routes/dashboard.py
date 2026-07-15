"""Dashboard / analytics routes (UR-01, UR-04..UR-07).

Admin-only (JWT) read endpoints that turn the raw `Event` log into the numbers
the dashboard renders: an overview across all campaigns, the four per-campaign
metrics (via the metrics service), a click/report timeline for line charts, and
a per-target outcome breakdown.

All responses follow the `{"data": ...}` / `{"error": ...}` envelope. Every
rate here counts *distinct targets*, never raw events, so repeated clicks or
reports can never push a rate above 100%.
"""

from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required
from sqlalchemy import func

from ..extensions import db
from ..models import Campaign, Target, Event, EventType
from ..services.metrics import campaign_metrics
from ..utils.time import iso

dashboard_bp = Blueprint("dashboard", __name__)


def _err(message: str, status: int):
    return jsonify({"error": message}), status


def _distinct_pair_count(event_type: EventType) -> int:
    """Count distinct (campaign, target) pairs having an event of this type.

    Aggregating across all campaigns by pair means a target counts once per
    campaign it took part in, which is the right unit for an overall rate.
    """
    subquery = (
        db.session.query(Event.campaign_id, Event.target_id)
        .filter(Event.event_type == event_type)
        .distinct()
        .subquery()
    )
    return db.session.query(func.count()).select_from(subquery).scalar()


@dashboard_bp.get("/dashboard/overview")
@jwt_required()
def overview():
    """Totals across the whole system plus overall click and report rates."""
    total_campaigns = db.session.query(func.count(Campaign.id)).scalar()
    total_targets = db.session.query(func.count(Target.id)).scalar()

    sent_pairs = _distinct_pair_count(EventType.sent)
    clicked_pairs = _distinct_pair_count(EventType.clicked)
    reported_pairs = _distinct_pair_count(EventType.reported)

    # Guard the denominator: with nothing sent yet, rates are 0.0, not an error.
    click_rate = clicked_pairs / sent_pairs if sent_pairs else 0.0
    report_rate = reported_pairs / sent_pairs if sent_pairs else 0.0

    return (
        jsonify(
            {
                "data": {
                    "total_campaigns": total_campaigns,
                    "total_targets": total_targets,
                    "emails_sent": sent_pairs,
                    "overall_click_rate": click_rate,
                    "overall_report_rate": report_rate,
                }
            }
        ),
        200,
    )


@dashboard_bp.get("/dashboard/campaigns/<int:campaign_id>/metrics")
@jwt_required()
def campaign_metrics_endpoint(campaign_id):
    """The four behavioural metrics for one campaign (delegates to the service)."""
    campaign = db.session.get(Campaign, campaign_id)
    if campaign is None:
        return _err("campaign not found", 404)
    return jsonify({"data": campaign_metrics(campaign_id).to_dict()}), 200


@dashboard_bp.get("/dashboard/campaigns/<int:campaign_id>/timeline")
@jwt_required()
def campaign_timeline(campaign_id):
    """Cumulative click/report reach over time, for a line chart.

    Each point marks the first time a distinct target clicked or reported, with
    the running distinct-target totals. Repeat actions by the same target add no
    point, so the lines track reach (people), not raw event volume.
    """
    campaign = db.session.get(Campaign, campaign_id)
    if campaign is None:
        return _err("campaign not found", 404)

    events = (
        Event.query.filter(
            Event.campaign_id == campaign_id,
            Event.event_type.in_([EventType.clicked, EventType.reported]),
        )
        .order_by(Event.timestamp)
        .all()
    )

    seen_clicks: set[int] = set()
    seen_reports: set[int] = set()
    points = []
    for event in events:
        changed = False
        if event.event_type == EventType.clicked and event.target_id not in seen_clicks:
            seen_clicks.add(event.target_id)
            changed = True
        elif event.event_type == EventType.reported and event.target_id not in seen_reports:
            seen_reports.add(event.target_id)
            changed = True
        if changed:
            points.append(
                {
                    "timestamp": iso(event.timestamp),
                    "event_type": event.event_type.value,
                    "cumulative_clicks": len(seen_clicks),
                    "cumulative_reports": len(seen_reports),
                }
            )

    return (
        jsonify(
            {
                "data": {
                    "campaign_id": campaign_id,
                    "launched_at": iso(campaign.launched_at),
                    "points": points,
                }
            }
        ),
        200,
    )


@dashboard_bp.get("/dashboard/campaigns/<int:campaign_id>/targets")
@jwt_required()
def campaign_targets(campaign_id):
    """Per-target outcome list: sent / clicked / reported / no-action.

    Lists every target in the campaign's group so send failures are visible as
    `not_sent` (they never received the email), rather than being silently
    dropped. Timings are measured from each target's own `sent` event.
    """
    campaign = db.session.get(Campaign, campaign_id)
    if campaign is None:
        return _err("campaign not found", 404)

    # Earliest timestamp per (target, event_type) for this campaign.
    first: dict[int, dict] = {}
    for event in Event.query.filter_by(campaign_id=campaign_id).all():
        per_target = first.setdefault(event.target_id, {})
        if event.event_type not in per_target or event.timestamp < per_target[event.event_type]:
            per_target[event.event_type] = event.timestamp

    results = []
    for target in sorted(campaign.target_group.targets, key=lambda t: t.id):
        info = first.get(target.id, {})
        sent_ts = info.get(EventType.sent)
        click_ts = info.get(EventType.clicked)
        report_ts = info.get(EventType.reported)

        sent = sent_ts is not None
        clicked = click_ts is not None
        reported = report_ts is not None

        if not sent:
            outcome = "not_sent"
        elif clicked:
            outcome = "clicked"
        elif reported:
            outcome = "reported"
        else:
            outcome = "no_action"

        results.append(
            {
                "target_id": target.id,
                "email": target.email,
                "first_name": target.first_name,
                "last_name": target.last_name,
                "sent": sent,
                "clicked": clicked,
                "reported": reported,
                "outcome": outcome,
                "time_to_click_seconds": (
                    (click_ts - sent_ts).total_seconds() if clicked and sent else None
                ),
                "time_to_report_seconds": (
                    (report_ts - sent_ts).total_seconds() if reported and sent else None
                ),
            }
        )

    return jsonify({"data": {"campaign_id": campaign_id, "targets": results}}), 200
