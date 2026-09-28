from sqlalchemy import func
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Category, Deck
from app.schemas import CategoryOut
from app.settings_store import visible_deck_filter

router = APIRouter(prefix="/categories", tags=["categories"])


@router.get("", response_model=list[CategoryOut])
def list_categories(db: Session = Depends(get_db)):
    """Return all categories ordered by public deck count desc, with deck_count included."""
    rows = (
        db.query(Category, func.count(Deck.id).label("dc"))
        .outerjoin(
            Deck,
            (Deck.category_id == Category.id) & visible_deck_filter(db),
        )
        .group_by(Category.id)
        .order_by(func.count(Deck.id).desc(), Category.label)
        .all()
    )
    result = []
    for cat, count in rows:
        out = CategoryOut.model_validate(cat)
        out.deck_count = count
        result.append(out)
    return result
