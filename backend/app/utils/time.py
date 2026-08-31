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
    """Serialise a datetime to an ISO-8601 string (or None).

    Appends 'Z' to mark the value as UTC so browsers parse it correctly and
    convert to local time when displayed via toLocaleString().
    """
    return value.isoformat() + "Z" if value is not None else None


def parse_utc(value: str) -> datetime:
    """Parse an ISO-8601 string into a naive UTC datetime.

    Accepts both aware inputs (offset or trailing 'Z', e.g. the frontend's
    `Date.toISOString()`) and naive inputs (assumed already UTC). The returned
    value is naive UTC to match how timestamps are stored throughout the system.
    Raises ValueError if the string is not a valid ISO-8601 datetime.
    """
    text = value.strip()
    # Python's fromisoformat accepts 'Z' only from 3.11+, but normalise anyway
    # for safety across interpreters.
    if text.endswith("Z"):
        text = text[:-1] + "+00:00"
    parsed = datetime.fromisoformat(text)
    if parsed.tzinfo is not None:
        parsed = parsed.astimezone(timezone.utc).replace(tzinfo=None)
    return parsed
