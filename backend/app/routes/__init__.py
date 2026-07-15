"""Blueprint registration.

Each route module (auth, templates, targets, campaigns, tracking, dashboard,
performance) defines a Flask Blueprint. `register_blueprints` wires them into
the application from the factory. Blueprints are added here as they are built.
"""

from flask import Flask

from .auth import auth_bp
from .templates import templates_bp
from .targets import targets_bp
from .campaigns import campaigns_bp
from .tracking import tracking_bp
from .dashboard import dashboard_bp
from .performance import performance_bp
from .feedback import feedback_bp


def register_blueprints(app: Flask) -> None:
    """Register all application blueprints on the given app."""
    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(templates_bp, url_prefix="/api")
    app.register_blueprint(targets_bp, url_prefix="/api")
    app.register_blueprint(campaigns_bp, url_prefix="/api")
    app.register_blueprint(dashboard_bp, url_prefix="/api")
    # Public, token-scoped recipient performance view (no auth).
    app.register_blueprint(performance_bp, url_prefix="/api")
    # Public, token-scoped educational feedback content (no auth).
    app.register_blueprint(feedback_bp, url_prefix="/api")
    # Public tracking endpoints live at the root (/track/..., /report), not /api.
    app.register_blueprint(tracking_bp)
