import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import RedirectResponse, Response
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Category, Deck
from app.schemas import DeckPublicOut
from app.settings_store import visible_deck_filter

router = APIRouter(prefix="/decks", tags=["decks"])


def _public_deck_or_404(deck_id: int, db: Session) -> Deck:
    deck = (
        db.query(Deck)
        .filter(Deck.id == deck_id, visible_deck_filter(db))
        .first()
    )
    if not deck:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Deck not found")
    return deck


@router.get("", response_model=list[DeckPublicOut])
def list_decks(
    category: str | None = None,
    lang: str | None = None,
    db: Session = Depends(get_db),
):
    """List all public decks, optionally filtered by category slug or language."""
    q = db.query(Deck).filter(visible_deck_filter(db))
    if category:
        cat = db.query(Category).filter(Category.slug == category).first()
        if not cat:
            raise HTTPException(status_code=404, detail="Category not found")
        q = q.filter(Deck.category_id == cat.id)
    if lang:
        q = q.filter(Deck.language == lang)
    return q.order_by(Deck.created_at.desc()).all()


@router.get("/{deck_id}", response_model=DeckPublicOut)
def get_deck(deck_id: int, db: Session = Depends(get_db)):
    """Return metadata for a single public deck."""
    return _public_deck_or_404(deck_id, db)


@router.get("/{deck_id}/content")
async def deck_content(deck_id: int, db: Session = Depends(get_db)):
    """Fetch and return deck JSON server-side — avoids R2 CORS restrictions."""
    deck = _public_deck_or_404(deck_id, db)
    if not deck.is_free:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Free decks only")
    async with httpx.AsyncClient() as client:
        r = await client.get(deck.public_url, timeout=10)
    if r.status_code != 200:
        raise HTTPException(status_code=502, detail="Could not fetch deck file")
    return Response(content=r.content, media_type="application/json")


@router.get("/{deck_id}/download")
def download_deck(deck_id: int, db: Session = Depends(get_db)):
    """
    Redirect to the deck's JSON file.
    Only free decks are downloadable; premium decks return 403.
    """
    deck = _public_deck_or_404(deck_id, db)
    if not deck.is_free:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This deck requires access — free decks only",
        )
    deck.downloads += 1
    db.commit()
    return RedirectResponse(url=deck.public_url, status_code=status.HTTP_302_FOUND)
