"""Data models package.

Importing the model modules here ensures their tables are registered on
`db.metadata` so `db.create_all()` can discover them, and lets callers do
`from app.models import User, Campaign, ...`.
"""

from ..extensions import db
from .user import User
from .template import Template, Difficulty
from .target import TargetGroup, Target
from .campaign import Campaign, CampaignStatus
from .event import Event, EventType
from .tracking_token import TrackingToken

__all__ = [
    "db",
    "User",
    "Template",
    "Difficulty",
    "TargetGroup",
    "Target",
    "Campaign",
    "CampaignStatus",
    "Event",
    "EventType",
    "TrackingToken",
]


def init_db() -> None:
    """Create all tables in the configured database.

    Must be called within an application context.
    """
    db.create_all()
