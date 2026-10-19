import re
import unicodedata

import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import Response
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.accounts import PREMIUM_DECK_TIERS, optional_user
from app.auth import legacy_password_ok
from app.db import get_db
from app.models import Category, Deck, User
from app.schemas import DeckPublicOut
from app.settings_store import premium_enabled, visible_deck_filter

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


def _check_access(deck: Deck, user: User | None, db: Session) -> None:
    """Free decks are open to everyone; premium decks need Silver, Gold or admin (while Premium is on)."""
    if deck.is_free:
        return
    if user and (user.is_admin or (premium_enabled(db) and user.tier in PREMIUM_DECK_TIERS)):
        return
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Premium decks are for Silver and Gold members",
    )


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
async def deck_content(
    deck_id: int,
    db: Session = Depends(get_db),
    user: User | None = Depends(optional_user),
    creds: HTTPAuthorizationCredentials | None = Depends(HTTPBearer(auto_error=False)),
):
    """Fetch and return deck JSON server-side — avoids R2 CORS restrictions.
    Premium decks need a logged-in Silver or Gold member or an admin (session token,
    or the admin password while it's still in use)."""
    deck = _public_deck_or_404(deck_id, db)
    if not deck.is_free and user is None and creds and legacy_password_ok(creds.credentials):
        return await _fetch(deck)
    _check_access(deck, user, db)
    return await _fetch(deck)


async def _fetch(deck: Deck, headers: dict | None = None) -> Response:
    async with httpx.AsyncClient() as client:
        r = await client.get(deck.public_url, timeout=10)
    if r.status_code != 200:
        raise HTTPException(status_code=502, detail="Could not fetch deck file")
    return Response(content=r.content, media_type="application/json", headers=headers)


def _download_name(title: str) -> str:
    """'Crêpes à l'orange' → 'crepes-a-l-orange.json' (plain ASCII for every browser)."""
    ascii_title = unicodedata.normalize("NFKD", title).encode("ascii", "ignore").decode()
    slug = re.sub(r"[^a-z0-9]+", "-", ascii_title.lower()).strip("-")
    return f"{slug or 'deck'}.json"


@router.get("/{deck_id}/download")
async def download_deck(deck_id: int, db: Session = Depends(get_db)):
    """
    Download the deck's JSON file. Only free decks; premium decks return 403.

    Served from here with Content-Disposition: attachment rather than redirecting to storage:
    browsers ignore the link's `download` attribute for another site, and would show the JSON
    as a page instead of saving it.
    """
    deck = _public_deck_or_404(deck_id, db)
    if not deck.is_free:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This deck requires access — free decks only",
        )
    response = await _fetch(deck, {
        "Content-Disposition": f'attachment; filename="{_download_name(deck.title)}"',
        "Cache-Control": "no-store",
    })
    deck.downloads += 1
    db.commit()
    return response
