"""Behavioural event model.

This is the core record from which all four metrics are derived:
click rate, reporting rate, time-to-click, and time-to-report. Only the
event type and timestamp are stored — no IP, user-agent, or other personal
data (proportional data collection).
"""

import enum

from ..extensions import db
from ..utils.time import utcnow, iso


class EventType(enum.Enum):
    """The kind of behavioural event recorded for a target."""

    sent = "sent"
    opened = "opened"
    clicked = "clicked"
    reported = "reported"


class Event(db.Model):
    """A single behavioural event for a (campaign, target) pair."""

    __tablename__ = "events"

    id = db.Column(db.Integer, primary_key=True)
    campaign_id = db.Column(
        db.Integer, db.ForeignKey("campaigns.id"), nullable=False, index=True
    )
    target_id = db.Column(
        db.Integer, db.ForeignKey("targets.id"), nullable=False, index=True
    )
    event_type = db.Column(db.Enum(EventType), nullable=False, index=True)
    # The moment the event occurred (UTC).
    timestamp = db.Column(db.DateTime, nullable=False, default=utcnow)
    created_at = db.Column(db.DateTime, nullable=False, default=utcnow)

    campaign = db.relationship("Campaign", back_populates="events")
    target = db.relationship("Target", back_populates="events")

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "campaign_id": self.campaign_id,
            "target_id": self.target_id,
            "event_type": self.event_type.value,
            "timestamp": iso(self.timestamp),
            "created_at": iso(self.created_at),
        }

    def __repr__(self) -> str:
        return f"<Event {self.event_type.value} c={self.campaign_id} t={self.target_id}>"
