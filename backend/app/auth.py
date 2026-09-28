import bcrypt
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.accounts import user_from_token
from app.config import settings
from app.db import get_db

bearer_scheme = HTTPBearer()


def _legacy_password_ok(token: str) -> bool:
    """Transition: the old shared admin password (ADMIN_PASSWORD_HASH) still works if set."""
    if not settings.admin_password_hash:
        return False
    try:
        return bcrypt.checkpw(token.encode(), settings.admin_password_hash.encode())
    except Exception:
        return False


def verify_admin_token(
    request: Request,
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> None:
    """Allow an admin user's session token, or the legacy admin password. Raise 401 otherwise."""
    token = credentials.credentials
    user = user_from_token(db, token)
    if user and user.is_admin:
        request.state.admin_user = user
        return
    if _legacy_password_ok(token):
        request.state.admin_user = None
        return
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid admin token",
    )


def hash_password(password: str) -> str:
    """Utility for generating ADMIN_PASSWORD_HASH from a plaintext password."""
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
