"""Section 8 — Click & Report Tracking Tests (CRITICAL) — UR-04..UR-07, UR-09."""

import pytest

from app.extensions import db
from app.models import Event, EventType, TrackingToken
from app.services.metrics import campaign_metrics


@pytest.fixture
def launched(auth_client, baseline):
    """Launch a baseline campaign and return campaign id + per-target tokens."""
    cid = auth_client.post(
        "/api/campaigns",
        json={
            "name": "Track",
            "template_id": baseline["easy_template_id"],
            "target_group_id": baseline["group_id"],
        },
    ).get_json()["data"]["id"]
    auth_client.post(f"/api/campaigns/{cid}/launch")
    db.session.rollback()
    tokens = {
        tt.target_id: tt.token
        for tt in TrackingToken.query.filter_by(campaign_id=cid).all()
    }
    return {"campaign_id": cid, "tokens": tokens, "target_ids": baseline["target_ids"]}


def _events(cid, target_id, etype):
    return Event.query.filter_by(
        campaign_id=cid, target_id=target_id, event_type=etype
    ).count()


def test_8_1_valid_click_records_and_redirects(client, launched):
    target_id, token = next(iter(launched["tokens"].items()))
    resp = client.get(f"/track/click/{token}")
    assert resp.status_code == 302
    assert "/feedback/" in resp.headers["Location"]
    db.session.rollback()
    assert _events(launched["campaign_id"], target_id, EventType.clicked) == 1
    # UTC timestamp recorded.
    ev = Event.query.filter_by(
        campaign_id=launched["campaign_id"], target_id=target_id,
        event_type=EventType.clicked,
    ).first()
    assert ev.timestamp is not None


def test_8_2_invalid_click_graceful_no_event(client, launched):
    db.session.rollback()
    before = Event.query.count()
    resp = client.get("/track/click/this-token-does-not-exist")
    assert resp.status_code == 404
    db.session.rollback()
    assert Event.query.count() == before  # no event created


def test_8_3_double_click_counts_once_in_rate(client, launched):
    target_id, token = next(iter(launched["tokens"].items()))
    client.get(f"/track/click/{token}")
    client.get(f"/track/click/{token}")
    db.session.rollback()
    # Two raw clicked events stored...
    assert _events(launched["campaign_id"], target_id, EventType.clicked) == 2
    # ...but the metric counts the target once.
    m = campaign_metrics(launched["campaign_id"])
    assert m.clicked_count == 1


def test_8_4_valid_report_records_and_confirms(client, launched):
    target_id, token = next(iter(launched["tokens"].items()))
    resp = client.post("/report", json={"token": token})
    assert resp.status_code == 200
    assert "message" in resp.get_json()["data"]
    db.session.rollback()
    ev = Event.query.filter_by(
        campaign_id=launched["campaign_id"], target_id=target_id,
        event_type=EventType.reported,
    ).first()
    assert ev is not None and ev.timestamp is not None


def test_8_5_invalid_report_graceful_no_event(client, launched):
    db.session.rollback()
    before = Event.query.count()
    resp = client.post("/report", json={"token": "nope"})
    assert resp.status_code == 404
    db.session.rollback()
    assert Event.query.count() == before


def test_8_6_report_without_click(client, launched):
    target_id, token = next(iter(launched["tokens"].items()))
    client.post("/report", json={"token": token})
    db.session.rollback()
    assert _events(launched["campaign_id"], target_id, EventType.reported) == 1
    assert _events(launched["campaign_id"], target_id, EventType.clicked) == 0


def test_8_7_report_after_click(client, launched):
    target_id, token = next(iter(launched["tokens"].items()))
    client.get(f"/track/click/{token}")
    client.post("/report", json={"token": token})
    db.session.rollback()
    assert _events(launched["campaign_id"], target_id, EventType.clicked) == 1
    assert _events(launched["campaign_id"], target_id, EventType.reported) == 1


def test_8_8_no_action_target(auth_client, client, launched):
    """8.8 A target that never acts is classified no-action."""
    # Act only on the first target; a different target stays untouched.
    ids = list(launched["tokens"].keys())
    acted, untouched = ids[0], ids[1]
    client.get(f"/track/click/{launched['tokens'][acted]}")
    db.session.rollback()
    assert _events(launched["campaign_id"], untouched, EventType.clicked) == 0
    assert _events(launched["campaign_id"], untouched, EventType.reported) == 0

    resp = auth_client.get(
        f"/api/dashboard/campaigns/{launched['campaign_id']}/targets"
    )
    by_id = {t["target_id"]: t for t in resp.get_json()["data"]["targets"]}
    assert by_id[untouched]["outcome"] == "no_action"


def test_8_ethical_events_store_only_type_and_timestamp(client, launched):
    """CRITICAL UR-08: click/report events carry no IP/user-agent/fingerprint."""
    target_id, token = next(iter(launched["tokens"].items()))
    client.get(f"/track/click/{token}")
    client.post("/report", json={"token": token})
    db.session.rollback()

    # The Event schema itself exposes no such fields.
    columns = {c.name for c in Event.__table__.columns}
    assert columns == {
        "id", "campaign_id", "target_id", "event_type", "timestamp", "created_at",
    }
    forbidden = {"ip", "ip_address", "user_agent", "fingerprint", "geo", "referrer"}
    assert columns.isdisjoint(forbidden)
