import json

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.ai.service import try_key
from app.api.admin import create_library_deck
from app.auth import verify_admin_token
from app.config import settings
from app.crypto import decrypt, encrypt, mask
from app.db import get_db
from app.models import AIProvider, Generation
from app.schemas import (
    AdminAIOut,
    AdminGenerationOut,
    AdminProviderOut,
    AllowancesUpdate,
    DeckOut,
    ProviderTestOut,
    ProviderUpdate,
    PublishIn,
)
from app.settings_store import AI_GOLD_MONTHLY, AI_SILVER_TOTAL, get_int, set_int

router = APIRouter(prefix="/admin/ai", tags=["admin"], dependencies=[Depends(verify_admin_token)])


def _provider_out(p: AIProvider) -> AdminProviderOut:
    plain = decrypt(p.api_key_enc) if p.api_key_enc else None
    return AdminProviderOut(
        id=p.id, label=p.label, enabled=p.enabled, is_default=p.is_default, model=p.model,
        token_cost=p.token_cost, base_url=p.base_url,
        has_key=bool(plain), key_hint=mask(plain) if plain else None,
    )


def _provider_or_404(provider_id: str, db: Session) -> AIProvider:
    p = db.get(AIProvider, provider_id)
    if not p:
        raise HTTPException(status_code=404, detail="Unknown provider")
    return p


def _overview(db: Session) -> AdminAIOut:
    providers = db.query(AIProvider).order_by(AIProvider.sort_order).all()
    return AdminAIOut(
        providers=[_provider_out(p) for p in providers],
        silver_total=get_int(db, AI_SILVER_TOTAL),
        gold_monthly=get_int(db, AI_GOLD_MONTHLY),
        secrets_key_configured=bool(settings.secrets_key.strip()),
    )


@router.get("", response_model=AdminAIOut)
def admin_ai(db: Session = Depends(get_db)):
    """Providers (keys masked) and token allowances."""
    return _overview(db)


@router.patch("/providers/{provider_id}", response_model=AdminProviderOut)
def admin_update_provider(provider_id: str, body: ProviderUpdate, db: Session = Depends(get_db)):
    p = _provider_or_404(provider_id, db)
    if body.api_key is not None:
        key = body.api_key.strip()
        try:
            p.api_key_enc = encrypt(key) if key else None
        except RuntimeError as exc:
            raise HTTPException(status_code=500, detail=str(exc))
    if body.model is not None:
        if not body.model.strip():
            raise HTTPException(status_code=422, detail="Model can't be empty")
        p.model = body.model.strip()
    if body.token_cost is not None:
        p.token_cost = body.token_cost
    if body.base_url is not None:
        if not p.base_url:
            raise HTTPException(status_code=422, detail="This provider has a fixed address")
        if not body.base_url.strip().startswith("https://"):
            raise HTTPException(status_code=422, detail="The API address must start with https://")
        p.base_url = body.base_url.strip().rstrip("/")
    if body.enabled is not None:
        p.enabled = body.enabled
    if body.is_default:
        for other in db.query(AIProvider).all():
            other.is_default = other.id == p.id
    if p.enabled and not p.api_key_enc:
        raise HTTPException(status_code=422, detail="No API key saved yet — paste the key and press Save, then switch the provider on")
    db.commit()
    db.refresh(p)
    return _provider_out(p)


@router.put("/allowances", response_model=AdminAIOut)
def admin_set_allowances(body: AllowancesUpdate, db: Session = Depends(get_db)):
    set_int(db, AI_SILVER_TOTAL, body.silver_total)
    set_int(db, AI_GOLD_MONTHLY, body.gold_monthly)
    return _overview(db)


@router.post("/providers/{provider_id}/test", response_model=ProviderTestOut)
async def admin_test_provider(provider_id: str, db: Session = Depends(get_db)):
    """Generate a tiny deck to check the key and model work. Costs the provider a little; no user tokens."""
    p = _provider_or_404(provider_id, db)
    key = decrypt(p.api_key_enc) if p.api_key_enc else None
    if not key:
        return ProviderTestOut(ok=False, message="No API key saved", duration_ms=0)
    ok, message, duration = await try_key(db, p, key)
    return ProviderTestOut(ok=ok, message=message, duration_ms=duration)


@router.get("/generations", response_model=list[AdminGenerationOut])
def admin_generations(limit: int = 100, status: str | None = None, db: Session = Depends(get_db)):
    """Recent generations across all members, for monitoring and moderation."""
    q = db.query(Generation)
    if status:
        q = q.filter(Generation.status == status)
    rows = q.order_by(Generation.created_at.desc(), Generation.id.desc()).limit(min(limit, 500)).all()
    return [
        AdminGenerationOut(
            id=g.id, user_alias=g.user.alias, user_email=g.user.email,
            category_label=g.category.label if g.category else None,
            provider=g.provider, model=g.model, key_source=g.key_source, description=g.description, status=g.status,
            title=g.title, error=g.error, tokens_spent=g.tokens_spent, duration_ms=g.duration_ms,
            created_at=g.created_at,
        )
        for g in rows
    ]


@router.post("/generations/{gen_id}/publish", response_model=DeckOut, status_code=201)
def admin_publish_generation(gen_id: int, body: PublishIn, db: Session = Depends(get_db)):
    """Add an AI-generated deck to the public library (stored like an uploaded deck)."""
    gen = db.get(Generation, gen_id)
    if not gen or gen.status != "success" or not gen.deck_json:
        raise HTTPException(status_code=404, detail="Deck not found")
    if not gen.category:
        raise HTTPException(status_code=422, detail="This deck's type no longer exists")
    if gen.published_deck_id:
        raise HTTPException(status_code=409, detail="This deck is already in the library")
    deck_json = {**gen.deck_json, "deckTitle": body.title}
    deck = create_library_deck(
        db, gen.category, json.dumps(deck_json, ensure_ascii=False, indent=2).encode(),
        title=body.title, description=body.description, author=gen.user.alias,
        language=body.language, is_free=body.is_free,
    )
    gen.published_deck_id = deck.id
    db.commit()
    db.refresh(deck)
    return deck
