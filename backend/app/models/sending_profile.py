"""Sending profile model — reusable SMTP configuration for campaigns."""

from ..extensions import db
from ..utils.time import utcnow, iso
from ..utils.crypto import encrypt_value, decrypt_value


class SendingProfile(db.Model):
    """A named SMTP configuration used to deliver campaign emails.

    The smtp_password_enc column stores a Fernet ciphertext, never the
    plaintext password. Use set_smtp_password / get_smtp_password for access;
    to_dict never exposes the password in any form.
    """

    __tablename__ = "sending_profiles"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False, unique=True)
    smtp_host = db.Column(db.String(255), nullable=False)
    smtp_port = db.Column(db.Integer, nullable=False, default=587)
    # Nullable: some internal SMTP relays do not require authentication.
    smtp_username = db.Column(db.String(255), nullable=True)
    # Stores a Fernet token (ciphertext). NULL when no password is configured.
    smtp_password_enc = db.Column(db.Text, nullable=True)
    from_address = db.Column(db.String(255), nullable=False)
    use_tls = db.Column(db.Boolean, nullable=False, default=True)
    created_at = db.Column(db.DateTime, nullable=False, default=utcnow)

    campaigns = db.relationship("Campaign", back_populates="sending_profile")

    # ------------------------------------------------------------------
    # Password helpers
    # ------------------------------------------------------------------

    def set_smtp_password(self, plaintext: str | None) -> None:
        """Encrypt *plaintext* and store the token. Pass None or "" to clear."""
        if not plaintext:
            self.smtp_password_enc = None
        else:
            self.smtp_password_enc = encrypt_value(plaintext)

    def get_smtp_password(self) -> str | None:
        """Decrypt and return the SMTP password, or None if not set."""
        if self.smtp_password_enc is None:
            return None
        return decrypt_value(self.smtp_password_enc)

    # ------------------------------------------------------------------
    # Serialisation
    # ------------------------------------------------------------------

    def to_dict(self) -> dict:
        """Return a safe public representation — the password is never included."""
        return {
            "id": self.id,
            "name": self.name,
            "smtp_host": self.smtp_host,
            "smtp_port": self.smtp_port,
            "smtp_username": self.smtp_username,
            "from_address": self.from_address,
            "use_tls": self.use_tls,
            "has_password": self.smtp_password_enc is not None,
            "created_at": iso(self.created_at),
        }

    def __repr__(self) -> str:
        return f"<SendingProfile {self.name!r} ({self.smtp_host}:{self.smtp_port})>"
