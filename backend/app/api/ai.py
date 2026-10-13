from datetime import date

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.accounts import current_user, utcnow
from app.ai.providers import ProviderError
from app.ai.service import (
    OWN,
    SHARED,
    GenerationFailed,
    ai_access,
    generate_deck,
    get_balance,
    provider_unavailable_reason,
    try_key,
)
from app.crypto import decrypt, encrypt, mask
from app.db import get_db
from app.models import AIProvider, Category, Generation, User, UserAIKey
from app.ratelimit import rate_limit
from app.schemas import (
    AIOptionsOut,
    BalanceOut,
    GenerateIn,
    GenerateOut,
    GenerationOut,
    GenerationSummary,
    KeyProviderOut,
    OwnKeyIn,
    OwnKeyOut,
    ProviderOption,
    ProviderTestOut,
)

router = APIRouter(tags=["ai"])

# Users with a generation in progress — stops parallel requests from double-spending.
_in_flight: set[int] = set()


def _next_reset() -> str:
    today = utcnow().date()
    return (date(today.year + 1, 1, 1) if today.month == 12 else date(today.year, today.month + 1, 1)).isoformat()


def balance_out(db: Session, user: User) -> BalanceOut:
    b = get_balance(db, user)
    return BalanceOut(
        allowance=b.allowance,
        used=b.used,
        left=b.left,
        extra=b.extra,
        total=b.total,
        period=b.period,
        resets_on=_next_reset() if b.period == "month" else None,
        unlimited=b.unlimited,
    )


def _providers(db: Session) -> list[AIProvider]:
    return db.query(AIProvider).order_by(AIProvider.sort_order).all()


def own_key_out(key: UserAIKey | None) -> OwnKeyOut | None:
    if not key:
        return None
    plain = decrypt(key.api_key_enc)
    return OwnKeyOut(
        provider=key.provider_id,
        provider_label=key.provider.label,
        model=key.provider.model,
        key_hint=mask(plain) if plain else None,
        last_test_ok=key.last_test_ok,
        last_tested_at=key.last_tested_at,
    )


@router.get("/ai/options", response_model=AIOptionsOut)
def ai_options(user: User = Depends(current_user), db: Session = Depends(get_db)):
    """What the Create screen and AI settings page need: plan, balance, the site's AIs, own key."""
    access = ai_access(db, user)
    providers = _providers(db)
    options = []
    if access.shared:
        for p in providers:
            reason = provider_unavailable_reason(p)
            options.append(ProviderOption(
                id=p.id, label=p.label, token_cost=p.token_cost, is_default=p.is_default,
                available=reason is None, reason=reason,
            ))
    return AIOptionsOut(
        email_verified=user.email_verified_at is not None,
        tier=user.tier,
        is_admin=user.is_admin,
        can_generate=access.allowed,
        reason=access.reason,
        shared=access.shared,
        own_key_allowed=access.own,
        own_key=own_key_out(user.ai_key),
        balance=balance_out(db, user),
        providers=options,
        key_providers=[KeyProviderOut(id=p.id, label=p.label, model=p.model) for p in providers],
    )


def _pick_shared_provider(providers: list[AIProvider], wanted: str | None) -> AIProvider | None:
    if wanted:
        provider = next((p for p in providers if p.id == wanted), None)
        if not provider:
            raise HTTPException(status_code=404, detail="Unknown AI provider")
        return provider
    usable = [p for p in providers if provider_unavailable_reason(p) is None]
    return next((p for p in usable if p.is_default), usable[0] if usable else None)


@router.post(
    "/ai/generate",
    response_model=GenerateOut,
    dependencies=[Depends(rate_limit("generate", 10, 3600))],
)
async def ai_generate(body: GenerateIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    """Generate a deck with AI, with the site's key (shared) or the member's own key.
    Shared generations spend tokens only if a valid deck comes back."""
    access = ai_access(db, user)
    if not access.allowed:
        raise HTTPException(status_code=403, detail=access.reason)
    if not user.email_verified_at:
        raise HTTPException(status_code=403, detail="Confirm your email before generating decks with AI")

    category = db.query(Category).filter(Category.slug == body.category_slug).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")

    own_key = user.ai_key
    shared_provider = _pick_shared_provider(_providers(db), body.provider) if access.shared else None
    source = body.source
    if source is None:
        # Shared AI while the allowance lasts, then the member's own key.
        shared_ok = (
            shared_provider is not None
            and provider_unavailable_reason(shared_provider) is None
            and (access.unlimited or get_balance(db, user).total >= shared_provider.token_cost)
        )
        source = SHARED if shared_ok or not own_key else OWN

    if source == OWN:
        if not own_key:
            raise HTTPException(status_code=403, detail="Add your own API key in AI settings first")
        provider = own_key.provider
    else:
        if not access.shared:
            raise HTTPException(
                status_code=403,
                detail="Your plan uses your own API key — add it in AI settings",
            )
        provider = shared_provider
        if not provider:
            raise HTTPException(status_code=503, detail="AI generation is not available right now")
        reason = provider_unavailable_reason(provider)
        if reason:
            raise HTTPException(status_code=403, detail=f"{provider.label}: {reason}")
        if not access.unlimited and get_balance(db, user).total < provider.token_cost:
            b = get_balance(db, user)
            when = f"your allowance renews on {_next_reset()}" if b.period == "month" else "your Silver decks are used up"
            raise HTTPException(
                status_code=status.HTTP_402_PAYMENT_REQUIRED,
                detail=f"No shared AI decks left — {when}"
                + (". You can still use your own API key." if own_key else ""),
            )

    if user.id in _in_flight:
        raise HTTPException(status_code=409, detail="A deck is already being generated — please wait")
    _in_flight.add(user.id)
    try:
        gen = await generate_deck(db, user, category, provider, body.description, source)
    except GenerationFailed as exc:
        raise HTTPException(status_code=502, detail=exc.message)
    except ProviderError as exc:
        raise HTTPException(status_code=503, detail=exc.message)
    finally:
        _in_flight.discard(user.id)

    return GenerateOut(generation=GenerationOut.of(gen), balance=balance_out(db, user))


# ── The member's own API key ──────────────────────────────────────────────

@router.put("/me/ai-key", response_model=OwnKeyOut)
def set_my_key(body: OwnKeyIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    """Save (or replace) the member's own key. One provider per member."""
    access = ai_access(db, user)
    if not access.own:
        raise HTTPException(status_code=403, detail=access.reason or "Your plan doesn't include your own API key")
    provider = db.get(AIProvider, body.provider)
    if not provider:
        raise HTTPException(status_code=404, detail="Unknown AI provider")
    try:
        enc = encrypt(body.api_key)
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc))
    key = user.ai_key
    if key:
        key.provider_id, key.api_key_enc, key.last_test_ok, key.last_tested_at = provider.id, enc, None, None
    else:
        key = UserAIKey(user_id=user.id, provider_id=provider.id, api_key_enc=enc)
        db.add(key)
    db.commit()
    db.refresh(user)
    return own_key_out(user.ai_key)


@router.delete("/me/ai-key", status_code=status.HTTP_204_NO_CONTENT)
def delete_my_key(user: User = Depends(current_user), db: Session = Depends(get_db)):
    if user.ai_key:
        db.delete(user.ai_key)
        db.commit()


@router.post(
    "/me/ai-key/test",
    response_model=ProviderTestOut,
    dependencies=[Depends(rate_limit("key-test", 10, 3600))],
)
async def test_my_key(user: User = Depends(current_user), db: Session = Depends(get_db)):
    """Try the member's key with a tiny deck. Errors come from their own provider account."""
    key = user.ai_key
    if not key:
        raise HTTPException(status_code=404, detail="No API key saved")
    plain = decrypt(key.api_key_enc)
    if plain is None:
        return ProviderTestOut(ok=False, message="Your saved key can't be read any more — paste it again", duration_ms=0)
    ok, message, duration = await try_key(db, key.provider, plain)
    key.last_test_ok, key.last_tested_at = ok, utcnow()
    db.commit()
    return ProviderTestOut(ok=ok, message=message, duration_ms=duration)


@router.get("/me/generations", response_model=list[GenerationSummary])
def my_generations(user: User = Depends(current_user), db: Session = Depends(get_db)):
    rows = (
        db.query(Generation)
        .filter(Generation.user_id == user.id, Generation.status == "success")
        .order_by(Generation.created_at.desc(), Generation.id.desc())
        .limit(200)
        .all()
    )
    return [GenerationSummary.of(g) for g in rows]


def _my_generation(gen_id: int, user: User, db: Session) -> Generation:
    gen = db.query(Generation).filter(
        Generation.id == gen_id, Generation.user_id == user.id, Generation.status == "success"
    ).first()
    if not gen:
        raise HTTPException(status_code=404, detail="Deck not found")
    return gen


@router.get("/me/generations/{gen_id}", response_model=GenerationOut)
def my_generation(gen_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    return GenerationOut.of(_my_generation(gen_id, user, db))


@router.delete("/me/generations/{gen_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_my_generation(gen_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    """Remove a deck from the history. Tokens already spent are not refunded."""
    gen = _my_generation(gen_id, user, db)
    # Keep the row for token accounting and moderation; just drop the content from the user's history.
    gen.status = "deleted"
    gen.deck_json = None
    db.commit()
