import json

import jsonschema
from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile, status
from sqlalchemy.orm import Session

from app.auth import verify_admin_token
from app.db import get_db
from app.accounts import SERVICES
from app.models import Category, Deck, User, UserService
from app.schemas import (
    AdminUserOut, CategoryCreate, CategoryOut, CategoryUpdate, DeckOut, DeckUpdate, FreeUpdate,
    PremiumUpdate, PublicSettingsOut, ServiceUpdate, VisibilityUpdate,
)
from app.settings_store import PREMIUM_ENABLED, premium_enabled, set_flag
from app.storage import delete_deck, delete_build, list_builds, replace_deck, upload_build, upload_deck

router = APIRouter(
    prefix="/admin",
    tags=["admin"],
    dependencies=[Depends(verify_admin_token)],
)


def _deck_or_404(deck_id: int, db: Session) -> Deck:
    deck = db.query(Deck).filter(Deck.id == deck_id).first()
    if not deck:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Deck not found")
    return deck


def _category_by_slug(slug: str, db: Session) -> Category:
    cat = db.query(Category).filter(Category.slug == slug).first()
    if not cat:
        raise HTTPException(status_code=422, detail=f"Unknown category slug: {slug!r}")
    return cat


def _validate_json(content: bytes, category: Category) -> dict:
    """Parse JSON and validate against category schema if available."""
    try:
        data = json.loads(content)
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=422, detail=f"Invalid JSON: {exc.msg}")

    if category.schema_json and ("properties" in category.schema_json or "$schema" in category.schema_json or "type" in category.schema_json):
        try:
            jsonschema.validate(data, category.schema_json)
        except jsonschema.ValidationError as exc:
            raise HTTPException(
                status_code=422, detail=f"JSON does not match schema: {exc.message}"
            )
    return data


# ── Admin deck endpoints ──────────────────────────────────────────────────

@router.get("/decks", response_model=list[DeckOut])
def admin_list_decks(db: Session = Depends(get_db)):
    """List all decks including hidden ones."""
    return db.query(Deck).order_by(Deck.created_at.desc()).all()


@router.post("/decks", response_model=DeckOut, status_code=status.HTTP_201_CREATED)
def upload_deck_endpoint(
    json_file: UploadFile = File(...),
    category_slug: str = Form(...),
    title: str = Form(...),
    description: str | None = Form(None),
    author: str | None = Form(None),
    language: str = Form("en"),
    is_free: bool = Form(True),
    db: Session = Depends(get_db),
):
    """Upload a new deck: validates JSON against schema, stores file, inserts DB row."""
    category = _category_by_slug(category_slug, db)
    content = json_file.file.read()
    data = _validate_json(content, category)
    card_count = len(data.get("cards", []))

    deck = Deck(
        category_id=category.id,
        title=title,
        description=description,
        author=author,
        language=language,
        card_count=card_count,
        storage_path="",
        public_url="",
        is_public=True,
        is_free=is_free,
    )
    db.add(deck)
    db.flush()

    storage_path, public_url = upload_deck(category_slug, deck.id, content)
    deck.storage_path = storage_path
    deck.public_url = public_url
    db.commit()
    db.refresh(deck)
    return deck


@router.put("/decks/{deck_id}", response_model=DeckOut)
def update_deck(
    deck_id: int,
    json_file: UploadFile | None = File(None),
    category_slug: str | None = Form(None),
    title: str | None = Form(None),
    description: str | None = Form(None),
    author: str | None = Form(None),
    language: str | None = Form(None),
    is_free: bool | None = Form(None),
    db: Session = Depends(get_db),
):
    """Replace deck metadata and optionally the JSON file."""
    deck = _deck_or_404(deck_id, db)

    if category_slug:
        deck.category_id = _category_by_slug(category_slug, db).id
    if title:
        deck.title = title
    if description is not None:
        deck.description = description
    if author is not None:
        deck.author = author
    if language:
        deck.language = language
    if is_free is not None:
        deck.is_free = is_free

    if json_file:
        category = db.query(Category).filter(Category.id == deck.category_id).first()
        content = json_file.file.read()
        data = _validate_json(content, category)
        deck.card_count = len(data.get("cards", []))
        deck.public_url = replace_deck(deck.storage_path, content)

    db.commit()
    db.refresh(deck)
    return deck


@router.patch("/decks/{deck_id}/visibility", response_model=DeckOut)
def toggle_visibility(
    deck_id: int,
    body: VisibilityUpdate,
    db: Session = Depends(get_db),
):
    """Show or hide a deck from the public library."""
    deck = _deck_or_404(deck_id, db)
    deck.is_public = body.is_public
    db.commit()
    db.refresh(deck)
    return deck


@router.patch("/decks/{deck_id}/free", response_model=DeckOut)
def toggle_free(
    deck_id: int,
    body: FreeUpdate,
    db: Session = Depends(get_db),
):
    """Mark a deck as free or premium."""
    deck = _deck_or_404(deck_id, db)
    deck.is_free = body.is_free
    db.commit()
    db.refresh(deck)
    return deck


@router.delete("/decks/{deck_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_deck_endpoint(deck_id: int, db: Session = Depends(get_db)):
    """Delete a deck from the DB and storage."""
    deck = _deck_or_404(deck_id, db)
    delete_deck(deck.storage_path)
    db.delete(deck)
    db.commit()


# ── Admin settings endpoints ──────────────────────────────────────────────

@router.get("/settings", response_model=PublicSettingsOut)
def admin_get_settings(db: Session = Depends(get_db)):
    """Current feature flags."""
    return PublicSettingsOut(premium_enabled=premium_enabled(db))


@router.patch("/settings/premium", response_model=PublicSettingsOut)
def admin_set_premium(body: PremiumUpdate, db: Session = Depends(get_db)):
    """Turn premium on or off. While off, premium decks are hidden from the public."""
    set_flag(db, PREMIUM_ENABLED, body.enabled)
    return PublicSettingsOut(premium_enabled=premium_enabled(db))


# ── Admin member endpoints ────────────────────────────────────────────────

def _user_or_404(user_id: int, db: Session) -> User:
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Member not found")
    return user


@router.get("/users", response_model=list[AdminUserOut])
def admin_list_users(q: str | None = None, db: Session = Depends(get_db)):
    """List all members, newest first, optionally filtered by alias or email."""
    query = db.query(User)
    if q:
        like = f"%{q.strip().lower()}%"
        query = query.filter((User.email.like(like)) | (User.alias_key.like(like)))
    return [AdminUserOut.of(u) for u in query.order_by(User.created_at.desc()).all()]


@router.put("/users/{user_id}/services/{service}", response_model=AdminUserOut)
def admin_set_service(user_id: int, service: str, body: ServiceUpdate, db: Session = Depends(get_db)):
    """Grant or remove an access (e.g. premium, ai_claude) for a member."""
    if service not in SERVICES:
        raise HTTPException(status_code=422, detail=f"Unknown service: {service!r}")
    user = _user_or_404(user_id, db)
    existing = next((s for s in user.services if s.service == service), None)
    if body.enabled and not existing:
        user.services.append(UserService(service=service))
    elif not body.enabled and existing:
        user.services.remove(existing)
    db.commit()
    db.refresh(user)
    return AdminUserOut.of(user)


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def admin_delete_user(user_id: int, request: Request, db: Session = Depends(get_db)):
    """Delete a member account."""
    user = _user_or_404(user_id, db)
    me = getattr(request.state, "admin_user", None)
    if me and me.id == user.id:
        raise HTTPException(status_code=400, detail="You can't delete your own account here")
    db.delete(user)
    db.commit()


# ── Admin category endpoints ──────────────────────────────────────────────

@router.get("/categories", response_model=list[CategoryOut])
def admin_list_categories(db: Session = Depends(get_db)):
    """List all categories with deck counts."""
    from sqlalchemy import func
    rows = (
        db.query(Category, func.count(Deck.id).label("dc"))
        .outerjoin(Deck, (Deck.category_id == Category.id) & (Deck.is_public == True))  # noqa: E712
        .group_by(Category.id)
        .order_by(Category.label)
        .all()
    )
    result = []
    for cat, count in rows:
        out = CategoryOut.model_validate(cat)
        out.deck_count = count
        result.append(out)
    return result


@router.post("/categories", response_model=CategoryOut, status_code=status.HTTP_201_CREATED)
def create_category(body: CategoryCreate, db: Session = Depends(get_db)):
    """Create a new category."""
    existing = db.query(Category).filter(Category.slug == body.slug).first()
    if existing:
        raise HTTPException(status_code=409, detail=f"Slug '{body.slug}' already exists")
    cat = Category(
        slug=body.slug,
        label=body.label,
        description=body.description,
        icon=body.icon,
        ai_prompt=body.ai_prompt,
        schema_json=body.schema_json,
    )
    db.add(cat)
    db.commit()
    db.refresh(cat)
    out = CategoryOut.model_validate(cat)
    out.deck_count = 0
    return out


@router.patch("/categories/{category_id}", response_model=CategoryOut)
def update_category(category_id: int, body: CategoryUpdate, db: Session = Depends(get_db)):
    """Update category fields (label, icon, description, ai_prompt, schema_json)."""
    cat = db.query(Category).filter(Category.id == category_id).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")
    if body.label is not None:
        cat.label = body.label
    if body.description is not None:
        cat.description = body.description
    if body.icon is not None:
        cat.icon = body.icon
    if body.ai_prompt is not None:
        cat.ai_prompt = body.ai_prompt
    if body.schema_json is not None:
        cat.schema_json = body.schema_json
    db.commit()
    db.refresh(cat)
    from sqlalchemy import func
    count = db.query(func.count(Deck.id)).filter(Deck.category_id == cat.id, Deck.is_public == True).scalar() or 0  # noqa: E712
    out = CategoryOut.model_validate(cat)
    out.deck_count = count
    return out


# ── App build upload ──────────────────────────────────────────────────────────

ALLOWED_BUILD_TYPES = {
    "application/vnd.android.package-archive": "apk",
    "application/octet-stream": None,  # generic — allow, infer from filename
}

@router.get("/builds")
async def list_app_builds():
    """List all files in the downloads/ prefix."""
    return list_builds()


@router.post("/upload-build")
async def upload_app_build(file: UploadFile = File(...)):
    """Upload an APK, AAB or IPA to R2 downloads/. Always overwrites the same filename."""
    filename = file.filename or "myflashcard.apk"
    content = await file.read()
    if not content:
        raise HTTPException(status_code=422, detail="Uploaded file is empty")
    content_type = file.content_type or "application/octet-stream"
    url = upload_build(filename, content, content_type)
    size_mb = round(len(content) / 1_048_576, 2)
    return {"filename": filename, "url": url, "size_mb": size_mb}


@router.delete("/builds/{filename}")
async def delete_app_build(filename: str):
    """Delete a file from downloads/."""
    delete_build(filename)
    return {"deleted": filename}
