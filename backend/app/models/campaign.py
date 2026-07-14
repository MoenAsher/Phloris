"""Campaign model."""

import enum

from ..extensions import db
from ..utils.time import utcnow, iso


class CampaignStatus(enum.Enum):
    """Lifecycle state of a campaign."""

    draft = "draft"
    scheduled = "scheduled"
    running = "running"
    completed = "completed"


class Campaign(db.Model):
    """A phishing simulation campaign against a target group."""

    __tablename__ = "campaigns"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    template_id = db.Column(
        db.Integer, db.ForeignKey("templates.id"), nullable=False
    )
    target_group_id = db.Column(
        db.Integer, db.ForeignKey("target_groups.id"), nullable=False
    )
    status = db.Column(
        db.Enum(CampaignStatus), nullable=False, default=CampaignStatus.draft
    )
    scheduled_at = db.Column(db.DateTime, nullable=True)
    launched_at = db.Column(db.DateTime, nullable=True)
    completed_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, nullable=False, default=utcnow)

    template = db.relationship("Template", back_populates="campaigns")
    target_group = db.relationship("TargetGroup", back_populates="campaigns")
    # Deleting a campaign removes its events and tracking tokens.
    events = db.relationship(
        "Event", back_populates="campaign", cascade="all, delete-orphan"
    )
    tracking_tokens = db.relationship(
        "TrackingToken", back_populates="campaign", cascade="all, delete-orphan"
    )

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "template_id": self.template_id,
            "target_group_id": self.target_group_id,
            "status": self.status.value,
            "scheduled_at": iso(self.scheduled_at),
            "launched_at": iso(self.launched_at),
            "completed_at": iso(self.completed_at),
            "created_at": iso(self.created_at),
        }

    def __repr__(self) -> str:
        return f"<Campaign {self.name} ({self.status.value})>"
