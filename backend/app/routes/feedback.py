"""Public educational-feedback route (UR-09) — PUBLIC, token-scoped.

Backs the recipient-facing feedback page shown after a tracking-link click.
Given the opaque token, it returns only the *educational* content for that
campaign's template (name, difficulty, feedback notes) — never any personal
data and never another recipient's information. No auth (recipients have no
login).
"""

from flask import Blueprint, jsonify

from ..extensions import db
from ..models import Campaign, Template, TrackingToken

feedback_bp = Blueprint("feedback", __name__)


@feedback_bp.get("/feedback/<token>")
def feedback(token):
    """Return the template's educational feedback for the token's campaign."""
    tracking = TrackingToken.query.filter_by(token=token).first()
    if tracking is None:
        # Generic 404 — do not reveal whether a token ever existed.
        return jsonify({"error": "not found"}), 404

    campaign = db.session.get(Campaign, tracking.campaign_id)
    template = (
        db.session.get(Template, campaign.template_id) if campaign else None
    )

    return (
        jsonify(
            {
                "data": {
                    "campaign_name": campaign.name if campaign else None,
                    "template_name": template.name if template else None,
                    "difficulty_level": (
                        template.difficulty_level.value if template else None
                    ),
                    "feedback_notes": template.feedback_notes if template else None,
                }
            }
        ),
        200,
    )
