"""Phishing email template model."""

import enum

from ..extensions import db
from ..utils.time import utcnow, iso


class Difficulty(enum.Enum):
    """NIST Phish Scale-inspired manual difficulty tag."""

    easy = "easy"
    medium = "medium"
    hard = "hard"


class Template(db.Model):
    """A reusable phishing email template.

    `body_html` supports the placeholders `{{first_name}}`, `{{last_name}}`,
    `{{tracking_link}}`, and `{{report_link}}`, substituted at send time.
    """

    __tablename__ = "templates"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    subject = db.Column(db.String(255), nullable=False)
    body_html = db.Column(db.Text, nullable=False)
    difficulty_level = db.Column(
        db.Enum(Difficulty), nullable=False, default=Difficulty.medium
    )
    feedback_notes = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, nullable=False, default=utcnow)

    # A template can be reused across many campaigns.
    campaigns = db.relationship("Campaign", back_populates="template")

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "subject": self.subject,
            "body_html": self.body_html,
            "difficulty_level": self.difficulty_level.value,
            "feedback_notes": self.feedback_notes,
            "created_at": iso(self.created_at),
        }

    def __repr__(self) -> str:
        return f"<Template {self.name} ({self.difficulty_level.value})>"
