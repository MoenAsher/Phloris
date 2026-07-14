"""Time helpers.

All timestamps in the system are stored as naive UTC datetimes (per the
project convention: keep everything in UTC, format for display on the
frontend only). `utcnow` is used as the default for `created_at`/`timestamp`
columns and keeps metric arithmetic (timestamp subtraction) simple.
"""

from datetime import datetime, timezone


def utcnow() -> datetime:
    """Return the current time as a naive UTC datetime."""
    return datetime.now(timezone.utc).replace(tzinfo=None)


def iso(value: datetime | None) -> str | None:
    """Serialise a datetime to an ISO-8601 string (or None)."""
    return value.isoformat() if value is not None else None
