"""Application entry point.

Loads environment variables from `.env`, creates the Flask app via the
factory, and runs the development server. Start with `python run.py`.

The port is read from the FLASK_RUN_PORT environment variable and defaults
to 5001 (port 5000 is occupied by macOS AirPlay Receiver).
"""

import os

from dotenv import load_dotenv

load_dotenv()

from app import create_app  # noqa: E402  (import after env is loaded)

app = create_app()


if __name__ == "__main__":
    port = int(os.environ.get("FLASK_RUN_PORT", 5001))
    app.run(host="0.0.0.0", port=port, debug=True)
