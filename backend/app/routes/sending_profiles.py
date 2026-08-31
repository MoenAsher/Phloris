"""Sending profile management routes.

Reusable SMTP configurations that campaigns can reference instead of the
global Flask-Mail config. All routes are JWT-protected.

GET    /api/sending-profiles
GET    /api/sending-profiles/<id>
POST   /api/sending-profiles
PUT    /api/sending-profiles/<id>
DELETE /api/sending-profiles/<id>
GET    /api/sending-profiles/<id>/test
"""

import smtplib
import ssl
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

import certifi

from cryptography.fernet import InvalidToken
from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from ..extensions import db
from ..models import SendingProfile, User

sending_profiles_bp = Blueprint("sending_profiles", __name__)


def _err(message: str, status: int):
    return jsonify({"error": message}), status


# --------------------------------------------------------------------------
# CRUD
# --------------------------------------------------------------------------


@sending_profiles_bp.get("/sending-profiles")
@jwt_required()
def list_sending_profiles():
    profiles = SendingProfile.query.order_by(SendingProfile.id).all()
    return jsonify({"data": [p.to_dict() for p in profiles]}), 200


@sending_profiles_bp.get("/sending-profiles/<int:profile_id>")
@jwt_required()
def get_sending_profile(profile_id):
    profile = db.session.get(SendingProfile, profile_id)
    if profile is None:
        return _err("sending profile not found", 404)
    return jsonify({"data": profile.to_dict()}), 200


@sending_profiles_bp.post("/sending-profiles")
@jwt_required()
def create_sending_profile():
    data = request.get_json(silent=True) or {}

    name = (data.get("name") or "").strip()
    smtp_host = (data.get("smtp_host") or "").strip()
    from_address = (data.get("from_address") or "").strip()

    if not name:
        return _err("name is required", 400)
    if not smtp_host:
        return _err("smtp_host is required", 400)
    if not from_address:
        return _err("from_address is required", 400)

    smtp_port = data.get("smtp_port", 587)
    try:
        smtp_port = int(smtp_port)
        if smtp_port < 1 or smtp_port > 65535:
            raise ValueError
    except (TypeError, ValueError):
        return _err("smtp_port must be an integer between 1 and 65535", 400)

    if SendingProfile.query.filter_by(name=name).first():
        return _err("a sending profile with that name already exists", 409)

    profile = SendingProfile(
        name=name,
        smtp_host=smtp_host,
        smtp_port=smtp_port,
        smtp_username=(data.get("smtp_username") or "").strip() or None,
        from_address=from_address,
        use_tls=bool(data.get("use_tls", True)),
    )
    profile.set_smtp_password(data.get("smtp_password"))

    db.session.add(profile)
    db.session.commit()
    return jsonify({"data": profile.to_dict()}), 201


@sending_profiles_bp.put("/sending-profiles/<int:profile_id>")
@jwt_required()
def update_sending_profile(profile_id):
    profile = db.session.get(SendingProfile, profile_id)
    if profile is None:
        return _err("sending profile not found", 404)

    data = request.get_json(silent=True) or {}

    if "name" in data:
        name = (data.get("name") or "").strip()
        if not name:
            return _err("name cannot be empty", 400)
        conflict = SendingProfile.query.filter_by(name=name).first()
        if conflict and conflict.id != profile_id:
            return _err("a sending profile with that name already exists", 409)
        profile.name = name

    if "smtp_host" in data:
        host = (data.get("smtp_host") or "").strip()
        if not host:
            return _err("smtp_host cannot be empty", 400)
        profile.smtp_host = host

    if "smtp_port" in data:
        try:
            port = int(data["smtp_port"])
            if port < 1 or port > 65535:
                raise ValueError
            profile.smtp_port = port
        except (TypeError, ValueError):
            return _err("smtp_port must be an integer between 1 and 65535", 400)

    if "smtp_username" in data:
        profile.smtp_username = (data.get("smtp_username") or "").strip() or None

    if "smtp_password" in data:
        profile.set_smtp_password(data.get("smtp_password"))

    if "from_address" in data:
        addr = (data.get("from_address") or "").strip()
        if not addr:
            return _err("from_address cannot be empty", 400)
        profile.from_address = addr

    if "use_tls" in data:
        profile.use_tls = bool(data["use_tls"])

    db.session.commit()
    return jsonify({"data": profile.to_dict()}), 200


@sending_profiles_bp.delete("/sending-profiles/<int:profile_id>")
@jwt_required()
def delete_sending_profile(profile_id):
    profile = db.session.get(SendingProfile, profile_id)
    if profile is None:
        return _err("sending profile not found", 404)

    if profile.campaigns:
        return _err(
            "sending profile is in use by one or more campaigns and cannot be deleted",
            409,
        )

    db.session.delete(profile)
    db.session.commit()
    return jsonify({"data": {"id": profile_id}}), 200


# --------------------------------------------------------------------------
# Test endpoint
# --------------------------------------------------------------------------


@sending_profiles_bp.get("/sending-profiles/<int:profile_id>/test")
@jwt_required()
def test_sending_profile(profile_id):
    """Send a test email via the profile's SMTP config and report success or failure.

    Uses smtplib directly (not Flask-Mail) to avoid mutating the global mail
    extension config mid-request. Sends to the currently authenticated admin's
    email address.
    """
    profile = db.session.get(SendingProfile, profile_id)
    if profile is None:
        return _err("sending profile not found", 404)

    user_id = int(get_jwt_identity())
    user = db.session.get(User, user_id)
    if user is None:
        return _err("current user not found", 404)

    try:
        password = profile.get_smtp_password()
    except (RuntimeError, InvalidToken) as exc:
        return _err(f"could not decrypt SMTP password: {exc}", 500)

    msg = MIMEMultipart("alternative")
    msg["Subject"] = "Sending Profile Test"
    msg["From"] = profile.from_address
    msg["To"] = user.email
    msg.attach(
        MIMEText(
            "This is a test email from your phishing simulation platform. "
            "Your sending profile is configured correctly.",
            "plain",
        )
    )

    try:
        _smtp_send(
            host=profile.smtp_host,
            port=profile.smtp_port,
            use_tls=profile.use_tls,
            username=profile.smtp_username,
            password=password,
            from_addr=profile.from_address,
            to_addr=user.email,
            message=msg.as_string(),
        )
    except smtplib.SMTPAuthenticationError:
        return _err(
            "SMTP authentication failed — check the username and password", 502
        )
    except smtplib.SMTPConnectError as exc:
        return _err(
            f"could not connect to {profile.smtp_host}:{profile.smtp_port} — {exc}", 502
        )
    except smtplib.SMTPException as exc:
        return _err(f"SMTP error: {exc}", 502)
    except OSError as exc:
        return _err(f"network error: {exc}", 502)

    return jsonify({"data": {"sent_to": user.email}}), 200


def _smtp_send(
    *,
    host: str,
    port: int,
    use_tls: bool,
    username: str | None,
    password: str | None,
    from_addr: str,
    to_addr: str,
    message: str,
) -> None:
    """Open a fresh SMTP connection, optionally authenticate, send, and close.

    TLS dispatch:
      - use_tls=True, port 465  → SMTP_SSL (implicit TLS from handshake)
      - use_tls=True, other port → SMTP + STARTTLS (explicit upgrade after EHLO)
      - use_tls=False            → plaintext (internal relays only)
    """
    if use_tls and port == 465:
        context = ssl.create_default_context(cafile=certifi.where())
        server = smtplib.SMTP_SSL(host, port, context=context, timeout=15)
    else:
        server = smtplib.SMTP(host, port, timeout=15)
        if use_tls:
            server.starttls(context=ssl.create_default_context(cafile=certifi.where()))

    try:
        if username and password:
            server.login(username, password)
        server.sendmail(from_addr, [to_addr], message)
    finally:
        server.quit()
