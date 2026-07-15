"""Section 3 — Authorization / Protected Route Tests (CRITICAL).

Every /api admin route must reject unauthenticated requests with 401; the
public tracking and performance routes must work without any token.
"""

import pytest

# (method, path) for every JWT-protected route. Paths use id=1; auth is checked
# before the resource is looked up, so a non-existent id still yields 401.
PROTECTED_ROUTES = [
    # 3.1 templates
    ("get", "/api/templates"),
    ("post", "/api/templates"),
    ("get", "/api/templates/1"),
    ("put", "/api/templates/1"),
    ("delete", "/api/templates/1"),
    # 3.2 target groups & targets
    ("get", "/api/target-groups"),
    ("post", "/api/target-groups"),
    ("delete", "/api/target-groups/1"),
    ("get", "/api/target-groups/1/targets"),
    ("post", "/api/target-groups/1/targets"),
    ("post", "/api/target-groups/1/targets/import"),
    ("delete", "/api/targets/1"),
    # 3.3 campaigns
    ("get", "/api/campaigns"),
    ("post", "/api/campaigns"),
    ("get", "/api/campaigns/1"),
    ("put", "/api/campaigns/1"),
    ("post", "/api/campaigns/1/launch"),
    ("delete", "/api/campaigns/1"),
    # 3.4 dashboard
    ("get", "/api/dashboard/overview"),
    ("get", "/api/dashboard/campaigns/1/metrics"),
    ("get", "/api/dashboard/campaigns/1/timeline"),
    ("get", "/api/dashboard/campaigns/1/targets"),
]


@pytest.mark.parametrize("method,path", PROTECTED_ROUTES)
def test_3_1_to_3_4_protected_routes_require_jwt(client, method, path):
    resp = getattr(client, method)(path)
    assert resp.status_code == 401, f"{method.upper()} {path} should be 401"


def test_3_5_public_routes_work_without_token(client, scenario_5):
    """3.5 Tracking + performance routes are intentionally public."""
    token = scenario_5["tokens"]["A"]

    click = client.get(f"/track/click/{token}")
    assert click.status_code in (302, 200)
    assert click.status_code != 401

    report = client.post("/report", json={"token": token})
    assert report.status_code == 200

    perf = client.get(f"/api/performance/{token}")
    assert perf.status_code == 200
