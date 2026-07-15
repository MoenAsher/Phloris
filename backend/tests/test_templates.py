"""Section 4 — Template CRUD Tests (HIGH) — UR-02."""

from app.extensions import db
from app.models import Template

VALID = {
    "name": "Payroll Notice",
    "subject": "Update your details",
    "body_html": "<p>Hi {{first_name}}, <a href='{{tracking_link}}'>here</a>. "
    "<a href='{{report_link}}'>report</a></p>",
    "difficulty_level": "medium",
}


def test_4_1_create_valid(auth_client):
    resp = auth_client.post("/api/templates", json=VALID)
    assert resp.status_code == 201
    data = resp.get_json()["data"]
    assert data["difficulty_level"] == "medium"
    assert data["name"] == "Payroll Notice"


def test_4_2_invalid_difficulty(auth_client):
    payload = {**VALID, "difficulty_level": "impossible"}
    resp = auth_client.post("/api/templates", json=payload)
    assert 400 <= resp.status_code < 500
    db.session.rollback()
    assert Template.query.filter_by(name="Payroll Notice").count() == 0


def test_4_3_missing_required_field(auth_client):
    for missing in ("name", "subject", "body_html"):
        payload = {**VALID}
        payload.pop(missing)
        resp = auth_client.post("/api/templates", json=payload)
        assert resp.status_code == 400, f"missing {missing} should be 400"


def test_4_4_list(auth_client):
    auth_client.post("/api/templates", json=VALID)
    resp = auth_client.get("/api/templates")
    assert resp.status_code == 200
    assert isinstance(resp.get_json()["data"], list)
    assert len(resp.get_json()["data"]) >= 1


def test_4_5_get_existing(auth_client):
    created = auth_client.post("/api/templates", json=VALID).get_json()["data"]
    resp = auth_client.get(f"/api/templates/{created['id']}")
    assert resp.status_code == 200
    assert resp.get_json()["data"]["id"] == created["id"]


def test_4_6_get_missing(auth_client):
    assert auth_client.get("/api/templates/999999").status_code == 404


def test_4_7_update(auth_client):
    created = auth_client.post("/api/templates", json=VALID).get_json()["data"]
    resp = auth_client.put(
        f"/api/templates/{created['id']}", json={"name": "Renamed"}
    )
    assert resp.status_code == 200
    assert resp.get_json()["data"]["name"] == "Renamed"
    # Persisted.
    assert auth_client.get(f"/api/templates/{created['id']}").get_json()["data"][
        "name"
    ] == "Renamed"


def test_4_8_delete(auth_client):
    created = auth_client.post("/api/templates", json=VALID).get_json()["data"]
    resp = auth_client.delete(f"/api/templates/{created['id']}")
    assert resp.status_code in (200, 204)
    assert auth_client.get(f"/api/templates/{created['id']}").status_code == 404


def test_4_9_placeholders_preserved_verbatim(auth_client):
    """4.9 body_html placeholders stored without corruption."""
    created = auth_client.post("/api/templates", json=VALID).get_json()["data"]
    stored = auth_client.get(f"/api/templates/{created['id']}").get_json()["data"]
    for placeholder in ("{{first_name}}", "{{tracking_link}}", "{{report_link}}"):
        assert placeholder in stored["body_html"]
