"""Target group and target management routes.

Covers target groups, individual targets, and CSV bulk import. All routes
require a valid JWT and follow the `{"data": ...}` / `{"error": ...}`
envelope convention.

An email may appear at most once per target group: single adds return 409 on
a duplicate, and CSV import skips duplicates (existing rows and repeats within
the file). This keeps metric denominators — which count distinct targets —
clean.
"""

import csv
import io

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required

from ..extensions import db
from ..models import TargetGroup, Target

targets_bp = Blueprint("targets", __name__)


def _err(message: str, status: int):
    return jsonify({"error": message}), status


def _normalize_email(value) -> str:
    return (value or "").strip().lower()


def _valid_email(email: str) -> bool:
    return "@" in email and "." in email.split("@")[-1]


def _clean(value):
    """Trim a string field; return None if it ends up empty."""
    if value is None:
        return None
    value = str(value).strip()
    return value or None


# --- Target groups --------------------------------------------------------


@targets_bp.get("/target-groups")
@jwt_required()
def list_target_groups():
    groups = TargetGroup.query.order_by(TargetGroup.id).all()
    return jsonify({"data": [g.to_dict() for g in groups]}), 200


@targets_bp.post("/target-groups")
@jwt_required()
def create_target_group():
    data = request.get_json(silent=True) or {}
    name = (data.get("name") or "").strip()
    if not name:
        return _err("name is required", 400)

    group = TargetGroup(name=name, description=_clean(data.get("description")))
    db.session.add(group)
    db.session.commit()
    return jsonify({"data": group.to_dict()}), 201


@targets_bp.delete("/target-groups/<int:group_id>")
@jwt_required()
def delete_target_group(group_id):
    group = db.session.get(TargetGroup, group_id)
    if group is None:
        return _err("target group not found", 404)
    # Block deletion while campaigns still reference this group.
    if group.campaigns:
        return _err("target group is in use by one or more campaigns", 409)

    db.session.delete(group)  # cascades to its targets
    db.session.commit()
    return jsonify({"data": {"id": group_id}}), 200


# --- Targets within a group ----------------------------------------------


@targets_bp.get("/target-groups/<int:group_id>/targets")
@jwt_required()
def list_targets(group_id):
    group = db.session.get(TargetGroup, group_id)
    if group is None:
        return _err("target group not found", 404)
    targets = (
        Target.query.filter_by(target_group_id=group_id)
        .order_by(Target.id)
        .all()
    )
    return jsonify({"data": [t.to_dict() for t in targets]}), 200


@targets_bp.post("/target-groups/<int:group_id>/targets")
@jwt_required()
def add_target(group_id):
    group = db.session.get(TargetGroup, group_id)
    if group is None:
        return _err("target group not found", 404)

    data = request.get_json(silent=True) or {}
    email = _normalize_email(data.get("email"))
    if not email:
        return _err("email is required", 400)
    if not _valid_email(email):
        return _err("email is not valid", 400)
    if _email_in_group(group_id, email):
        return _err("email already exists in this group", 409)

    target = Target(
        email=email,
        first_name=_clean(data.get("first_name")),
        last_name=_clean(data.get("last_name")),
        group=group,
    )
    db.session.add(target)
    db.session.commit()
    return jsonify({"data": target.to_dict()}), 201


@targets_bp.post("/target-groups/<int:group_id>/targets/import")
@jwt_required()
def import_targets(group_id):
    group = db.session.get(TargetGroup, group_id)
    if group is None:
        return _err("target group not found", 404)

    content = _read_csv_content()
    if not content.strip():
        return _err("no CSV content provided", 400)

    rows = _parse_csv(content)
    if not rows:
        return _err("CSV contained no usable rows (expected email, first_name, last_name)", 400)

    existing = {
        e for (e,) in db.session.query(Target.email).filter_by(target_group_id=group_id)
    }
    created = []
    rejected = []  # per-row rejections with a reason, for the UI to surface
    seen = set()
    for row in rows:
        email = row["email"]
        if not _valid_email(email):
            rejected.append({"email": email, "reason": "invalid email"})
            continue
        if email in existing:
            rejected.append({"email": email, "reason": "already in group"})
            continue
        if email in seen:
            rejected.append({"email": email, "reason": "duplicate in file"})
            continue
        seen.add(email)
        target = Target(
            email=email,
            first_name=row["first_name"],
            last_name=row["last_name"],
            group=group,
        )
        db.session.add(target)
        created.append(target)

    db.session.commit()
    return (
        jsonify(
            {
                "data": {
                    "imported": len(created),
                    # `skipped` retained as the rejected-row count; `rejected`
                    # carries the per-row detail (email + reason).
                    "skipped": len(rejected),
                    "rejected": rejected,
                    "targets": [t.to_dict() for t in created],
                }
            }
        ),
        201,
    )


@targets_bp.delete("/targets/<int:target_id>")
@jwt_required()
def delete_target(target_id):
    target = db.session.get(Target, target_id)
    if target is None:
        return _err("target not found", 404)
    db.session.delete(target)
    db.session.commit()
    return jsonify({"data": {"id": target_id}}), 200


# --- Helpers --------------------------------------------------------------


def _email_in_group(group_id: int, email: str) -> bool:
    return (
        db.session.query(Target.id)
        .filter_by(target_group_id=group_id, email=email)
        .first()
        is not None
    )


def _read_csv_content() -> str:
    """Read CSV content from a file upload, a JSON `csv` field, or the raw body."""
    if "file" in request.files:
        return request.files["file"].read().decode("utf-8", errors="replace")
    if request.is_json:
        body = request.get_json(silent=True) or {}
        if isinstance(body.get("csv"), str):
            return body["csv"]
    return request.get_data(as_text=True) or ""


def _parse_csv(content: str) -> list[dict]:
    """Parse CSV text into normalised target dicts.

    Accepts an optional header row (detected when a cell equals `email`);
    otherwise assumes positional columns: email, first_name, last_name.
    """
    reader = csv.reader(io.StringIO(content))
    rows = [row for row in reader if any((cell or "").strip() for cell in row)]
    if not rows:
        return []

    header = [(cell or "").strip().lower() for cell in rows[0]]
    if "email" in header:
        index = {
            name: header.index(name)
            for name in ("email", "first_name", "last_name")
            if name in header
        }
        data_rows = rows[1:]
    else:
        index = {"email": 0, "first_name": 1, "last_name": 2}
        data_rows = rows

    def cell(row, name):
        i = index.get(name)
        if i is None or i >= len(row):
            return None
        return (row[i] or "").strip() or None

    parsed = []
    for row in data_rows:
        email = _normalize_email(cell(row, "email"))
        if not email:
            continue
        parsed.append(
            {
                "email": email,
                "first_name": cell(row, "first_name"),
                "last_name": cell(row, "last_name"),
            }
        )
    return parsed
