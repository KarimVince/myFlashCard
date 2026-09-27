import bcrypt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.config import settings

bearer_scheme = HTTPBearer()


def verify_admin_token(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> None:
    """Raise 401 if the bearer token doesn't match the stored admin hash."""
    token = credentials.credentials.encode()
    stored = settings.admin_password_hash.encode()
    try:
        ok = bcrypt.checkpw(token, stored)
    except Exception:
        ok = False
    if not ok:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid admin token",
        )


def hash_password(password: str) -> str:
    """Utility for generating ADMIN_PASSWORD_HASH from a plaintext password."""
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
