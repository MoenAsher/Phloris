"""Section 10 — Dashboard Endpoint Tests (HIGH) — UR-01.

Uses the controlled 5-target scenario (click rate 0.60, report rate 0.40) as the
single campaign in an otherwise empty database, so overview totals are exact.
"""

import pytest

from app.extensions import db
from app.models import (
    Target,
    TargetGroup,
    Template,
    Campaign,
    CampaignStatus,
    Event,
    EventType,
    Difficulty,
)
from app.utils.time import utcnow


def test_10_1_overview_totals(auth_client, scenario_5):
    resp = auth_client.get("/api/dashboard/overview")
    assert resp.status_code == 200
    data = resp.get_json()["data"]
    assert data["total_campaigns"] == 1
    assert data["total_targets"] == 5
    assert data["emails_sent"] == 5
    assert data["overall_click_rate"] == pytest.approx(0.60)
    assert data["overall_report_rate"] == pytest.approx(0.40)


def test_10_2_campaign_metrics_match_section_9(auth_client, scenario_5):
    resp = auth_client.get(
        f"/api/dashboard/campaigns/{scenario_5['campaign_id']}/metrics"
    )
    assert resp.status_code == 200
    data = resp.get_json()["data"]
    assert data["click_rate"] == pytest.approx(0.60)
    assert data["report_rate"] == pytest.approx(0.40)
    assert data["avg_time_to_click_seconds"] == pytest.approx(20.0)
    assert data["avg_time_to_report_seconds"] == pytest.approx(60.0)


def test_10_3_timeline_time_ordered(auth_client, scenario_5):
    resp = auth_client.get(
        f"/api/dashboard/campaigns/{scenario_5['campaign_id']}/timeline"
    )
    assert resp.status_code == 200
    points = resp.get_json()["data"]["points"]
    # Distinct-first click/report events: A,B,C clicks + C,D reports = 5 points.
    assert len(points) == 5
    timestamps = [p["timestamp"] for p in points]
    assert timestamps == sorted(timestamps)  # time-ordered
    last = points[-1]
    assert last["cumulative_clicks"] == 3
    assert last["cumulative_reports"] == 2


def test_10_4_targets_outcomes(auth_client, scenario_5):
    resp = auth_client.get(
        f"/api/dashboard/campaigns/{scenario_5['campaign_id']}/targets"
    )
    assert resp.status_code == 200
    targets = resp.get_json()["data"]["targets"]
    assert len(targets) == 5
    outcomes = {t["outcome"] for t in targets}
    assert outcomes == {"clicked", "reported", "no_action"}
    assert all(t["sent"] for t in targets)


@pytest.mark.parametrize(
    "path",
    [
        "/api/dashboard/campaigns/999999/metrics",
        "/api/dashboard/campaigns/999999/timeline",
        "/api/dashboard/campaigns/999999/targets",
    ],
)
def test_10_5_nonexistent_campaign_404(auth_client, path):
    assert auth_client.get(path).status_code == 404


def test_10_6_overview_aggregates_across_campaigns(auth_client, scenario_5):
    """10.6 Overview rates aggregate all campaigns, not just one.

    Add a 2nd campaign (2 sent, 1 clicked, 0 reported). Overall click rate must
    become (3+1)/(5+2) = 4/7 and report rate (2+0)/(5+2) = 2/7.
    """
    template = Template(
        name="t2", subject="s", body_html="b", difficulty_level=Difficulty.easy
    )
    group = TargetGroup(name="g2")
    db.session.add_all([template, group])
    db.session.flush()
    campaign = Campaign(
        name="c2",
        template_id=template.id,
        target_group_id=group.id,
        status=CampaignStatus.running,
    )
    db.session.add(campaign)
    db.session.flush()
    t1 = Target(email="m@test.local", group=group)
    t2 = Target(email="n@test.local", group=group)
    db.session.add_all([t1, t2])
    db.session.flush()
    now = utcnow()
    db.session.add_all(
        [
            Event(campaign_id=campaign.id, target_id=t1.id, event_type=EventType.sent, timestamp=now),
            Event(campaign_id=campaign.id, target_id=t2.id, event_type=EventType.sent, timestamp=now),
            Event(campaign_id=campaign.id, target_id=t1.id, event_type=EventType.clicked, timestamp=now),
        ]
    )
    db.session.commit()

    data = auth_client.get("/api/dashboard/overview").get_json()["data"]
    assert data["total_campaigns"] == 2
    assert data["emails_sent"] == 7
    assert data["overall_click_rate"] == pytest.approx(4 / 7)
    assert data["overall_report_rate"] == pytest.approx(2 / 7)
