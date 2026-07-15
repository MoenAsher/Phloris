"""Section 9 — Metrics Calculation Tests (CRITICAL).

The most important logical tests in the plan. Uses the exact controlled
5-target scenario (`scenario_5` fixture) and asserts precise expected values,
plus the division-by-zero safe paths.
"""

import pytest

from app.extensions import db
from app.models import (
    Template,
    TargetGroup,
    Target,
    Campaign,
    CampaignStatus,
    Event,
    EventType,
    Difficulty,
)
from app.services.metrics import campaign_metrics
from app.utils.time import utcnow


def _empty_campaign():
    """Create a campaign (with the required template/group) and return its id."""
    template = Template(
        name="t", subject="s", body_html="b", difficulty_level=Difficulty.easy
    )
    group = TargetGroup(name="g")
    db.session.add_all([template, group])
    db.session.flush()
    campaign = Campaign(
        name="c",
        template_id=template.id,
        target_group_id=group.id,
        status=CampaignStatus.draft,
    )
    db.session.add(campaign)
    db.session.commit()
    return campaign.id


def test_9_1_click_rate(scenario_5):
    """9.1 Distinct clickers A,B,C = 3 of 5 = 0.60."""
    m = campaign_metrics(scenario_5["campaign_id"])
    assert m.sent_count == 5
    assert m.clicked_count == 3
    assert m.click_rate == pytest.approx(0.60)


def test_9_2_report_rate(scenario_5):
    """9.2 Distinct reporters C,D = 2 of 5 = 0.40."""
    m = campaign_metrics(scenario_5["campaign_id"])
    assert m.reported_count == 2
    assert m.report_rate == pytest.approx(0.40)


def test_9_3_double_click_not_inflating(scenario_5):
    """9.3 B double-clicked but is counted once; click rate stays 0.60."""
    m = campaign_metrics(scenario_5["campaign_id"])
    # Sanity: there really are 2 raw clicked events for target B.
    b_id = scenario_5["target_ids"]["B"]
    raw_b_clicks = Event.query.filter_by(
        campaign_id=scenario_5["campaign_id"],
        target_id=b_id,
        event_type=EventType.clicked,
    ).count()
    assert raw_b_clicks == 2
    # But distinct clicker count is still 3, not 4.
    assert m.clicked_count == 3
    assert m.click_rate == pytest.approx(0.60)


def test_9_4_avg_time_to_click(scenario_5):
    """9.4 Mean(click-sent) over A,B,C = mean(10,20,30) = 20.0s; excludes D,E."""
    m = campaign_metrics(scenario_5["campaign_id"])
    assert m.avg_time_to_click_seconds == pytest.approx(20.0)


def test_9_5_avg_time_to_report(scenario_5):
    """9.5 Mean(report-sent) over C,D = mean(50,70) = 60.0s; excludes A,B,E."""
    m = campaign_metrics(scenario_5["campaign_id"])
    assert m.avg_time_to_report_seconds == pytest.approx(60.0)


def test_9_6_per_target_outcome_classification(auth_client, scenario_5):
    """9.6 A=clicked, B=clicked, C=clicked+reported, D=reported, E=no-action."""
    resp = auth_client.get(
        f"/api/dashboard/campaigns/{scenario_5['campaign_id']}/targets"
    )
    assert resp.status_code == 200
    by_id = {t["target_id"]: t for t in resp.get_json()["data"]["targets"]}
    ids = scenario_5["target_ids"]

    a = by_id[ids["A"]]
    assert a["clicked"] is True and a["reported"] is False and a["outcome"] == "clicked"

    b = by_id[ids["B"]]
    assert b["clicked"] is True and b["reported"] is False and b["outcome"] == "clicked"

    c = by_id[ids["C"]]
    assert c["clicked"] is True and c["reported"] is True  # clicked+reported

    d = by_id[ids["D"]]
    assert d["clicked"] is False and d["reported"] is True and d["outcome"] == "reported"

    e = by_id[ids["E"]]
    assert e["clicked"] is False and e["reported"] is False and e["outcome"] == "no_action"


def test_9_7_zero_sent_no_division_error(app):
    """9.7 Campaign with zero sent events -> safe zeros/None, no exception."""
    cid = _empty_campaign()
    m = campaign_metrics(cid)
    assert m.sent_count == 0
    assert m.click_rate == 0.0
    assert m.report_rate == 0.0
    assert m.avg_time_to_click_seconds is None
    assert m.avg_time_to_report_seconds is None


def test_9_8_sends_but_no_interaction(app):
    """9.8 Sends but zero clicks/reports -> rates 0.0, times None (not error)."""
    template = Template(
        name="t", subject="s", body_html="b", difficulty_level=Difficulty.easy
    )
    group = TargetGroup(name="g")
    db.session.add_all([template, group])
    db.session.flush()
    campaign = Campaign(
        name="c",
        template_id=template.id,
        target_group_id=group.id,
        status=CampaignStatus.running,
    )
    db.session.add(campaign)
    db.session.flush()
    t1 = Target(email="x@test.local", group=group)
    t2 = Target(email="y@test.local", group=group)
    db.session.add_all([t1, t2])
    db.session.flush()
    now = utcnow()
    db.session.add_all(
        [
            Event(campaign_id=campaign.id, target_id=t1.id, event_type=EventType.sent, timestamp=now),
            Event(campaign_id=campaign.id, target_id=t2.id, event_type=EventType.sent, timestamp=now),
        ]
    )
    db.session.commit()

    m = campaign_metrics(campaign.id)
    assert m.sent_count == 2
    assert m.click_rate == 0.0
    assert m.report_rate == 0.0
    assert m.avg_time_to_click_seconds is None
    assert m.avg_time_to_report_seconds is None
