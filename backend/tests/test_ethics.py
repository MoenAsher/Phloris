"""Section 12 — Ethical Safeguard Audit (CRITICAL) — UR-08.

Confirms the framework's core ethical commitments hold in code: no credential
capture, only event type + timestamp stored, no IP / user-agent / fingerprint
collection, opaque tokens, and Mailtrap-only delivery.

Source scans target concrete *code* identifiers (e.g. `remote_addr`) rather than
prose, so the docstrings that promise we do NOT collect this data don't produce
false positives.
"""

import os
import re

import app as app_pkg
from app.config import Config
from app.extensions import db
from app.models import Event, TrackingToken

APP_DIR = os.path.dirname(app_pkg.__file__)

# Code-level identifiers that would indicate collecting request metadata.
FORBIDDEN_CODE_TOKENS = [
    "remote_addr",
    "request.headers",
    "user_agent",
    "x-forwarded-for",
    "x-real-ip",
    "request.environ",
]


def _read_sources(*subdirs):
    texts = {}
    for sub in subdirs:
        directory = os.path.join(APP_DIR, sub)
        for root, _, files in os.walk(directory):
            for fname in files:
                if fname.endswith(".py"):
                    path = os.path.join(root, fname)
                    with open(path, "r", encoding="utf-8") as fh:
                        texts[os.path.relpath(path, APP_DIR)] = fh.read()
    return texts


def test_12_1_no_credential_capture(app):
    """12.1 No credential-capture endpoint or password store outside users."""
    # No public route handles passwords.
    routes = _read_sources("routes")
    assert "password" not in routes["routes/tracking.py"].lower()
    assert "password" not in routes["routes/performance.py"].lower()

    # No route path suggests credential harvesting.
    for rule in app.url_map.iter_rules():
        lowered = str(rule).lower()
        for bad in ("credential", "harvest", "passwords"):
            assert bad not in lowered

    # The only table with a password column is `users` (hashed admin creds).
    for table in db.metadata.tables.values():
        for column in table.columns:
            if "password" in column.name.lower():
                assert table.name == "users"


def test_12_2_event_stores_only_type_timestamp_linkage():
    """12.2 Every stored Event carries only type, timestamp, and linkage."""
    columns = {c.name for c in Event.__table__.columns}
    assert columns == {
        "id", "campaign_id", "target_id", "event_type", "timestamp", "created_at",
    }


def test_12_3_and_12_4_no_ip_or_useragent_capture():
    """12.3/12.4 No handler reads or persists IP or user-agent/fingerprint."""
    # No model column captures such data.
    for table in db.metadata.tables.values():
        for column in table.columns:
            name = column.name.lower()
            assert not any(
                bad in name
                for bad in ("ip_address", "user_agent", "fingerprint", "useragent")
            )
            assert name != "ip"

    # No request handler / service reads request metadata.
    sources = _read_sources("routes", "services")
    for rel_path, text in sources.items():
        lowered = text.lower()
        for token in FORBIDDEN_CODE_TOKENS:
            assert token not in lowered, f"{token!r} found in {rel_path}"


def test_12_5_tokens_opaque_and_random():
    """12.5 Tokens are random/opaque and reveal nothing about the recipient."""
    generated = {TrackingToken.generate_token() for _ in range(50)}
    assert len(generated) == 50  # all unique -> random, not derived
    for token in generated:
        assert re.match(r"^[A-Za-z0-9_-]+$", token)
        assert len(token) >= 20


def test_12_6_delivery_only_via_mailtrap_sandbox():
    """12.6 Current config routes all email through the Mailtrap sandbox only."""
    assert "mailtrap.io" in Config.MAIL_SERVER

    # Email is sent exclusively through Flask-Mail; no raw SMTP path exists.
    services = _read_sources("services")
    for text in services.values():
        assert "smtplib" not in text
    assert "mail.send" in services["services/email_service.py"]
