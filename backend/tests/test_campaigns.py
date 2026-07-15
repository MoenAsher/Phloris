"""Section 6 — Campaign Lifecycle Tests (HIGH)."""

from app.extensions import db
from app.models import Campaign, Event, TrackingToken


def _create_campaign(auth_client, template_id, group_id, name="Camp"):
    return auth_client.post(
        "/api/campaigns",
        json={"name": name, "template_id": template_id, "target_group_id": group_id},
    )


def test_6_1_create_draft(auth_client, baseline):
    resp = _create_campaign(
        auth_client, baseline["easy_template_id"], baseline["group_id"]
    )
    assert resp.status_code == 201
    assert resp.get_json()["data"]["status"] == "draft"


def test_6_2_create_with_bad_refs(auth_client, baseline):
    bad_template = auth_client.post(
        "/api/campaigns",
        json={"name": "C", "template_id": 999999, "target_group_id": baseline["group_id"]},
    )
    bad_group = auth_client.post(
        "/api/campaigns",
        json={"name": "C", "template_id": baseline["easy_template_id"], "target_group_id": 999999},
    )
    assert 400 <= bad_template.status_code < 500
    assert 400 <= bad_group.status_code < 500


def test_6_3_list(auth_client, baseline):
    _create_campaign(auth_client, baseline["easy_template_id"], baseline["group_id"])
    resp = auth_client.get("/api/campaigns")
    assert resp.status_code == 200
    rows = resp.get_json()["data"]
    assert rows and "status" in rows[0]


def test_6_4_detail(auth_client, baseline):
    cid = _create_campaign(
        auth_client, baseline["easy_template_id"], baseline["group_id"]
    ).get_json()["data"]["id"]
    resp = auth_client.get(f"/api/campaigns/{cid}")
    assert resp.status_code == 200
    assert resp.get_json()["data"]["id"] == cid


def test_6_5_update_draft(auth_client, baseline):
    cid = _create_campaign(
        auth_client, baseline["easy_template_id"], baseline["group_id"]
    ).get_json()["data"]["id"]
    resp = auth_client.put(f"/api/campaigns/{cid}", json={"name": "Renamed Camp"})
    assert resp.status_code == 200
    assert resp.get_json()["data"]["name"] == "Renamed Camp"


def test_6_6_launch_draft(auth_client, baseline):
    """6.6 Launch a valid draft -> 200; status running; launched_at set."""
    cid = _create_campaign(
        auth_client, baseline["easy_template_id"], baseline["group_id"]
    ).get_json()["data"]["id"]
    resp = auth_client.post(f"/api/campaigns/{cid}/launch")
    assert resp.status_code == 200
    data = resp.get_json()["data"]
    assert data["campaign"]["status"] == "running"
    assert data["campaign"]["launched_at"] is not None
    # 3 baseline targets all sent (email suppressed in tests).
    assert data["sent_count"] == 3


def test_6_7_launch_empty_group(auth_client):
    """6.7 Launch a campaign whose group has zero targets -> graceful, no crash."""
    tmpl = auth_client.post(
        "/api/templates",
        json={"name": "T", "subject": "S", "body_html": "B", "difficulty_level": "easy"},
    ).get_json()["data"]
    gid = auth_client.post(
        "/api/target-groups", json={"name": "Empty"}
    ).get_json()["data"]["id"]
    cid = _create_campaign(auth_client, tmpl["id"], gid).get_json()["data"]["id"]

    resp = auth_client.post(f"/api/campaigns/{cid}/launch")
    assert resp.status_code < 500          # defined, graceful
    assert resp.status_code == 400          # "no targets" per the route


def test_6_8_launch_already_running(auth_client, baseline):
    """6.8 Launching an already-running campaign is rejected; no duplicate sends."""
    cid = _create_campaign(
        auth_client, baseline["easy_template_id"], baseline["group_id"]
    ).get_json()["data"]["id"]
    first = auth_client.post(f"/api/campaigns/{cid}/launch")
    assert first.status_code == 200
    db.session.rollback()
    sent_after_first = Event.query.filter_by(campaign_id=cid).count()

    second = auth_client.post(f"/api/campaigns/{cid}/launch")
    assert second.status_code == 409
    db.session.rollback()
    # No new events created by the rejected second launch.
    assert Event.query.filter_by(campaign_id=cid).count() == sent_after_first


def test_6_9_delete_cascades_events_and_tokens(auth_client, baseline):
    """6.9 Deleting a campaign removes its events and tracking tokens."""
    cid = _create_campaign(
        auth_client, baseline["easy_template_id"], baseline["group_id"]
    ).get_json()["data"]["id"]
    auth_client.post(f"/api/campaigns/{cid}/launch")
    db.session.rollback()
    assert Event.query.filter_by(campaign_id=cid).count() == 3
    assert TrackingToken.query.filter_by(campaign_id=cid).count() == 3

    resp = auth_client.delete(f"/api/campaigns/{cid}")
    assert resp.status_code in (200, 204)
    db.session.rollback()
    assert db.session.get(Campaign, cid) is None
    assert Event.query.filter_by(campaign_id=cid).count() == 0
    assert TrackingToken.query.filter_by(campaign_id=cid).count() == 0
