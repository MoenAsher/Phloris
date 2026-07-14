"""Authentication routes.

Implements register, login, and me using Flask-JWT-Extended for stateless
JWT auth and Werkzeug PBKDF2 password hashing (via the User model).

Responses follow the project envelope convention: `{"data": ...}` on success
and `{"error": "message"}` with an appropriate status on failure.
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import (
    create_access_token,
    jwt_required,
    get_jwt_identity,
)

from ..extensions import db
from ..models import User

auth_bp = Blueprint("auth", __name__)


def _credentials():
    """Extract and normalise email/password from the JSON body."""
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""
    return email, password


@auth_bp.post("/register")
def register():
    """Create an admin account (intended for first-run setup)."""
    email, password = _credentials()
    if not email or not password:
        return jsonify({"error": "email and password are required"}), 400
    if User.query.filter_by(email=email).first() is not None:
        return jsonify({"error": "email already registered"}), 409

    user = User(email=email)
    user.set_password(password)
    db.session.add(user)
    db.session.commit()

    access_token = create_access_token(identity=str(user.id))
    return (
        jsonify({"data": {"user": user.to_dict(), "access_token": access_token}}),
        201,
    )


@auth_bp.post("/login")
def login():
    """Authenticate and return a JWT access token."""
    email, password = _credentials()
    if not email or not password:
        return jsonify({"error": "email and password are required"}), 400

    user = User.query.filter_by(email=email).first()
    if user is None or not user.check_password(password):
        return jsonify({"error": "invalid credentials"}), 401

    access_token = create_access_token(identity=str(user.id))
    return (
        jsonify({"data": {"user": user.to_dict(), "access_token": access_token}}),
        200,
    )


@auth_bp.get("/me")
@jwt_required()
def me():
    """Return the current admin user's info."""
    user = db.session.get(User, int(get_jwt_identity()))
    if user is None:
        return jsonify({"error": "user not found"}), 404
    return jsonify({"data": user.to_dict()}), 200
