"""Industry benchmarks for the four Phloris behavioural metrics.

This is the single source of truth for all benchmark values. The frontend
fetches these via GET /api/benchmarks and uses them for display and PDF export.
Updating a figure here propagates everywhere automatically.

IMPORTANT — verify before submitting:
  click_rate.value  : confirm the exact 2025 baseline from the KnowBe4 report.
  report_rate.value : confirm the DBIR mature-programme threshold (spec says ~20%).
"""

BENCHMARKS: dict = {
    "click_rate": {
        "label": "Click rate",
        # TODO: confirm exact figure against the KnowBe4 2025 Phishing by Industry
        # Benchmarking Report (the 2024 edition cited 34.3%; use the 2025 value).
        "value": 0.337,
        "source": "KnowBe4 2025 Phishing by Industry Benchmarking Report",
        "direction": "lower_is_better",
        "note": None,
    },
    "report_rate": {
        "label": "Reporting rate",
        # TODO: confirm exact DBIR figure; spec and industry guidance cite ~20% as
        # the threshold that indicates a mature security-awareness programme.
        "value": 0.20,
        "source": "Verizon DBIR — mature-programme reporting threshold",
        "direction": "higher_is_better",
        "note": None,
    },
    "avg_time_to_click": {
        "label": "Average time-to-click",
        # No standard numeric industry baseline published for this metric.
        # Interpretation is qualitative, derived from the value itself.
        "value": None,
        "source": None,
        "direction": "higher_is_better",  # slower click = more deliberation
        "note": (
            "A very short average time-to-click suggests an immediate, unreflective "
            "response (System 1 thinking). A longer average indicates recipients "
            "paused before acting — a more deliberate pattern."
        ),
    },
    "avg_time_to_report": {
        "label": "Average time-to-report",
        # No standard numeric industry baseline published for this metric.
        "value": None,
        "source": None,
        "direction": "lower_is_better",  # faster report = better
        "note": (
            "Faster reporting limits the window for real-world damage. "
            "Reporting promptly after receiving the email is the optimal outcome "
            "and is tracked here as a distinct metric from clicking."
        ),
    },
}
