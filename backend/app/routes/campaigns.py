"""Campaign management routes.

CRUD over campaigns plus the launch action that drives the email send flow
(delegated to `services.email_service`). All routes require a valid JWT and
follow the `{"data": ...}` / `{"error": ...}` envelope convention.

Business logic for launching (token minting, rendering, sending, event
recording) lives in the service layer, not here, per the project conventions.
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required

from ..extensions import db
from ..models import Campaign, CampaignStatus, Template, TargetGroup, SendingProfile
from ..services.email_service import launch_campaign
from ..utils.time import utcnow, parse_utc

campaigns_bp = Blueprint("campaigns", __name__)

# CampaignStatus.scheduled is retained here so any campaign already in that
# state can still be launched. Scheduled auto-launch (cron → launch) is
# documented as future work; the create/update API no longer accepts scheduled_at.
LAUNCHABLE_STATUSES = {CampaignStatus.draft, CampaignStatus.scheduled}


def _err(message: str, status: int):
    return jsonify({"error": message}), status


@campaigns_bp.get("/campaigns")
@jwt_required()
def list_campaigns():
    campaigns = Campaign.query.order_by(Campaign.id).all()
    return jsonify({"data": [c.to_dict() for c in campaigns]}), 200


@campaigns_bp.get("/campaigns/<int:campaign_id>")
@jwt_required()
def get_campaign(campaign_id):
    campaign = db.session.get(Campaign, campaign_id)
    if campaign is None:
        return _err("campaign not found", 404)
    return jsonify({"data": campaign.to_dict()}), 200


@campaigns_bp.post("/campaigns")
@jwt_required()
def create_campaign():
    data = request.get_json(silent=True) or {}
    name = (data.get("name") or "").strip()
    if not name:
        return _err("name is required", 400)

    template_id = data.get("template_id")
    target_group_id = data.get("target_group_id")
    if template_id is None or target_group_id is None:
        return _err("template_id and target_group_id are required", 400)
    if db.session.get(Template, template_id) is None:
        return _err("template not found", 404)
    if db.session.get(TargetGroup, target_group_id) is None:
        return _err("target group not found", 404)

    sending_profile_id = data.get("sending_profile_id")
    if sending_profile_id is not None and db.session.get(SendingProfile, sending_profile_id) is None:
        return _err("sending profile not found", 404)

    campaign = Campaign(
        name=name,
        template_id=template_id,
        target_group_id=target_group_id,
        sending_profile_id=sending_profile_id,
        status=CampaignStatus.draft,
    )
    db.session.add(campaign)
    db.session.commit()
    return jsonify({"data": campaign.to_dict()}), 201


@campaigns_bp.put("/campaigns/<int:campaign_id>")
@jwt_required()
def update_campaign(campaign_id):
    campaign = db.session.get(Campaign, campaign_id)
    if campaign is None:
        return _err("campaign not found", 404)
    # Only an unlaunched campaign may be edited; once running/completed its
    # configuration is locked so it stays consistent with events already sent.
    if campaign.status not in LAUNCHABLE_STATUSES:
        return _err("only draft or scheduled campaigns can be edited", 409)

    data = request.get_json(silent=True) or {}

    if "name" in data:
        name = (data.get("name") or "").strip()
        if not name:
            return _err("name cannot be empty", 400)
        campaign.name = name
    if "template_id" in data:
        if db.session.get(Template, data["template_id"]) is None:
            return _err("template not found", 404)
        campaign.template_id = data["template_id"]
    if "target_group_id" in data:
        if db.session.get(TargetGroup, data["target_group_id"]) is None:
            return _err("target group not found", 404)
        campaign.target_group_id = data["target_group_id"]
    if "sending_profile_id" in data:
        pid = data.get("sending_profile_id")
        if pid is not None and db.session.get(SendingProfile, pid) is None:
            return _err("sending profile not found", 404)
        campaign.sending_profile_id = pid

    db.session.commit()
    return jsonify({"data": campaign.to_dict()}), 200


@campaigns_bp.post("/campaigns/<int:campaign_id>/launch")
@jwt_required()
def launch(campaign_id):
    campaign = db.session.get(Campaign, campaign_id)
    if campaign is None:
        return _err("campaign not found", 404)
    if campaign.status not in LAUNCHABLE_STATUSES:
        return _err(
            f"campaign cannot be launched from status '{campaign.status.value}'",
            409,
        )
    if not campaign.target_group.targets:
        return _err("target group has no targets to send to", 400)
    if campaign.sending_profile_id is None:
        return _err("assign a sending profile to this campaign before launching", 422)

    result = launch_campaign(campaign)

    # Every send failed — the service left the campaign unlaunched for a retry.
    if result.sent_count == 0:
        return (
            jsonify(
                {
                    "error": "no emails could be sent",
                    "failed": result.failed,
                }
            ),
            502,
        )

    return (
        jsonify(
            {
                "data": {
                    "campaign": campaign.to_dict(),
                    "sent_count": result.sent_count,
                    "total_targets": result.total_targets,
                    "failed": result.failed,
                }
            }
        ),
        200,
    )


@campaigns_bp.post("/campaigns/<int:campaign_id>/schedule")
@jwt_required()
def schedule_campaign(campaign_id):
    """Schedule a draft campaign to auto-launch at a future UTC time.

    The background scheduler (app/scheduler.py) sweeps for due campaigns and
    launches them via the same path as the manual launch endpoint.
    """
    campaign = db.session.get(Campaign, campaign_id)
    if campaign is None:
        return _err("campaign not found", 404)
    if campaign.status is not CampaignStatus.draft:
        return _err(
            f"only draft campaigns can be scheduled (current status: '{campaign.status.value}')",
            409,
        )

    data = request.get_json(silent=True) or {}
    raw = data.get("scheduled_at")
    if not raw:
        return _err("scheduled_at is required", 400)
    try:
        scheduled_at = parse_utc(str(raw))
    except ValueError:
        return _err("scheduled_at must be an ISO-8601 datetime", 400)
    if scheduled_at <= utcnow():
        return _err("scheduled_at must be in the future", 400)

    campaign.status = CampaignStatus.scheduled
    campaign.scheduled_at = scheduled_at
    db.session.commit()
    return jsonify({"data": campaign.to_dict()}), 200


@campaigns_bp.post("/campaigns/<int:campaign_id>/unschedule")
@jwt_required()
def unschedule_campaign(campaign_id):
    """Cancel a schedule, returning a scheduled campaign to draft."""
    campaign = db.session.get(Campaign, campaign_id)
    if campaign is None:
        return _err("campaign not found", 404)
    if campaign.status is not CampaignStatus.scheduled:
        return _err(
            f"only scheduled campaigns can be unscheduled (current status: '{campaign.status.value}')",
            409,
        )
    campaign.status = CampaignStatus.draft
    campaign.scheduled_at = None
    db.session.commit()
    return jsonify({"data": campaign.to_dict()}), 200


@campaigns_bp.post("/campaigns/<int:campaign_id>/complete")
@jwt_required()
def complete_campaign(campaign_id):
    campaign = db.session.get(Campaign, campaign_id)
    if campaign is None:
        return _err("campaign not found", 404)
    if campaign.status is not CampaignStatus.running:
        return _err(
            f"only running campaigns can be completed (current status: '{campaign.status.value}')",
            409,
        )
    campaign.status = CampaignStatus.completed
    campaign.completed_at = utcnow()
    db.session.commit()
    return jsonify({"data": campaign.to_dict()}), 200


@campaigns_bp.delete("/campaigns/<int:campaign_id>")
@jwt_required()
def delete_campaign(campaign_id):
    campaign = db.session.get(Campaign, campaign_id)
    if campaign is None:
        return _err("campaign not found", 404)
    db.session.delete(campaign)  # cascades to its events and tracking tokens
    db.session.commit()
    return jsonify({"data": {"id": campaign_id}}), 200
