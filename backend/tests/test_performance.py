"""Section 11 — Recipient Performance Tests (CRITICAL) — UR-10, UR-08.

The performance endpoint is public and token-scoped. These tests confirm it
returns only the token-holder's own history and can never leak another
recipient's data (the central privacy guarantee).
"""

import json


def test_11_1_valid_token_returns_own_history(client, scenario_5):
    """Target A clicked once at +10s."""
    token = scenario_5["tokens"]["A"]
    resp = client.get(f"/api/performance/{token}")
    assert resp.status_code == 200
    data = resp.get_json()["data"]
    assert data["first_name"] == "PersonA"
    assert len(data["campaigns"]) == 1
    camp = data["campaigns"][0]
    assert camp["clicked"] is True
    assert camp["time_to_click_seconds"] == 10.0


def test_11_2_response_content_shape(client, scenario_5):
    """Per-campaign: outcome + clicked/reported flags + timings where applicable."""
    token = scenario_5["tokens"]["C"]  # clicked @30 then reported @50
    camp = client.get(f"/api/performance/{token}").get_json()["data"]["campaigns"][0]
    for field in (
        "campaign_id", "campaign_name", "clicked", "reported", "outcome",
        "time_to_click_seconds", "time_to_report_seconds",
    ):
        assert field in camp
    assert camp["clicked"] is True and camp["reported"] is True
    assert camp["time_to_click_seconds"] == 30.0
    assert camp["time_to_report_seconds"] == 50.0


def test_11_3_other_recipient_token_shows_only_their_data(client, scenario_5):
    """D's token shows only D (reported, never clicked) — no trace of A/B/C."""
    token = scenario_5["tokens"]["D"]
    resp = client.get(f"/api/performance/{token}")
    data = resp.get_json()["data"]
    assert data["first_name"] == "PersonD"
    assert len(data["campaigns"]) == 1
    camp = data["campaigns"][0]
    assert camp["reported"] is True
    assert camp["clicked"] is False

    # No other recipient's identity or values appear anywhere in the payload.
    blob = json.dumps(data)
    for other in ("PersonA", "PersonB", "PersonC", "PersonE"):
        assert other not in blob
    for other_label in ("a@test.local", "b@test.local", "c@test.local", "e@test.local"):
        assert other_label not in blob


def test_11_4_cannot_enumerate_recipients(client, scenario_5):
    """No field exposes other recipients' identities/results."""
    token = scenario_5["tokens"]["A"]
    data = client.get(f"/api/performance/{token}").get_json()["data"]
    # Only these top-level keys; nothing that lists all recipients.
    assert set(data.keys()) == {"first_name", "campaigns"}
    for camp in data["campaigns"]:
        # No email / target id / recipient roster leaks per campaign entry.
        assert "email" not in camp
        assert "target_id" not in camp
        assert "recipients" not in camp


def test_11_5_invalid_token_404(client, scenario_5):
    resp = client.get("/api/performance/not-a-real-token")
    assert resp.status_code == 404
