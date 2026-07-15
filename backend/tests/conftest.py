"""Shared pytest fixtures for the backend test suite (BACKEND_TEST_PLAN Section 1).

Provides:
  - an isolated, disposable SQLite database (`instance/test.db`) that is dropped
    and recreated for every test, so tests never touch development data;
  - the Flask app in testing mode with email sending suppressed;
  - a bare test client and a JWT-authenticated client;
  - a seeded baseline (one admin, two templates, one group of three targets);
  - the controlled 5-target metrics scenario from Section 9 with exact,
    known-value timestamps.

`.env` is loaded so real configuration (Mailtrap creds, tracking base URL) is
present, but the database URI is overridden here so automated tests are always
isolated regardless of `DATABASE_URL`.
"""

import os
from datetime import timedelta

import pytest
from dotenv import load_dotenv

# Load .env before importing the app config so env-derived settings are present.
load_dotenv(os.path.join(os.path.dirname(__file__), os.pardir, ".env"))

from app import create_app  # noqa: E402
from app.config import Config, BASE_DIR  # noqa: E402
from app.extensions import db  # noqa: E402
from app.models import (  # noqa: E402
    User,
    Template,
    Difficulty,
    TargetGroup,
    Target,
    Campaign,
    CampaignStatus,
    Event,
    EventType,
    TrackingToken,
)

TEST_DB_PATH = os.path.join(BASE_DIR, "instance", "test.db")


class TestingConfig(Config):
    """Isolated configuration for the automated suite.

    A dedicated on-disk SQLite file keeps the suite off the dev database, email
    sending is suppressed (no network, no Mailtrap rate limits), and the launch
    throttle is disabled so multi-target launches are instant.
    """

    TESTING = True
    SQLALCHEMY_DATABASE_URI = "sqlite:///" + TEST_DB_PATH
    MAIL_SUPPRESS_SEND = True
    MAIL_SEND_DELAY = 0.0


# --- App / DB / client fixtures ------------------------------------------


@pytest.fixture
def app():
    """A fresh app with a clean schema for each test; tears the schema down after."""
    os.makedirs(os.path.dirname(TEST_DB_PATH), exist_ok=True)
    application = create_app(TestingConfig)
    with application.app_context():
        db.drop_all()
        db.create_all()
        yield application
        db.session.remove()
        db.drop_all()


@pytest.fixture
def client(app):
    """An unauthenticated Flask test client."""
    return app.test_client()


# --- Seed helpers ---------------------------------------------------------


ADMIN_EMAIL = "admin@test.local"
ADMIN_PASSWORD = "correct-horse-battery"


@pytest.fixture
def admin(app):
    """Create and return the baseline admin user."""
    user = User(email=ADMIN_EMAIL)
    user.set_password(ADMIN_PASSWORD)
    db.session.add(user)
    db.session.commit()
    return user


@pytest.fixture
def auth_headers(client, admin):
    """Log the admin in and return an Authorization header dict with a JWT."""
    resp = client.post(
        "/api/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
    )
    token = resp.get_json()["data"]["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def auth_client(client, auth_headers):
    """A test client wrapper that attaches the JWT header to every request."""

    class _AuthClient:
        def __init__(self, inner, headers):
            self._inner = inner
            self._headers = headers

        def _merge(self, kwargs):
            headers = {**self._headers, **(kwargs.pop("headers", {}) or {})}
            return {**kwargs, "headers": headers}

        def get(self, *a, **k):
            return self._inner.get(*a, **self._merge(k))

        def post(self, *a, **k):
            return self._inner.post(*a, **self._merge(k))

        def put(self, *a, **k):
            return self._inner.put(*a, **self._merge(k))

        def delete(self, *a, **k):
            return self._inner.delete(*a, **self._merge(k))

    return _AuthClient(client, auth_headers)


@pytest.fixture
def baseline(app, admin):
    """Seed the Section 1 baseline and return the created ids.

    One admin (from the `admin` fixture), two templates (easy + hard), one
    target group with three targets.
    """
    easy = Template(
        name="Easy Bait",
        subject="You won!",
        body_html="<p>Hi {{first_name}}, <a href='{{tracking_link}}'>claim</a>. "
        "<a href='{{report_link}}'>report</a></p>",
        difficulty_level=Difficulty.easy,
        feedback_notes="Obvious scam.",
    )
    hard = Template(
        name="Hard Spearphish",
        subject="Q3 budget review",
        body_html="<p>Hi {{first_name}} {{last_name}}, please review "
        "<a href='{{tracking_link}}'>the doc</a>. "
        "<a href='{{report_link}}'>report</a></p>",
        difficulty_level=Difficulty.hard,
        feedback_notes="Context-aware impersonation.",
    )
    group = TargetGroup(name="Finance Dept", description="Baseline group")
    db.session.add_all([easy, hard, group])
    db.session.flush()

    targets = [
        Target(email="ada@test.local", first_name="Ada", last_name="Lovelace", group=group),
        Target(email="alan@test.local", first_name="Alan", last_name="Turing", group=group),
        Target(email="grace@test.local", first_name="Grace", last_name="Hopper", group=group),
    ]
    db.session.add_all(targets)
    db.session.commit()

    return {
        "easy_template_id": easy.id,
        "hard_template_id": hard.id,
        "group_id": group.id,
        "target_ids": [t.id for t in targets],
    }


# --- Controlled 5-target metrics scenario (Section 9) ---------------------


@pytest.fixture
def scenario_5(app):
    """Build the exact controlled scenario from BACKEND_TEST_PLAN Section 9.

    Campaign with 5 targets, all sent at T0. Events use explicit offsets so the
    expected metrics are exact:

      A: clicked @ +10s
      B: clicked @ +20s, clicked again @ +40s   (double-click -> counts once)
      C: clicked @ +30s, reported @ +50s
      D: reported @ +70s (no click)
      E: no action

    Expected:
      click rate   = |{A,B,C}| / 5 = 0.60
      report rate  = |{C,D}|   / 5 = 0.40
      avg TTC      = mean(10, 20, 30) = 20.0s   (B's earliest click, not 40)
      avg TTR      = mean(50, 70)     = 60.0s
      outcomes     = A,B clicked; C clicked+reported; D reported; E no-action

    Returns a dict of ids and per-target tokens for downstream tests.
    """
    from app.utils.time import utcnow

    template = Template(
        name="Scenario",
        subject="s",
        body_html="<p>{{tracking_link}} {{report_link}}</p>",
        difficulty_level=Difficulty.medium,
    )
    group = TargetGroup(name="Scenario Group")
    db.session.add_all([template, group])
    db.session.flush()

    labels = ["A", "B", "C", "D", "E"]
    targets = {}
    for label in labels:
        t = Target(
            email=f"{label.lower()}@test.local",
            first_name=f"Person{label}",
            last_name=label,
            group=group,
        )
        db.session.add(t)
        targets[label] = t
    db.session.flush()

    campaign = Campaign(
        name="Scenario Campaign",
        template_id=template.id,
        target_group_id=group.id,
        status=CampaignStatus.running,
        launched_at=utcnow(),
    )
    db.session.add(campaign)
    db.session.flush()

    # A fixed baseline T0; all offsets are deterministic relative to it.
    t0 = utcnow().replace(microsecond=0)

    def add_event(target, etype, offset_s):
        db.session.add(
            Event(
                campaign_id=campaign.id,
                target_id=targets[target].id,
                event_type=etype,
                timestamp=t0 + timedelta(seconds=offset_s),
            )
        )

    # All five sent at T0.
    for label in labels:
        add_event(label, EventType.sent, 0)

    add_event("A", EventType.clicked, 10)
    add_event("B", EventType.clicked, 20)
    add_event("B", EventType.clicked, 40)   # double-click
    add_event("C", EventType.clicked, 30)
    add_event("C", EventType.reported, 50)
    add_event("D", EventType.reported, 70)
    # E: nothing.

    # One opaque token per target (needed by performance/dashboard tests).
    tokens = {}
    for label in labels:
        tok = TrackingToken.generate_token()
        db.session.add(
            TrackingToken(
                token=tok, campaign_id=campaign.id, target_id=targets[label].id
            )
        )
        tokens[label] = tok

    db.session.commit()

    return {
        "campaign_id": campaign.id,
        "group_id": group.id,
        "template_id": template.id,
        "target_ids": {k: v.id for k, v in targets.items()},
        "tokens": tokens,
    }
