"""Shared Flask extension instances.

These are instantiated here without an app and bound to the application
inside the app factory (`create_app`) via their `init_app` methods. Keeping
them in a dedicated module avoids circular imports between the factory,
models, and routes.
"""

from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager
from flask_mail import Mail
from flask_cors import CORS

db = SQLAlchemy()
jwt = JWTManager()
mail = Mail()
cors = CORS()
