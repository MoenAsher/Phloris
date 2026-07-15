"""Section 7 — Email Sending Pipeline Tests (CRITICAL) — UR-03.

Automated coverage captures the outbox via Flask-Mail's `record_messages`
(sending is suppressed in the test config, so nothing leaves the process). A
separate manual end-to-end run against the real Mailtrap inbox is performed and
recorded outside this suite.
"""

import re

from app.extensions import db, mail
from app.models import Target, Event, EventType, TrackingToken

URL_SAFE = re.compile(r"^[A-Za-z0-9_-]+$")


def _launch_capture(auth_client, template_id, group_id):
    cid = auth_client.post(
        "/api/campaigns",
        json={"name": "Pipeline", "template_id": template_id, "target_group_id": group_id},
    ).get_json()["data"]["id"]
    with mail.record_messages() as outbox:
        launch = auth_client.post(f"/api/campaigns/{cid}/launch")
    return cid, outbox, launch


def test_7_1_three_emails_sent(auth_client, baseline):
    _, outbox, launch = _launch_capture(
        auth_client, baseline["hard_template_id"], baseline["group_id"]
    )
    assert launch.status_code == 200
    assert len(outbox) == 3


def test_7_2_to_7_4_personalisation_and_links(auth_client, baseline):
    cid, outbox, _ = _launch_capture(
        auth_client, baseline["hard_template_id"], baseline["group_id"]
    )
    db.session.rollback()
    tokens = {
        tt.target_id: tt.token
        for tt in TrackingToken.query.filter_by(campaign_id=cid).all()
    }
    targets_by_email = {
        t.email: t for t in Target.query.filter_by(target_group_id=baseline["group_id"])
    }

    assert len(outbox) == 3
    for msg in outbox:
        target = targets_by_email[msg.recipients[0]]
        token = tokens[target.id]
        html = msg.html

        # 7.2 personalisation (hard template uses first + last name)
        assert target.first_name in html
        assert target.last_name in html

        # 7.3 tracking link on port 5001 with the token present
        assert f"http://localhost:5001/track/click/{token}" in html

        # 7.4 report link with the token
        assert f"http://localhost:5001/report?token={token}" in html


def test_7_5_sent_event_per_target(auth_client, baseline):
    cid, _, _ = _launch_capture(
        auth_client, baseline["easy_template_id"], baseline["group_id"]
    )
    db.session.rollback()
    sent = Event.query.filter_by(campaign_id=cid, event_type=EventType.sent).all()
    assert len(sent) == 3
    assert all(e.timestamp is not None for e in sent)


def test_7_6_unique_token_per_target(auth_client, baseline):
    cid, _, _ = _launch_capture(
        auth_client, baseline["easy_template_id"], baseline["group_id"]
    )
    db.session.rollback()
    tokens = TrackingToken.query.filter_by(campaign_id=cid).all()
    assert len(tokens) == 3
    values = [t.token for t in tokens]
    assert len(set(values)) == 3  # all distinct
    group_target_ids = set(baseline["target_ids"])
    for tt in tokens:
        assert tt.campaign_id == cid
        assert tt.target_id in group_target_ids


def test_7_7_tokens_opaque_no_pii(auth_client, baseline):
    cid, _, _ = _launch_capture(
        auth_client, baseline["hard_template_id"], baseline["group_id"]
    )
    db.session.rollback()
    targets = {
        t.id: t for t in Target.query.filter_by(target_group_id=baseline["group_id"])
    }
    for tt in TrackingToken.query.filter_by(campaign_id=cid).all():
        target = targets[tt.target_id]
        assert URL_SAFE.match(tt.token)         # opaque, URL-safe
        assert len(tt.token) >= 20
        assert "@" not in tt.token
        assert target.email not in tt.token
        assert target.email.split("@")[0] not in tt.token


def test_7_ethical_no_external_delivery(app):
    """CRITICAL: the test config cannot deliver to any real inbox."""
    assert app.config["MAIL_SUPPRESS_SEND"] is True
