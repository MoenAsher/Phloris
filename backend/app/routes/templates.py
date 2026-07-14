"""Template management routes (UR-02).

CRUD over phishing email templates. All routes require a valid JWT and follow
the `{"data": ...}` / `{"error": ...}` envelope convention.
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required

from ..extensions import db
from ..models import Template, Difficulty

templates_bp = Blueprint("templates", __name__)


def _err(message: str, status: int):
    return jsonify({"error": message}), status


def _parse_difficulty(value, default=Difficulty.medium):
    """Return (Difficulty, None) or (None, error_message)."""
    if value is None or value == "":
        return default, None
    try:
        return Difficulty(str(value).strip().lower()), None
    except ValueError:
        allowed = ", ".join(d.value for d in Difficulty)
        return None, f"difficulty_level must be one of: {allowed}"


@templates_bp.get("/templates")
@jwt_required()
def list_templates():
    templates = Template.query.order_by(Template.id).all()
    return jsonify({"data": [t.to_dict() for t in templates]}), 200


@templates_bp.get("/templates/<int:template_id>")
@jwt_required()
def get_template(template_id):
    template = db.session.get(Template, template_id)
    if template is None:
        return _err("template not found", 404)
    return jsonify({"data": template.to_dict()}), 200


@templates_bp.post("/templates")
@jwt_required()
def create_template():
    data = request.get_json(silent=True) or {}
    name = (data.get("name") or "").strip()
    subject = (data.get("subject") or "").strip()
    body_html = data.get("body_html") or ""
    if not name or not subject or not body_html:
        return _err("name, subject, and body_html are required", 400)

    difficulty, error = _parse_difficulty(data.get("difficulty_level"))
    if error:
        return _err(error, 400)

    template = Template(
        name=name,
        subject=subject,
        body_html=body_html,
        difficulty_level=difficulty,
        feedback_notes=data.get("feedback_notes"),
    )
    db.session.add(template)
    db.session.commit()
    return jsonify({"data": template.to_dict()}), 201


@templates_bp.put("/templates/<int:template_id>")
@jwt_required()
def update_template(template_id):
    template = db.session.get(Template, template_id)
    if template is None:
        return _err("template not found", 404)

    data = request.get_json(silent=True) or {}

    if "name" in data:
        name = (data.get("name") or "").strip()
        if not name:
            return _err("name cannot be empty", 400)
        template.name = name
    if "subject" in data:
        subject = (data.get("subject") or "").strip()
        if not subject:
            return _err("subject cannot be empty", 400)
        template.subject = subject
    if "body_html" in data:
        body_html = data.get("body_html") or ""
        if not body_html:
            return _err("body_html cannot be empty", 400)
        template.body_html = body_html
    if "difficulty_level" in data:
        difficulty, error = _parse_difficulty(data.get("difficulty_level"), default=None)
        if error:
            return _err(error, 400)
        template.difficulty_level = difficulty
    if "feedback_notes" in data:
        template.feedback_notes = data.get("feedback_notes")

    db.session.commit()
    return jsonify({"data": template.to_dict()}), 200


@templates_bp.delete("/templates/<int:template_id>")
@jwt_required()
def delete_template(template_id):
    template = db.session.get(Template, template_id)
    if template is None:
        return _err("template not found", 404)
    # Block deletion while campaigns still reference this template, to avoid
    # leaving campaigns with a dangling template_id.
    if template.campaigns:
        return _err("template is in use by one or more campaigns", 409)

    db.session.delete(template)
    db.session.commit()
    return jsonify({"data": {"id": template_id}}), 200
