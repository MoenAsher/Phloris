"""Behavioural metric calculations (Section 6 of the project spec).

Every metric is derived from the `Event` table. All four are computed per
campaign from a single pass over that campaign's events:

  - Click rate      = distinct targets with a `clicked` event
                      / distinct targets with a `sent` event
  - Reporting rate  = distinct targets with a `reported` event
                      / distinct targets with a `sent` event
  - Avg time-to-click  = mean over clicking targets of
                         (first clicked.timestamp − sent.timestamp)
  - Avg time-to-report = mean over reporting targets of
                         (first reported.timestamp − sent.timestamp)

Correctness notes:
  - Rates count *distinct targets*, never raw events, so a target that clicks
    (or reports) multiple times is counted once and can never push a rate above
    100%.
  - Timings use each target's *earliest* clicked/reported event — the moment
    they first acted — measured from their `sent` event.
  - Empty campaigns are handled without dividing by zero: rates fall back to
    0.0, and averages to None (meaning "no data", distinct from a real 0s).
"""

from __future__ import annotations

from dataclasses import dataclass

from ..models import Event, EventType


@dataclass
class CampaignMetrics:
    """Computed metrics for a single campaign.

    Rates are fractions in the range 0.0–1.0 (format as percentages for
    display). Average timings are in seconds, or None when no target performed
    that action.
    """

    campaign_id: int
    sent_count: int          # distinct targets sent to (rate denominator)
    clicked_count: int       # distinct targets that clicked
    reported_count: int      # distinct targets that reported
    no_action_count: int     # sent targets that neither clicked nor reported
    click_rate: float
    report_rate: float
    avg_time_to_click_seconds: float | None
    avg_time_to_report_seconds: float | None

    def to_dict(self) -> dict:
        return {
            "campaign_id": self.campaign_id,
            "sent_count": self.sent_count,
            "clicked_count": self.clicked_count,
            "reported_count": self.reported_count,
            "no_action_count": self.no_action_count,
            "click_rate": self.click_rate,
            "report_rate": self.report_rate,
            "avg_time_to_click_seconds": self.avg_time_to_click_seconds,
            "avg_time_to_report_seconds": self.avg_time_to_report_seconds,
        }


def campaign_metrics(campaign_id: int) -> CampaignMetrics:
    """Compute all four behavioural metrics for one campaign.

    Does a single query for the campaign's events, then reduces them to the
    earliest timestamp per (target, event_type). Works purely from event data,
    so a campaign with no events yields zeroed rates and None averages rather
    than raising.
    """
    events = Event.query.filter_by(campaign_id=campaign_id).all()

    # Earliest timestamp per target for each relevant event type. Keeping the
    # earliest gives the true "first sent", "first click", "first report".
    first_sent: dict[int, object] = {}
    first_clicked: dict[int, object] = {}
    first_reported: dict[int, object] = {}

    buckets = {
        EventType.sent: first_sent,
        EventType.clicked: first_clicked,
        EventType.reported: first_reported,
    }

    for event in events:
        bucket = buckets.get(event.event_type)
        if bucket is None:  # e.g. `opened` — not part of the four core metrics
            continue
        existing = bucket.get(event.target_id)
        if existing is None or event.timestamp < existing:
            bucket[event.target_id] = event.timestamp

    sent_targets = set(first_sent)
    clicked_targets = set(first_clicked)
    reported_targets = set(first_reported)

    sent_count = len(sent_targets)

    # Rates: distinct-target counts over the distinct sent population. Guard the
    # denominator so a campaign with no `sent` events reports 0.0, not an error.
    click_rate = len(clicked_targets) / sent_count if sent_count else 0.0
    report_rate = len(reported_targets) / sent_count if sent_count else 0.0

    # Averages: only over targets that both acted and have a `sent` baseline to
    # measure from. Returns None (no data) when nobody performed the action.
    avg_ttc = _average_delta_seconds(clicked_targets, first_sent, first_clicked)
    avg_ttr = _average_delta_seconds(reported_targets, first_sent, first_reported)

    no_action_count = len(sent_targets - clicked_targets - reported_targets)

    return CampaignMetrics(
        campaign_id=campaign_id,
        sent_count=sent_count,
        clicked_count=len(clicked_targets),
        reported_count=len(reported_targets),
        no_action_count=no_action_count,
        click_rate=click_rate,
        report_rate=report_rate,
        avg_time_to_click_seconds=avg_ttc,
        avg_time_to_report_seconds=avg_ttr,
    )


def _average_delta_seconds(
    action_targets: set[int],
    first_sent: dict[int, object],
    first_action: dict[int, object],
) -> float | None:
    """Mean of (action timestamp − sent timestamp) in seconds, or None.

    Only targets present in both maps contribute: a delta needs a `sent`
    baseline to measure from. Returns None when no target qualifies, so callers
    can distinguish "nobody acted" from an average of 0 seconds.
    """
    deltas = [
        (first_action[target_id] - first_sent[target_id]).total_seconds()
        for target_id in action_targets
        if target_id in first_sent
    ]
    if not deltas:
        return None
    return sum(deltas) / len(deltas)
