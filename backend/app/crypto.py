"""Encrypt secrets stored in the database (AI provider API keys) with SECRETS_KEY."""
import base64
import hashlib
import logging

from cryptography.fernet import Fernet, InvalidToken

from app.config import settings

log = logging.getLogger("myflashcard.crypto")
_warned = False


def _fernet() -> Fernet:
    key = settings.secrets_key.strip()
    if key:
        try:
            return Fernet(key.encode())
        except ValueError:
            raise RuntimeError(
                "SECRETS_KEY is not a valid key — it must be 44 characters, made with "
                "python -c \"from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())\""
            )
    if not settings.database_url.startswith("sqlite"):
        raise RuntimeError("SECRETS_KEY is not set — required to store API keys in production")
    # Local dev only: a stable key derived from the DB URL, so no setup is needed.
    global _warned
    if not _warned:
        log.warning("SECRETS_KEY not set — using a development-only key")
        _warned = True
    digest = hashlib.sha256(f"dev-only:{settings.database_url}".encode()).digest()
    return Fernet(base64.urlsafe_b64encode(digest))


def encrypt(plain: str) -> str:
    return _fernet().encrypt(plain.encode()).decode()


def decrypt(token: str) -> str | None:
    try:
        return _fernet().decrypt(token.encode()).decode()
    except (InvalidToken, ValueError, RuntimeError):
        log.error("Could not decrypt a stored secret — was SECRETS_KEY changed?")
        return None


def mask(plain: str) -> str:
    return f"••••{plain[-4:]}" if len(plain) > 8 else "••••"
