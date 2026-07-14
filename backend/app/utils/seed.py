"""Seed data for local development and testing.

Minimal for now: creates the database tables, one admin user, and two
templates (one easy, one medium). Richer seed data (target groups, targets,
and completed campaigns with events) will be added later.

Run from the `backend/` directory:

    ./venv/bin/python -m app.utils.seed

The admin credentials are printed to the console on first creation. Re-running
is safe: existing rows are left untouched.
"""

import secrets

from .. import create_app
from ..extensions import db
from ..models import User, Template, Difficulty

ADMIN_EMAIL = "admin@simulation.local"

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
        'below and confirm you\'re details:</p>'
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


def seed() -> None:
    """Create tables and insert minimal seed data."""
    app = create_app()
    with app.app_context():
        db.create_all()

        _seed_admin()
        _seed_templates()

        db.session.commit()
        print("Seed complete.")


def _seed_admin() -> None:
    existing = User.query.filter_by(email=ADMIN_EMAIL).first()
    if existing:
        print(f"Admin user already exists: {ADMIN_EMAIL} (unchanged).")
        return

    password = secrets.token_urlsafe(12)
    admin = User(email=ADMIN_EMAIL)
    admin.set_password(password)
    db.session.add(admin)
    print("=" * 56)
    print("Created admin user:")
    print(f"  email:    {ADMIN_EMAIL}")
    print(f"  password: {password}")
    print("  (store this now — it will not be shown again)")
    print("=" * 56)


def _seed_templates() -> None:
    for data in (EASY_TEMPLATE, MEDIUM_TEMPLATE):
        if Template.query.filter_by(name=data["name"]).first():
            print(f"Template already exists: {data['name']} (unchanged).")
            continue
        db.session.add(Template(**data))
        print(f"Created template: {data['name']}")


if __name__ == "__main__":
    seed()
