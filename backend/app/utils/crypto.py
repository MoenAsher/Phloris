"""Symmetric encryption helpers for sensitive config values stored in the DB.

Uses Fernet (AES-128-CBC + HMAC-SHA256) from the `cryptography` package.
The key is read from the SMTP_ENCRYPTION_KEY environment variable at import time.

Key generation (run once, store the result in .env — never commit it):
    python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"

WARNING: rotating the key requires re-encrypting every smtp_password_enc value
in the database before the old key is removed. There is no automatic migration.
"""

import os

from cryptography.fernet import Fernet, InvalidToken  # noqa: F401 — re-exported for callers

_raw_key = os.environ.get("SMTP_ENCRYPTION_KEY", "")
_fernet: Fernet | None = Fernet(_raw_key.encode()) if _raw_key else None


def encrypt_value(plaintext: str) -> str:
    """Encrypt *plaintext* and return a URL-safe Fernet token string.

    Raises RuntimeError if SMTP_ENCRYPTION_KEY is not configured.
    """
    if _fernet is None:
        raise RuntimeError(
            "SMTP_ENCRYPTION_KEY is not set. "
            "Generate one with: "
            'python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"'
        )
    return _fernet.encrypt(plaintext.encode()).decode()


def decrypt_value(token: str) -> str:
    """Decrypt a Fernet token and return the original plaintext.

    Raises RuntimeError if the key is missing.
    Raises cryptography.fernet.InvalidToken if the token is malformed or was
    encrypted with a different key — callers should surface this as a 500.
    """
    if _fernet is None:
        raise RuntimeError("SMTP_ENCRYPTION_KEY is not set.")
    return _fernet.decrypt(token.encode()).decode()
