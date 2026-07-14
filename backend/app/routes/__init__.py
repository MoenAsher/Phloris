"""Blueprint registration.

Each route module (auth, templates, targets, campaigns, tracking, dashboard,
performance) defines a Flask Blueprint. `register_blueprints` wires them into
the application from the factory. Blueprints are added here as they are built.
"""

from flask import Flask

from .auth import auth_bp
from .templates import templates_bp
from .targets import targets_bp


def register_blueprints(app: Flask) -> None:
    """Register all application blueprints on the given app."""
    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(templates_bp, url_prefix="/api")
    app.register_blueprint(targets_bp, url_prefix="/api")
