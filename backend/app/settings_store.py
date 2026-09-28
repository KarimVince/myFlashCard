"""Read and write global feature flags stored in the app_settings table."""
from sqlalchemy.orm import Session

from app.models import AppSetting, Deck

PREMIUM_ENABLED = "premium_enabled"
AI_FREE_MONTHLY = "ai_free_monthly_tokens"
AI_PREMIUM_MONTHLY = "ai_premium_monthly_tokens"
INT_DEFAULTS = {AI_FREE_MONTHLY: 5, AI_PREMIUM_MONTHLY: 15}


def get_flag(db: Session, key: str, default: bool = False) -> bool:
    row = db.get(AppSetting, key)
    return row.value if row else default


def set_flag(db: Session, key: str, value: bool) -> None:
    row = db.get(AppSetting, key)
    if row:
        row.value = value
    else:
        db.add(AppSetting(key=key, value=value))
    db.commit()


def get_int(db: Session, key: str) -> int:
    row = db.get(AppSetting, key)
    return row.number if row and row.number is not None else INT_DEFAULTS[key]


def set_int(db: Session, key: str, value: int) -> None:
    row = db.get(AppSetting, key)
    if row:
        row.number = value
    else:
        db.add(AppSetting(key=key, value=False, number=value))
    db.commit()


def premium_enabled(db: Session) -> bool:
    return get_flag(db, PREMIUM_ENABLED)


def visible_deck_filter(db: Session):
    """Filter for decks shown publicly: public, and free unless premium is active.

    While premium is inactive, premium decks are treated exactly like hidden decks.
    """
    cond = Deck.is_public == True  # noqa: E712
    if not premium_enabled(db):
        cond = cond & (Deck.is_free == True)  # noqa: E712
    return cond
