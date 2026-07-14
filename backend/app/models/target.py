"""Target group and individual target models."""

from ..extensions import db
from ..utils.time import utcnow, iso


class TargetGroup(db.Model):
    """A named collection of targets."""

    __tablename__ = "target_groups"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    description = db.Column(db.String(500), nullable=True)
    created_at = db.Column(db.DateTime, nullable=False, default=utcnow)

    # Deleting a group removes its targets.
    targets = db.relationship(
        "Target",
        back_populates="group",
        cascade="all, delete-orphan",
    )
    campaigns = db.relationship("Campaign", back_populates="target_group")

    def to_dict(self, include_targets: bool = False) -> dict:
        data = {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "target_count": len(self.targets),
            "created_at": iso(self.created_at),
        }
        if include_targets:
            data["targets"] = [t.to_dict() for t in self.targets]
        return data

    def __repr__(self) -> str:
        return f"<TargetGroup {self.name}>"


class Target(db.Model):
    """An individual email recipient."""

    __tablename__ = "targets"

    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), nullable=False, index=True)
    first_name = db.Column(db.String(255), nullable=True)
    last_name = db.Column(db.String(255), nullable=True)
    target_group_id = db.Column(
        db.Integer, db.ForeignKey("target_groups.id"), nullable=False
    )
    created_at = db.Column(db.DateTime, nullable=False, default=utcnow)

    group = db.relationship("TargetGroup", back_populates="targets")
    events = db.relationship(
        "Event", back_populates="target", cascade="all, delete-orphan"
    )
    tracking_tokens = db.relationship(
        "TrackingToken", back_populates="target", cascade="all, delete-orphan"
    )

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "email": self.email,
            "first_name": self.first_name,
            "last_name": self.last_name,
            "target_group_id": self.target_group_id,
            "created_at": iso(self.created_at),
        }

    def __repr__(self) -> str:
        return f"<Target {self.email}>"
