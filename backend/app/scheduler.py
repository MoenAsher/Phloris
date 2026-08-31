"""Background scheduler for automatic campaign launch (Feature Change 3).

A single APScheduler `BackgroundScheduler` runs inside the Flask process and,
once a minute, launches any campaign whose schedule has come due. It reuses the
existing launch path (`services.email_service.launch_campaign`) — there is no
second send code path — and relies on that function flipping the campaign to
`running`, which removes it from the due query so it can never double-launch.

Initialisation is guarded so the scheduler starts exactly once:
  - never under the automated test suite (`app.testing`);
  - under the Werkzeug reloader (debug mode) only in the worker child, not the
    reloader's supervising parent, which would otherwise create two schedulers.
"""

from __future__ import annotations

import os

from flask import Flask

from .extensions import db
from .models import Campaign, CampaignStatus
from .services.email_service import launch_campaign
from .utils.time import utcnow

# How often the due-campaign sweep runs, in seconds.
_SWEEP_INTERVAL_SECONDS = 60


def init_scheduler(app: Flask) -> None:
    """Start the background scheduler unless this process should not run one.

    Safe to call unconditionally from the app factory; the guards below decide
    whether a scheduler is actually started.
    """
    if app.config.get("TESTING"):
        # The suite creates many apps; a scheduler per app would be pointless
        # and could touch the database outside a test's control.
        return

    # Under the reloader, Werkzeug runs two processes: a supervising parent and
    # a worker child. Only the child sets WERKZEUG_RUN_MAIN=true. Starting the
    # scheduler only in the child avoids two schedulers racing to launch the
    # same campaign. When the reloader is off (production/non-debug), RUN_MAIN
    # is unset and app.debug is False, so we fall through and start once.
    if app.debug and os.environ.get("WERKZEUG_RUN_MAIN") != "true":
        return

    # Imported lazily so the dependency is only required when a scheduler
    # actually starts (e.g. not needed to import the app in tests).
    from apscheduler.schedulers.background import BackgroundScheduler

    scheduler = BackgroundScheduler(daemon=True, timezone="UTC")
    scheduler.add_job(
        func=lambda: _launch_due_campaigns(app),
        trigger="interval",
        seconds=_SWEEP_INTERVAL_SECONDS,
        id="launch_due_campaigns",
        max_instances=1,   # never overlap two sweeps
        coalesce=True,      # collapse missed runs into one
    )
    scheduler.start()
    # Keep a handle on the app so a caller could shut it down if needed.
    app.extensions["scheduler"] = scheduler
    app.logger.info(
        "Campaign scheduler started (sweep every %ss).", _SWEEP_INTERVAL_SECONDS
    )


def _launch_due_campaigns(app: Flask) -> None:
    """Find scheduled campaigns whose time has passed and launch each one.

    Runs inside an app context (APScheduler jobs run outside the request
    lifecycle). Each campaign is handled independently: a failure on one is
    logged and does not abort the sweep or crash the scheduler thread.
    """
    with app.app_context():
        now = utcnow()
        due = (
            Campaign.query.filter(
                Campaign.status == CampaignStatus.scheduled,
                Campaign.scheduled_at.isnot(None),
                Campaign.scheduled_at <= now,
            )
            .order_by(Campaign.scheduled_at)
            .all()
        )
        for campaign in due:
            _launch_one(app, campaign)


def _launch_one(app: Flask, campaign: Campaign) -> None:
    """Launch a single due campaign, failing gracefully on any error."""
    # A scheduled campaign with no sending profile cannot be sent. Per the spec,
    # fail gracefully: log and leave it as `scheduled` so the admin can see it
    # did not send (assigning a profile lets a later sweep pick it up).
    if campaign.sending_profile_id is None:
        app.logger.error(
            "Scheduled campaign %s (%s) has no sending profile; skipping launch.",
            campaign.id,
            campaign.name,
        )
        return

    if not campaign.target_group.targets:
        app.logger.error(
            "Scheduled campaign %s (%s) has no targets; skipping launch.",
            campaign.id,
            campaign.name,
        )
        return

    try:
        result = launch_campaign(campaign)
    except Exception:  # noqa: BLE001 - never let one campaign kill the sweep
        app.logger.exception(
            "Scheduled launch of campaign %s (%s) failed.", campaign.id, campaign.name
        )
        db.session.rollback()
        return

    if result.sent_count == 0:
        # launch_campaign already rolled back and left the status unchanged.
        app.logger.error(
            "Scheduled campaign %s (%s): no emails could be sent (%s failed).",
            campaign.id,
            campaign.name,
            len(result.failed),
        )
    else:
        app.logger.info(
            "Scheduled campaign %s (%s) launched: %s/%s sent.",
            campaign.id,
            campaign.name,
            result.sent_count,
            result.total_targets,
        )
