"""Section 2 — Authentication Tests (CRITICAL)."""

from datetime import timedelta

from flask_jwt_extended import create_access_token

from app.extensions import db
from app.models import User

ADMIN_EMAIL = "admin@test.local"


def test_2_1_register_valid(client):
    """2.1 Register with valid email+password -> 201; persisted; password hashed."""
    resp = client.post(
        "/api/auth/register",
        json={"email": "new@test.local", "password": "pw12345678"},
    )
    assert resp.status_code == 201
    assert "access_token" in resp.get_json()["data"]

    db.session.rollback()  # see the row committed by the request's session
    user = User.query.filter_by(email="new@test.local").first()
    assert user is not None
    assert user.password_hash != "pw12345678"  # never plaintext
    assert user.check_password("pw12345678")


def test_2_2_register_duplicate(client, admin):
    """2.2 Duplicate email -> 4xx; no duplicate created."""
    resp = client.post(
        "/api/auth/register",
        json={"email": ADMIN_EMAIL, "password": "whatever12"},
    )
    assert 400 <= resp.status_code < 500
    db.session.rollback()
    assert User.query.filter_by(email=ADMIN_EMAIL).count() == 1


def test_2_3_register_missing_fields(client):
    """2.3 Missing email or password -> 400; no user created."""
    r1 = client.post("/api/auth/register", json={"email": "x@test.local"})
    r2 = client.post("/api/auth/register", json={"password": "pw12345678"})
    assert r1.status_code == 400
    assert r2.status_code == 400
    db.session.rollback()
    assert User.query.count() == 0


def test_2_4_login_correct(client, admin):
    """2.4 Correct credentials -> 200; returns a usable JWT."""
    resp = client.post(
        "/api/auth/login",
        json={"email": ADMIN_EMAIL, "password": "correct-horse-battery"},
    )
    assert resp.status_code == 200
    token = resp.get_json()["data"]["access_token"]
    assert token
    # Token actually authenticates a protected route.
    me = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me.status_code == 200


def test_2_5_login_wrong_password(client, admin):
    """2.5 Wrong password -> 401; no token."""
    resp = client.post(
        "/api/auth/login",
        json={"email": ADMIN_EMAIL, "password": "wrong-password"},
    )
    assert resp.status_code == 401
    assert "access_token" not in (resp.get_json().get("data") or {})


def test_2_6_login_unknown_email(client):
    """2.6 Non-existent email -> 401; no token."""
    resp = client.post(
        "/api/auth/login",
        json={"email": "ghost@test.local", "password": "whatever12"},
    )
    assert resp.status_code == 401


def test_2_7_me_valid_never_returns_hash(auth_client):
    """2.7 /me with valid JWT -> 200; user info; never the password hash."""
    resp = auth_client.get("/api/auth/me")
    assert resp.status_code == 200
    data = resp.get_json()["data"]
    assert data["email"] == ADMIN_EMAIL
    assert "password_hash" not in data
    assert "password" not in data


def test_2_8_me_no_token(client):
    """2.8 /me with no token -> 401."""
    assert client.get("/api/auth/me").status_code == 401


def test_2_9_me_malformed_and_expired(client):
    """2.9 Malformed or expired token -> 401."""
    malformed = client.get(
        "/api/auth/me", headers={"Authorization": "Bearer not.a.real.jwt"}
    )
    assert malformed.status_code == 401

    expired = create_access_token(identity="1", expires_delta=timedelta(seconds=-1))
    resp = client.get("/api/auth/me", headers={"Authorization": f"Bearer {expired}"})
    assert resp.status_code == 401
