"""Campaign management routes.

CRUD over campaigns plus the launch action that drives the email send flow
(delegated to `services.email_service`). All routes require a valid JWT and
follow the `{"data": ...}` / `{"error": ...}` envelope convention.

Business logic for launching (token minting, rendering, sending, event
recording) lives in the service layer, not here, per the project conventions.
"""

from datetime import datetime

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required

from ..extensions import db
from ..models import Campaign, CampaignStatus, Template, TargetGroup
from ..services.email_service import launch_campaign

campaigns_bp = Blueprint("campaigns", __name__)

# Statuses from which a campaign may still be launched. Launching a running or
# completed campaign is refused to prevent a duplicate send to every target.
LAUNCHABLE_STATUSES = {CampaignStatus.draft, CampaignStatus.scheduled}


def _err(message: str, status: int):
    return jsonify({"error": message}), status


def _parse_datetime(value):
    """Parse an ISO-8601 string to a naive UTC datetime.

    Returns (datetime|None, error|None). Accepts a trailing `Z` and drops any
    timezone offset so stored values match the system's naive-UTC convention.
    """
    if value is None or value == "":
        return None, None
    try:
        parsed = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    except ValueError:
        return None, "scheduled_at must be an ISO-8601 datetime"
    if parsed.tzinfo is not None:
        parsed = parsed.astimezone(tz=None).replace(tzinfo=None)
    return parsed, None


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

    scheduled_at, error = _parse_datetime(data.get("scheduled_at"))
    if error:
        return _err(error, 400)

    campaign = Campaign(
        name=name,
        template_id=template_id,
        target_group_id=target_group_id,
        scheduled_at=scheduled_at,
        status=(
            CampaignStatus.scheduled if scheduled_at else CampaignStatus.draft
        ),
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
    if "scheduled_at" in data:
        scheduled_at, error = _parse_datetime(data.get("scheduled_at"))
        if error:
            return _err(error, 400)
        campaign.scheduled_at = scheduled_at
        campaign.status = (
            CampaignStatus.scheduled if scheduled_at else CampaignStatus.draft
        )

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


@campaigns_bp.delete("/campaigns/<int:campaign_id>")
@jwt_required()
def delete_campaign(campaign_id):
    campaign = db.session.get(Campaign, campaign_id)
    if campaign is None:
        return _err("campaign not found", 404)
    db.session.delete(campaign)  # cascades to its events and tracking tokens
    db.session.commit()
    return jsonify({"data": {"id": campaign_id}}), 200
