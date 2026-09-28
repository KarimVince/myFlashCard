"""Account helpers: password hashing, session and one-time email tokens, auth dependencies."""
import hashlib
import secrets
from datetime import datetime, timedelta, timezone

import bcrypt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.config import settings
from app.db import get_db
from app.models import EmailToken, User, UserSession

SESSION_DAYS = 30
TOKEN_TTL = {"verify": timedelta(hours=48), "reset": timedelta(hours=1)}

# Known services an admin can grant. Add new ones here.
SERVICES = {"premium", "ai_claude"}

_bearer = HTTPBearer(auto_error=False)


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _aware(dt: datetime) -> datetime:
    # SQLite returns naive datetimes; treat them as UTC.
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def check_password(password: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode(), hashed.encode())
    except Exception:
        return False


# ── Sessions ──────────────────────────────────────────────────────────────

def create_session(db: Session, user: User) -> str:
    token = secrets.token_urlsafe(32)
    db.add(UserSession(
        user_id=user.id,
        token_hash=hash_token(token),
        expires_at=utcnow() + timedelta(days=SESSION_DAYS),
    ))
    user.last_login_at = utcnow()
    db.commit()
    return token


def user_from_token(db: Session, token: str) -> User | None:
    sess = db.query(UserSession).filter(UserSession.token_hash == hash_token(token)).first()
    if not sess:
        return None
    if _aware(sess.expires_at) < utcnow():
        db.delete(sess)
        db.commit()
        return None
    return sess.user


def revoke_session(db: Session, token: str) -> None:
    db.query(UserSession).filter(UserSession.token_hash == hash_token(token)).delete()
    db.commit()


def revoke_all_sessions(db: Session, user: User, keep_token: str | None = None) -> None:
    q = db.query(UserSession).filter(UserSession.user_id == user.id)
    if keep_token:
        q = q.filter(UserSession.token_hash != hash_token(keep_token))
    q.delete()


# ── One-time email tokens ─────────────────────────────────────────────────

def create_email_token(db: Session, user: User, purpose: str) -> str:
    # Only the latest token of a purpose stays valid.
    db.query(EmailToken).filter(
        EmailToken.user_id == user.id, EmailToken.purpose == purpose, EmailToken.used_at.is_(None)
    ).delete()
    token = secrets.token_urlsafe(32)
    db.add(EmailToken(
        user_id=user.id,
        purpose=purpose,
        token_hash=hash_token(token),
        expires_at=utcnow() + TOKEN_TTL[purpose],
    ))
    db.commit()
    return token


def consume_email_token(db: Session, token: str, purpose: str) -> User:
    row = db.query(EmailToken).filter(
        EmailToken.token_hash == hash_token(token), EmailToken.purpose == purpose
    ).first()
    if not row or row.used_at or _aware(row.expires_at) < utcnow():
        raise HTTPException(status_code=400, detail="This link is invalid or has expired")
    row.used_at = utcnow()
    return db.get(User, row.user_id)


def mark_verified(user: User) -> None:
    if not user.email_verified_at:
        user.email_verified_at = utcnow()
    if settings.admin_email and user.email == settings.admin_email.strip().lower():
        user.role = "admin"


# ── Dependencies ──────────────────────────────────────────────────────────

def bearer_token(creds: HTTPAuthorizationCredentials | None = Depends(_bearer)) -> str:
    if not creds:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not logged in")
    return creds.credentials


def current_user(token: str = Depends(bearer_token), db: Session = Depends(get_db)) -> User:
    user = user_from_token(db, token)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Session expired — please log in")
    return user
