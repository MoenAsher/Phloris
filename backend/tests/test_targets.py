"""Section 5 — Target Group & Target Tests (HIGH)."""

from app.extensions import db
from app.models import Target, TargetGroup


def _make_group(auth_client, name="Group A"):
    return auth_client.post("/api/target-groups", json={"name": name}).get_json()[
        "data"
    ]["id"]


def test_5_1_create_group(auth_client):
    resp = auth_client.post("/api/target-groups", json={"name": "Sales"})
    assert resp.status_code == 201
    assert resp.get_json()["data"]["name"] == "Sales"


def test_5_2_list_groups(auth_client):
    _make_group(auth_client)
    resp = auth_client.get("/api/target-groups")
    assert resp.status_code == 200
    assert isinstance(resp.get_json()["data"], list)


def test_5_3_add_single_target(auth_client):
    gid = _make_group(auth_client)
    resp = auth_client.post(
        f"/api/target-groups/{gid}/targets",
        json={"email": "person@test.local", "first_name": "P", "last_name": "Q"},
    )
    assert resp.status_code == 201
    assert resp.get_json()["data"]["target_group_id"] == gid


def test_5_4_malformed_email_rejected(auth_client):
    gid = _make_group(auth_client)
    resp = auth_client.post(
        f"/api/target-groups/{gid}/targets", json={"email": "not-an-email"}
    )
    assert 400 <= resp.status_code < 500
    db.session.rollback()
    assert Target.query.filter_by(target_group_id=gid).count() == 0


def test_5_5_list_only_group_targets(auth_client):
    g1 = _make_group(auth_client, "G1")
    g2 = _make_group(auth_client, "G2")
    auth_client.post(f"/api/target-groups/{g1}/targets", json={"email": "a@test.local"})
    auth_client.post(f"/api/target-groups/{g1}/targets", json={"email": "b@test.local"})
    auth_client.post(f"/api/target-groups/{g2}/targets", json={"email": "c@test.local"})

    resp = auth_client.get(f"/api/target-groups/{g1}/targets")
    assert resp.status_code == 200
    emails = {t["email"] for t in resp.get_json()["data"]}
    assert emails == {"a@test.local", "b@test.local"}


def test_5_6_csv_import_valid(auth_client):
    gid = _make_group(auth_client)
    csv = "email,first_name,last_name\nx@test.local,X,One\ny@test.local,Y,Two\n"
    resp = auth_client.post(
        f"/api/target-groups/{gid}/targets/import", json={"csv": csv}
    )
    assert resp.status_code == 201
    assert resp.get_json()["data"]["imported"] == 2
    db.session.rollback()
    assert Target.query.filter_by(target_group_id=gid).count() == 2


def test_5_7_csv_import_with_malformed_row(auth_client):
    gid = _make_group(auth_client)
    # Middle row has no valid email — must be skipped, not crash.
    csv = "email,first_name,last_name\nok@test.local,Ok,Row\nnot-an-email,Bad,Row\ngood@test.local,Good,Row\n"
    resp = auth_client.post(
        f"/api/target-groups/{gid}/targets/import", json={"csv": csv}
    )
    assert resp.status_code == 201
    data = resp.get_json()["data"]
    assert data["imported"] == 2
    assert data["skipped"] >= 1
    # The malformed row is reported back with a reason.
    assert any(r["email"] == "not-an-email" for r in data["rejected"])


def test_5_8_delete_target_leaves_others(auth_client):
    gid = _make_group(auth_client)
    t1 = auth_client.post(
        f"/api/target-groups/{gid}/targets", json={"email": "keep@test.local"}
    ).get_json()["data"]
    t2 = auth_client.post(
        f"/api/target-groups/{gid}/targets", json={"email": "drop@test.local"}
    ).get_json()["data"]

    resp = auth_client.delete(f"/api/targets/{t2['id']}")
    assert resp.status_code in (200, 204)
    remaining = auth_client.get(f"/api/target-groups/{gid}/targets").get_json()["data"]
    ids = {t["id"] for t in remaining}
    assert t1["id"] in ids and t2["id"] not in ids


def test_5_9_delete_group_cascades_targets(auth_client):
    """5.9 Deleting a group with no campaigns cascades to its targets."""
    gid = _make_group(auth_client)
    auth_client.post(f"/api/target-groups/{gid}/targets", json={"email": "z@test.local"})

    resp = auth_client.delete(f"/api/target-groups/{gid}")
    assert resp.status_code in (200, 204)
    db.session.rollback()
    assert db.session.get(TargetGroup, gid) is None
    assert Target.query.filter_by(target_group_id=gid).count() == 0
