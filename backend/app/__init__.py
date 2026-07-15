"""Flask application factory.

Builds and configures the Flask app, binds shared extensions, and registers
blueprints. Import this via `from app import create_app`.
"""

from flask import Flask, jsonify

from .config import Config
from .extensions import db, jwt, mail, cors


def create_app(config_class: type = Config) -> Flask:
    """Create and configure a Flask application instance."""
    app = Flask(__name__)
    app.config.from_object(config_class)

    _init_extensions(app)
    _register_health_check(app)
    _register_cli(app)

    # Import models so their tables are registered on db.metadata.
    with app.app_context():
        from . import models  # noqa: F401

    from .routes import register_blueprints

    register_blueprints(app)

    return app


def _init_extensions(app: Flask) -> None:
    """Bind shared extension instances to the application."""
    db.init_app(app)
    jwt.init_app(app)
    _register_jwt_error_handlers()
    mail.init_app(app)
    cors.init_app(app, origins=[app.config["FRONTEND_ORIGIN"]])


def _register_jwt_error_handlers() -> None:
    """Make JWT auth failures use the standard `{"error": ...}` envelope."""

    @jwt.unauthorized_loader
    def _missing_token(reason):
        return jsonify({"error": reason}), 401

    @jwt.invalid_token_loader
    def _invalid_token(_reason):
        # A malformed/invalid credential is an authentication failure (401),
        # consistent with the missing-token and expired-token handlers, rather
        # than Flask-JWT-Extended's default 422.
        return jsonify({"error": "invalid token"}), 401

    @jwt.expired_token_loader
    def _expired_token(_header, _payload):
        return jsonify({"error": "token has expired"}), 401


def _register_health_check(app: Flask) -> None:
    """Register a lightweight health-check endpoint."""

    @app.get("/api/health")
    def health():
        return jsonify({"data": {"status": "ok"}}), 200


def _register_cli(app: Flask) -> None:
    """Register custom Flask CLI commands."""

    @app.cli.command("init-db")
    def init_db_command():
        """Create the database tables (generates the SQLite file)."""
        from .models import init_db

        init_db()
        print("Initialised the database.")
