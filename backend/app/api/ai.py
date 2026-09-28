from datetime import date

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.accounts import current_user, utcnow
from app.ai.providers import ProviderError
from app.ai.service import (
    GenerationFailed,
    generate_deck,
    get_balance,
    provider_unavailable_reason,
)
from app.db import get_db
from app.models import AIProvider, Category, Generation, User
from app.ratelimit import rate_limit
from app.schemas import (
    AIOptionsOut,
    BalanceOut,
    GenerateIn,
    GenerateOut,
    GenerationOut,
    GenerationSummary,
    ProviderOption,
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
        monthly_allowance=b.monthly_allowance,
        monthly_used=b.monthly_used,
        monthly_left=b.monthly_left,
        extra=b.extra,
        total=b.total,
        resets_on=_next_reset(),
    )


def _providers(db: Session) -> list[AIProvider]:
    return db.query(AIProvider).order_by(AIProvider.sort_order).all()


@router.get("/ai/options", response_model=AIOptionsOut)
def ai_options(user: User = Depends(current_user), db: Session = Depends(get_db)):
    """What the Create screen needs: balance, providers this user can use, verification status."""
    options = []
    for p in _providers(db):
        reason = provider_unavailable_reason(p, user)
        options.append(ProviderOption(
            id=p.id, label=p.label, token_cost=p.token_cost, is_default=p.is_default,
            available=reason is None, reason=reason,
        ))
    return AIOptionsOut(
        email_verified=user.email_verified_at is not None,
        balance=balance_out(db, user),
        providers=options,
    )


@router.post(
    "/ai/generate",
    response_model=GenerateOut,
    dependencies=[Depends(rate_limit("generate", 10, 3600))],
)
async def ai_generate(body: GenerateIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    """Generate a deck with AI. One or more tokens are spent only if a valid deck comes back."""
    if not user.email_verified_at:
        raise HTTPException(status_code=403, detail="Confirm your email before generating decks with AI")

    category = db.query(Category).filter(Category.slug == body.category_slug).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")

    providers = _providers(db)
    if body.provider:
        provider = next((p for p in providers if p.id == body.provider), None)
        if not provider:
            raise HTTPException(status_code=404, detail="Unknown AI provider")
    else:
        usable = [p for p in providers if provider_unavailable_reason(p, user) is None]
        provider = next((p for p in usable if p.is_default), usable[0] if usable else None)
        if not provider:
            raise HTTPException(status_code=503, detail="AI generation is not available right now")
    reason = provider_unavailable_reason(provider, user)
    if reason:
        raise HTTPException(status_code=403, detail=f"{provider.label}: {reason}")

    if get_balance(db, user).total < provider.token_cost:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail=f"Not enough tokens — your allowance resets on {_next_reset()}",
        )

    if user.id in _in_flight:
        raise HTTPException(status_code=409, detail="A deck is already being generated — please wait")
    _in_flight.add(user.id)
    try:
        gen = await generate_deck(db, user, category, provider, body.description)
    except GenerationFailed as exc:
        raise HTTPException(status_code=502, detail=exc.message)
    except ProviderError as exc:
        raise HTTPException(status_code=503, detail=exc.message)
    finally:
        _in_flight.discard(user.id)

    return GenerateOut(generation=GenerationOut.of(gen), balance=balance_out(db, user))


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
