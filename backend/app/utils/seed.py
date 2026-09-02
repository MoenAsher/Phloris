"""Seed data for local development and testing.

Creates the database tables and inserts representative data so the dashboard
renders non-trivial metrics on first run: 3 templates (easy/medium/hard),
2 target groups with 12 and 11 targets respectively, and 3 completed campaigns
with staggered sent/clicked/reported events covering all four core metrics.

Run from the `backend/` directory:

    flask seed-db                  # preferred (Flask CLI)
    python -m app.utils.seed       # fallback direct invocation

Re-running is safe:
  - Admin user and templates: skipped if a row with the same name/email exists.
  - Groups, targets, campaigns, events: skipped if the "Engineering Department"
    sentinel group already exists (single check covers the whole block).
"""

import secrets
from datetime import datetime, timedelta, timezone

from .. import create_app
from ..extensions import db
from ..models import (
    Campaign,
    CampaignStatus,
    Difficulty,
    Event,
    EventType,
    Target,
    TargetGroup,
    Template,
    TrackingToken,
    User,
)

ADMIN_EMAIL = "admin@phloris.com"

# ---------------------------------------------------------------------------
# Template definitions
# ---------------------------------------------------------------------------

EASY_TEMPLATE = {
    "name": "Lottery Winner (Easy)",
    "subject": "CONGRATULATION!! You Have Won $1,000,000 USD",
    "difficulty_level": Difficulty.easy,
    "body_html": (
        "<p>Dear Winner,</p>"
        "<p>We are pleace to inform you that you're email adress has been "
        "selected in our anual international lottery draw. You have WON the "
        "sum of <b>$1,000,000 USD</b>!!!</p>"
        "<p>To claim you're prize immediatly, please click the secure link "
        "below and confirm you're details:</p>"
        '<p><a href="{{tracking_link}}">http://claim-your-prize-now.example/verify</a></p>'
        "<p>Hurry, this offer expire soon.</p>"
        "<p>Regards,<br>The Lottery Team</p>"
        '<hr><p style="font-size:12px">Think this is suspicious? '
        '<a href="{{report_link}}">Report it</a>.</p>'
    ),
    "feedback_notes": (
        "Red flags: generic greeting ('Dear Winner'), spelling and grammar "
        "mistakes, a prize you never entered to win, urgency ('expire soon'), "
        "and a link whose visible address does not match a legitimate domain. "
        "Legitimate organisations never ask you to 'confirm details' to claim "
        "an unexpected prize."
    ),
}

MEDIUM_TEMPLATE = {
    "name": "IT Password Expiry (Medium)",
    "subject": "Action required: your password expires in 24 hours",
    "difficulty_level": Difficulty.medium,
    "body_html": (
        "<div style='font-family:Segoe UI,Arial,sans-serif;color:#222'>"
        "<p>Hi {{first_name}},</p>"
        "<p>Our records show that your network password is due to expire in "
        "<b>24 hours</b>. To avoid being locked out of your email and shared "
        "drives, please revalidate your account using the link below.</p>"
        '<p style="margin:24px 0">'
        '<a href="{{tracking_link}}" '
        'style="background:#0067b8;color:#fff;padding:10px 18px;'
        'text-decoration:none;border-radius:4px">Keep my current password</a>'
        "</p>"
        "<p>If no action is taken, access will be suspended automatically.</p>"
        "<p>Thank you,<br>IT Service Desk</p>"
        '<hr><p style="font-size:12px;color:#666">Not expecting this email? '
        '<a href="{{report_link}}">Report to security</a>.</p>'
        "</div>"
    ),
    "feedback_notes": (
        "Red flags: time-pressure ('expires in 24 hours', 'suspended "
        "automatically'), a call-to-action button that hides the real "
        "destination URL, and a request to 'revalidate' credentials. When in "
        "doubt, navigate to the password portal yourself rather than clicking "
        "a link in an email, and verify with the IT Service Desk directly."
    ),
}

HARD_TEMPLATE = {
    "name": "Document Signature Request (Hard)",
    "subject": "Please review and sign: Q3 Partnership Agreement",
    "difficulty_level": Difficulty.hard,
    "body_html": (
        "<div style='font-family:Segoe UI,Arial,sans-serif;color:#222'>"
        "<p>Hi {{first_name}},</p>"
        "<p>Following our discussion last week, legal has finalised the Q3 "
        "partnership agreement and it's ready for your signature. The document "
        "needs to be signed by all stakeholders before the board meeting on "
        "Thursday.</p>"
        "<p>Please use the secure signing portal below — it should only take "
        "a couple of minutes:</p>"
        '<p style="margin:24px 0">'
        '<a href="{{tracking_link}}" style="background:#1a56db;color:#fff;'
        'padding:10px 20px;text-decoration:none;border-radius:4px">'
        "Review &amp; Sign Document</a></p>"
        "<p>Let me know if you have any questions.</p>"
        "<p>Best,<br>Sarah Mitchell<br>Head of Legal &amp; Compliance</p>"
        '<hr><p style="font-size:12px;color:#666">Received this by mistake? '
        '<a href="{{report_link}}">Click here to flag it.</a></p>'
        "</div>"
    ),
    "feedback_notes": (
        "This email is difficult to spot because it uses a plausible sender "
        "name and role, references a realistic business context, addresses you "
        "by name, and applies no overt time-pressure. Red flags to look for: "
        "did you expect this request? Does the sender's email domain match your "
        "organisation's? Hover over the button before clicking to inspect the "
        "real destination URL. When in doubt, contact the sender through a "
        "known channel — not by replying to the email."
    ),
}

# ---------------------------------------------------------------------------
# Target data
# ---------------------------------------------------------------------------

ENG_TARGETS = [
    ("Alice", "Johnson", "alice.johnson@example.com"),
    ("Bob", "Smith", "bob.smith@example.com"),
    ("Carol", "White", "carol.white@example.com"),
    ("David", "Lee", "david.lee@example.com"),
    ("Emma", "Chen", "emma.chen@example.com"),
    ("Frank", "Miller", "frank.miller@example.com"),
    ("Grace", "Kim", "grace.kim@example.com"),
    ("Henry", "Clark", "henry.clark@example.com"),
    ("Iris", "Taylor", "iris.taylor@example.com"),
    ("James", "Brown", "james.brown@example.com"),
    ("Kate", "Wilson", "kate.wilson@example.com"),
    ("Liam", "Davis", "liam.davis@example.com"),
]

FIN_TARGETS = [
    ("Margaret", "Hall", "margaret.hall@simulation.local"),
    ("Nathan", "Wright", "nathan.wright@simulation.local"),
    ("Olivia", "Scott", "olivia.scott@simulation.local"),
    ("Peter", "Adams", "peter.adams@simulation.local"),
    ("Quinn", "Baker", "quinn.baker@simulation.local"),
    ("Rachel", "Green", "rachel.green@simulation.local"),
    ("Samuel", "Price", "samuel.price@simulation.local"),
    ("Tanya", "Hughes", "tanya.hughes@simulation.local"),
    ("Ulric", "Foster", "ulric.foster@simulation.local"),
    ("Vera", "Hunt", "vera.hunt@simulation.local"),
    ("Warren", "Cox", "warren.cox@simulation.local"),
]

# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------


def seed() -> None:
    """Create tables and insert seed data."""
    app = create_app()
    with app.app_context():
        db.create_all()

        _seed_admin()
        _seed_templates()
        _seed_groups_and_campaigns()

        db.session.commit()
        print("Seed complete.")


# ---------------------------------------------------------------------------
# Seed helpers
# ---------------------------------------------------------------------------


def _ago(days: int = 0, hours: int = 0, minutes: int = 0) -> datetime:
    """Return a naive UTC datetime offset backwards from now."""
    return datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(
        days=days, hours=hours, minutes=minutes
    )


def _seed_admin() -> None:
    existing = User.query.filter_by(email=ADMIN_EMAIL).first()
    if existing:
        print(f"Admin user already exists: {ADMIN_EMAIL} (unchanged).")
        return

    password = "Phloris123"
    admin = User(email=ADMIN_EMAIL)
    admin.set_password(password)
    db.session.add(admin)
    print(f"Created admin user: {ADMIN_EMAIL} / {password}")


def _seed_templates() -> None:
    for data in (EASY_TEMPLATE, MEDIUM_TEMPLATE, HARD_TEMPLATE):
        if Template.query.filter_by(name=data["name"]).first():
            print(f"Template already exists: {data['name']} (unchanged).")
            continue
        db.session.add(Template(**data))
        print(f"Created template: {data['name']}")


def _seed_groups_and_campaigns() -> None:
    if TargetGroup.query.filter_by(name="Engineering Department").first():
        print("Seed groups already exist (unchanged).")
        return

    eng_group = _make_group(
        "Engineering Department",
        "Software engineering and infrastructure team.",
        ENG_TARGETS,
    )
    fin_group = _make_group(
        "Finance & Operations",
        "Finance, accounting, and operations team.",
        FIN_TARGETS,
    )
    # Flush so groups and targets get IDs before campaigns reference them.
    db.session.flush()

    easy_tmpl = Template.query.filter_by(name=EASY_TEMPLATE["name"]).first()
    medium_tmpl = Template.query.filter_by(name=MEDIUM_TEMPLATE["name"]).first()
    hard_tmpl = Template.query.filter_by(name=HARD_TEMPLATE["name"]).first()

    # Campaign 1: easy template, engineering group
    # click rate 4/12 ≈ 33%,  report rate 3/12 = 25%
    # avg time-to-click (8+15+32+91)/4 = 36.5 min
    # avg time-to-report (25+45+110)/3 = 60 min
    _make_campaign(
        name="Lottery Scam Awareness — Engineering",
        template=easy_tmpl,
        group=eng_group,
        launched_days_ago=30,
        completed_days_ago=25,
        event_pattern=[
            (0, 8, None),
            (1, 15, 25),
            (2, 32, None),
            (3, None, 45),
            (4, 67, None),
            (5, 91, 110),
        ],
    )

    # Campaign 2: medium template, finance group
    # click rate 5/11 ≈ 45%,  report rate 2/11 ≈ 18%
    # avg time-to-click (12+27+55+78+140)/5 = 62.4 min
    # avg time-to-report (80+35)/2 = 57.5 min
    _make_campaign(
        name="Password Expiry Alert — Finance",
        template=medium_tmpl,
        group=fin_group,
        launched_days_ago=20,
        completed_days_ago=15,
        event_pattern=[
            (0, 12, None),
            (1, 27, None),
            (2, 55, 80),
            (3, 78, None),
            (4, 140, None),
            (5, None, 35),
        ],
    )

    # Campaign 3: hard template, engineering group
    # click rate 9/12 = 75%,  report rate 1/12 ≈ 8%
    # avg time-to-click (4+6+9+11+14+18+22+31+47)/9 ≈ 18 min
    # avg time-to-report 60 min
    _make_campaign(
        name="Document Signature Request — Engineering",
        template=hard_tmpl,
        group=eng_group,
        launched_days_ago=10,
        completed_days_ago=7,
        event_pattern=[
            (0, 4, None),
            (1, 6, None),
            (2, 9, None),
            (3, 11, None),
            (4, 14, 60),
            (5, 18, None),
            (6, 22, None),
            (7, 31, None),
            (8, 47, None),
        ],
    )


def _make_group(name: str, description: str, members: list) -> TargetGroup:
    group = TargetGroup(name=name, description=description)
    db.session.add(group)
    db.session.flush()
    for first, last, email in members:
        db.session.add(
            Target(
                first_name=first,
                last_name=last,
                email=email,
                target_group_id=group.id,
            )
        )
    print(f"Created group '{name}' with {len(members)} targets.")
    return group


def _make_campaign(
    name: str,
    template: Template,
    group: TargetGroup,
    launched_days_ago: int,
    completed_days_ago: int,
    event_pattern: list,
) -> None:
    """Create a completed campaign with TrackingToken and Event rows.

    event_pattern is a list of (target_index, click_minutes_after_sent | None,
    report_minutes_after_sent | None). Every target in the group receives a
    'sent' event; click/report events are added only for entries in the pattern.
    """
    launched_at = _ago(days=launched_days_ago)
    completed_at = _ago(days=completed_days_ago)

    campaign = Campaign(
        name=name,
        template_id=template.id,
        target_group_id=group.id,
        status=CampaignStatus.completed,
        launched_at=launched_at,
        completed_at=completed_at,
    )
    db.session.add(campaign)
    db.session.flush()

    pattern_by_index = {
        idx: (click_min, report_min) for idx, click_min, report_min in event_pattern
    }

    for position, target in enumerate(group.targets):
        db.session.add(
            TrackingToken(
                token=TrackingToken.generate_token(),
                campaign_id=campaign.id,
                target_id=target.id,
            )
        )

        # Every target receives a 'sent' event at the moment of launch.
        db.session.add(
            Event(
                campaign_id=campaign.id,
                target_id=target.id,
                event_type=EventType.sent,
                timestamp=launched_at,
            )
        )

        click_min, report_min = pattern_by_index.get(position, (None, None))

        if click_min is not None:
            db.session.add(
                Event(
                    campaign_id=campaign.id,
                    target_id=target.id,
                    event_type=EventType.clicked,
                    timestamp=launched_at + timedelta(minutes=click_min),
                )
            )

        if report_min is not None:
            db.session.add(
                Event(
                    campaign_id=campaign.id,
                    target_id=target.id,
                    event_type=EventType.reported,
                    timestamp=launched_at + timedelta(minutes=report_min),
                )
            )

    print(f"Created campaign '{name}' with {len(group.targets)} targets.")


if __name__ == "__main__":
    seed()
