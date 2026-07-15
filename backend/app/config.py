"""Application configuration loaded from environment variables.

Values are read from the process environment, which is populated from a
`.env` file by python-dotenv (see `run.py`). See `.env.example` for the full
list of supported variables and their defaults.
"""

import os

# Absolute path to the backend/ directory (parent of the app package). Used to
# anchor relative SQLite paths so the DB file location is independent of the
# current working directory.
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), os.pardir))


def _as_bool(value: str | None, default: bool = False) -> bool:
    """Interpret common truthy string values from the environment."""
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def _resolve_sqlite_uri(uri: str) -> str:
    """Anchor a relative sqlite path to BASE_DIR and return an absolute URI.

    Flask-SQLAlchemy 3.x resolves relative sqlite paths against the app's
    instance folder, which would turn `sqlite:///instance/app.db` into a
    nested `instance/instance/app.db`. Resolving to an absolute path here
    keeps the DB at the documented `backend/instance/app.db` location.
    """
    prefix = "sqlite:///"
    if uri.startswith(prefix):
        path = uri[len(prefix):]
        if path and not path.startswith(":") and not os.path.isabs(path):
            abs_path = os.path.join(BASE_DIR, path)
            os.makedirs(os.path.dirname(abs_path), exist_ok=True)
            return prefix + abs_path
    return uri


class Config:
    """Base configuration shared across environments."""

    # Flask
    SECRET_KEY = os.environ.get("SECRET_KEY", "change-me-to-a-random-string")

    # Database
    SQLALCHEMY_DATABASE_URI = _resolve_sqlite_uri(
        os.environ.get("DATABASE_URL", "sqlite:///instance/app.db")
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # JWT
    JWT_SECRET_KEY = os.environ.get(
        "JWT_SECRET_KEY", "change-me-to-a-different-random-string"
    )

    # Mail (Mailtrap Email Testing sandbox)
    MAIL_SERVER = os.environ.get("MAIL_SERVER", "sandbox.smtp.mailtrap.io")
    MAIL_PORT = int(os.environ.get("MAIL_PORT", 2525))
    MAIL_USERNAME = os.environ.get("MAIL_USERNAME")
    MAIL_PASSWORD = os.environ.get("MAIL_PASSWORD")
    MAIL_USE_TLS = _as_bool(os.environ.get("MAIL_USE_TLS"), default=True)
    MAIL_DEFAULT_SENDER = os.environ.get(
        "MAIL_DEFAULT_SENDER", "security-team@simulation.local"
    )
    # Seconds to pause between individual sends during a launch. Mailtrap's
    # free Email Testing tier rate-limits to roughly one message per second;
    # the default spaces sends out to avoid tripping it. Set to 0 for a
    # production SMTP provider with higher throughput.
    MAIL_SEND_DELAY = float(os.environ.get("MAIL_SEND_DELAY", "1.0"))

    # Tracking / CORS
    TRACKING_BASE_URL = os.environ.get("TRACKING_BASE_URL", "http://localhost:5001")
    FRONTEND_ORIGIN = os.environ.get("FRONTEND_ORIGIN", "http://localhost:5173")
