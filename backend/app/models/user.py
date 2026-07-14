"""Admin user model."""

from werkzeug.security import generate_password_hash, check_password_hash

from ..extensions import db
from ..utils.time import utcnow, iso


class User(db.Model):
    """Admin account for the management interface."""

    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, nullable=False, default=utcnow)

    def set_password(self, password: str) -> None:
        """Hash and store a password using Werkzeug PBKDF2."""
        self.password_hash = generate_password_hash(password, method="pbkdf2:sha256")

    def check_password(self, password: str) -> bool:
        """Verify a password against the stored hash."""
        return check_password_hash(self.password_hash, password)

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "email": self.email,
            "created_at": iso(self.created_at),
        }

    def __repr__(self) -> str:
        return f"<User {self.email}>"
