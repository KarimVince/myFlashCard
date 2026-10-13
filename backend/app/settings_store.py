"""Read and write global feature flags stored in the app_settings table."""
from sqlalchemy.orm import Session

from app.models import AppSetting, Deck

PREMIUM_ENABLED = "premium_enabled"
ACCOUNTS_ENABLED = "accounts_enabled"  # public registration + account UI (off until launch)
AI_ENABLED = "ai_enabled"              # AI deck generation (off until launch; needs accounts)
AI_SILVER_TOTAL = "ai_silver_total_tokens"     # Silver: shared-AI decks in total (never resets)
AI_GOLD_MONTHLY = "ai_gold_monthly_tokens"     # Gold: shared-AI decks per month
INT_DEFAULTS = {AI_SILVER_TOTAL: 3, AI_GOLD_MONTHLY: 10}


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


def accounts_enabled(db: Session) -> bool:
    return get_flag(db, ACCOUNTS_ENABLED)


def ai_enabled(db: Session) -> bool:
    return get_flag(db, AI_ENABLED)


def visible_deck_filter(db: Session):
    """Filter for decks shown publicly: public, and free unless premium is active.

    While premium is inactive, premium decks are treated exactly like hidden decks.
    """
    cond = Deck.is_public == True  # noqa: E712
    if not premium_enabled(db):
        cond = cond & (Deck.is_free == True)  # noqa: E712
    return cond


def public_settings(db: Session):
    from app.schemas import PublicSettingsOut

    return PublicSettingsOut(
        premium_enabled=premium_enabled(db),
        accounts_enabled=accounts_enabled(db),
        ai_enabled=ai_enabled(db),
    )
