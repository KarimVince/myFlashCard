from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db import get_db
from app.schemas import PublicSettingsOut
from app.settings_store import public_settings as load_public_settings

router = APIRouter(prefix="/settings", tags=["settings"])


@router.get("", response_model=PublicSettingsOut)
def public_settings(db: Session = Depends(get_db)):
    """Feature flags the public site and apps need to know about."""
    return load_public_settings(db)
