from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.accounts import (
    bearer_token,
    check_password,
    consume_email_token,
    create_email_token,
    create_session,
    current_user,
    hash_password,
    mark_verified,
    promote_if_admin_email,
    revoke_all_sessions,
    revoke_session,
)
from app.config import settings
from app.db import get_db
from app.email import send_password_reset, send_verification
from app.models import User
from app.ratelimit import rate_limit
from app.settings_store import accounts_enabled
from app.schemas import (
    AuthOut,
    EmailIn,
    LoginIn,
    PasswordChangeIn,
    PasswordConfirmIn,
    ProfileUpdate,
    RegisterIn,
    ResetPasswordIn,
    TokenIn,
    UserOut,
)

router = APIRouter(tags=["accounts"])


def _alias_taken(db: Session, alias: str, exclude_id: int | None = None) -> bool:
    q = db.query(User).filter(User.alias_key == alias.lower())
    if exclude_id:
        q = q.filter(User.id != exclude_id)
    return db.query(q.exists()).scalar()


# ── Auth ──────────────────────────────────────────────────────────────────

@router.post(
    "/auth/register",
    response_model=AuthOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(rate_limit("register", 5, 3600))],
)
def register(body: RegisterIn, db: Session = Depends(get_db)):
    """Create an account, log it in and send a verification email."""
    is_admin_email = bool(settings.admin_email) and body.email == settings.admin_email.strip().lower()
    # The admin can always create their account, even before accounts open to the public.
    if not accounts_enabled(db) and not is_admin_email:
        raise HTTPException(status_code=403, detail="Registration is closed for now")
    if db.query(User).filter(User.email == body.email).first():
        raise HTTPException(status_code=409, detail="An account with this email already exists")
    if _alias_taken(db, body.alias):
        raise HTTPException(status_code=409, detail="This alias is already taken")
    user = User(
        alias=body.alias,
        alias_key=body.alias.lower(),
        email=body.email,
        password_hash=hash_password(body.password),
        role="user",
    )
    db.add(user)
    db.flush()
    send_verification(user.email, user.alias, create_email_token(db, user, "verify"))
    token = create_session(db, user)
    return AuthOut(token=token, user=UserOut.of(user))


@router.post("/auth/login", response_model=AuthOut, dependencies=[Depends(rate_limit("login", 10, 300))])
def login(body: LoginIn, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == body.email).first()
    if not user or not check_password(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Wrong email or password")
    promote_if_admin_email(user)
    token = create_session(db, user)
    return AuthOut(token=token, user=UserOut.of(user))


@router.post("/auth/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(token: str = Depends(bearer_token), db: Session = Depends(get_db)):
    revoke_session(db, token)


@router.post("/auth/verify-email", response_model=UserOut)
def verify_email(body: TokenIn, db: Session = Depends(get_db)):
    user = consume_email_token(db, body.token, "verify")
    mark_verified(user)
    db.commit()
    return UserOut.of(user)


@router.post(
    "/auth/resend-verification",
    status_code=status.HTTP_202_ACCEPTED,
    dependencies=[Depends(rate_limit("resend", 5, 3600))],
)
def resend_verification(user: User = Depends(current_user), db: Session = Depends(get_db)):
    if user.email_verified_at:
        return
    send_verification(user.email, user.alias, create_email_token(db, user, "verify"))


@router.post(
    "/auth/forgot-password",
    status_code=status.HTTP_202_ACCEPTED,
    dependencies=[Depends(rate_limit("forgot", 5, 3600))],
)
def forgot_password(body: EmailIn, db: Session = Depends(get_db)):
    """Always 202, so the response doesn't reveal whether the email has an account."""
    user = db.query(User).filter(User.email == body.email).first()
    if user:
        send_password_reset(user.email, user.alias, create_email_token(db, user, "reset"))


@router.post("/auth/reset-password", status_code=status.HTTP_204_NO_CONTENT)
def reset_password(body: ResetPasswordIn, db: Session = Depends(get_db)):
    user = consume_email_token(db, body.token, "reset")
    user.password_hash = hash_password(body.password)
    # Receiving the email proves ownership of the address.
    mark_verified(user)
    revoke_all_sessions(db, user)
    db.commit()


# ── Current user ──────────────────────────────────────────────────────────

@router.get("/me", response_model=UserOut)
def me(user: User = Depends(current_user)):
    return UserOut.of(user)


@router.patch("/me", response_model=UserOut)
def update_me(body: ProfileUpdate, user: User = Depends(current_user), db: Session = Depends(get_db)):
    if _alias_taken(db, body.alias, exclude_id=user.id):
        raise HTTPException(status_code=409, detail="This alias is already taken")
    user.alias = body.alias
    user.alias_key = body.alias.lower()
    db.commit()
    return UserOut.of(user)


@router.post("/me/password", status_code=status.HTTP_204_NO_CONTENT)
def change_password(
    body: PasswordChangeIn,
    token: str = Depends(bearer_token),
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    if not check_password(body.current_password, user.password_hash):
        raise HTTPException(status_code=403, detail="Current password is wrong")
    user.password_hash = hash_password(body.new_password)
    # Sign out other devices, keep this one.
    revoke_all_sessions(db, user, keep_token=token)
    db.commit()


@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
def delete_me(body: PasswordConfirmIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    """Permanently delete the account and everything tied to it."""
    if not check_password(body.password, user.password_hash):
        raise HTTPException(status_code=403, detail="Password is wrong")
    db.delete(user)
    db.commit()
