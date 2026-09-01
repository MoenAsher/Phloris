"""Global admin search endpoint.

GET /api/search?q=<query>  (JWT-protected)

Returns campaigns matching by name and targets matching by email, first name,
or last name using case-insensitive substring (ILIKE / SQLite LIKE) matching.
Results are capped at 8 per group to keep payloads small.

A minimum query length of 2 characters is enforced to avoid returning the
entire database on an accidental single-keystroke fire.
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required

from ..extensions import db
from ..models import Campaign, Target, Template, SendingProfile

search_bp = Blueprint("search", __name__)


@search_bp.get("/search")
@jwt_required()
def search():
    q = (request.args.get("q") or "").strip()
    if len(q) < 2:
        return jsonify({"data": {"campaigns": [], "targets": []}}), 200

    pattern = f"%{q}%"

    matching_campaigns = (
        Campaign.query.filter(Campaign.name.ilike(pattern))
        .order_by(Campaign.id.desc())
        .limit(8)
        .all()
    )

    matching_targets = (
        Target.query.filter(
            db.or_(
                Target.email.ilike(pattern),
                Target.first_name.ilike(pattern),
                Target.last_name.ilike(pattern),
            )
        )
        .order_by(Target.id)
        .limit(8)
        .all()
    )

    matching_templates = (
        Template.query.filter(Template.name.ilike(pattern))
        .order_by(Template.id)
        .limit(8)
        .all()
    )

    matching_profiles = (
        SendingProfile.query.filter(SendingProfile.name.ilike(pattern))
        .order_by(SendingProfile.id)
        .limit(8)
        .all()
    )

    return jsonify({
        "data": {
            "campaigns": [
                {"id": c.id, "name": c.name, "status": c.status.value}
                for c in matching_campaigns
            ],
            "targets": [
                {
                    "id": t.id,
                    "email": t.email,
                    "first_name": t.first_name,
                    "last_name": t.last_name,
                }
                for t in matching_targets
            ],
            "templates": [
                {"id": t.id, "name": t.name, "difficulty_level": t.difficulty_level.value}
                for t in matching_templates
            ],
            "sending_profiles": [
                {"id": p.id, "name": p.name, "from_address": p.from_address}
                for p in matching_profiles
            ],
        }
    }), 200
