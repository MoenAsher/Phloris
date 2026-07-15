"""Public educational-feedback endpoint tests (UR-09) — public, token-scoped."""

from app.extensions import db
from app.models import (
    Template,
    TargetGroup,
    Target,
    Campaign,
    CampaignStatus,
    TrackingToken,
    Difficulty,
)


def test_feedback_returns_template_content_no_pii(client, app):
    tmpl = Template(
        name="Notes Tmpl",
        subject="s",
        body_html="b",
        difficulty_level=Difficulty.hard,
        feedback_notes="Watch the sender address.",
    )
    grp = TargetGroup(name="g")
    db.session.add_all([tmpl, grp])
    db.session.flush()
    tgt = Target(email="recipient@test.local", first_name="Ada", group=grp)
    db.session.add(tgt)
    db.session.flush()
    camp = Campaign(
        name="Camp X",
        template_id=tmpl.id,
        target_group_id=grp.id,
        status=CampaignStatus.running,
    )
    db.session.add(camp)
    db.session.flush()
    token = TrackingToken.generate_token()
    db.session.add(TrackingToken(token=token, campaign_id=camp.id, target_id=tgt.id))
    db.session.commit()

    resp = client.get(f"/api/feedback/{token}")  # no auth — public
    assert resp.status_code == 200
    data = resp.get_json()["data"]
    assert data["campaign_name"] == "Camp X"
    assert data["template_name"] == "Notes Tmpl"
    assert data["difficulty_level"] == "hard"
    assert data["feedback_notes"] == "Watch the sender address."

    # Ethical: no personal data of the recipient is exposed.
    assert "email" not in data and "first_name" not in data
    assert "recipient@test.local" not in resp.get_data(as_text=True)
    assert "Ada" not in resp.get_data(as_text=True)


def test_feedback_invalid_token_404(client):
    assert client.get("/api/feedback/not-a-real-token").status_code == 404
