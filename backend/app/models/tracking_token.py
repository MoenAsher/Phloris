"""Opaque tracking token model.

Maps a random, opaque token to a (campaign, target) pair. The token carries
no personal data, so a recipient's identity cannot be derived from a tracking
URL — only resolved internally via this table.
"""

import secrets

from ..extensions import db
from ..utils.time import utcnow, iso


class TrackingToken(db.Model):
    """An opaque token resolving to a campaign + target."""

    __tablename__ = "tracking_tokens"

    id = db.Column(db.Integer, primary_key=True)
    token = db.Column(db.String(64), unique=True, nullable=False, index=True)
    campaign_id = db.Column(
        db.Integer, db.ForeignKey("campaigns.id"), nullable=False
    )
    target_id = db.Column(
        db.Integer, db.ForeignKey("targets.id"), nullable=False
    )
    created_at = db.Column(db.DateTime, nullable=False, default=utcnow)

    campaign = db.relationship("Campaign", back_populates="tracking_tokens")
    target = db.relationship("Target", back_populates="tracking_tokens")

    @staticmethod
    def generate_token() -> str:
        """Generate a URL-safe, opaque random token."""
        return secrets.token_urlsafe(32)

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "token": self.token,
            "campaign_id": self.campaign_id,
            "target_id": self.target_id,
            "created_at": iso(self.created_at),
        }

    def __repr__(self) -> str:
        return f"<TrackingToken {self.token[:8]}…>"
