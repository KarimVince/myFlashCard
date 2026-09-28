from datetime import datetime

from pydantic import BaseModel, ConfigDict


# ── Category ─────────────────────────────────────────────────────────────

class CategoryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id: int
    slug: str
    label: str
    description: str | None
    ai_prompt: str | None
    schema_json: dict | None = None
    icon: str | None = None
    deck_count: int = 0


# ── Deck ─────────────────────────────────────────────────────────────────

class DeckBase(BaseModel):
    title: str
    description: str | None = None
    author: str | None = None
    language: str = "en"
    card_count: int | None = None


class DeckCreate(DeckBase):
    category_slug: str


class DeckUpdate(DeckBase):
    category_slug: str | None = None


class DeckOut(DeckBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    category_id: int
    category: CategoryOut
    storage_path: str
    public_url: str
    is_public: bool
    is_free: bool
    downloads: int
    created_at: datetime
    updated_at: datetime


class DeckPublicOut(BaseModel):
    """Subset of fields returned on public endpoints."""
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    description: str | None
    author: str | None
    language: str
    card_count: int | None
    public_url: str
    is_free: bool
    downloads: int
    category: CategoryOut
    created_at: datetime


class VisibilityUpdate(BaseModel):
    is_public: bool


class FreeUpdate(BaseModel):
    is_free: bool


# ── Settings ──────────────────────────────────────────────────────────────

class PublicSettingsOut(BaseModel):
    premium_enabled: bool


class PremiumUpdate(BaseModel):
    enabled: bool


# ── Category admin ────────────────────────────────────────────────────────

class CategoryCreate(BaseModel):
    slug: str
    label: str
    description: str | None = None
    icon: str | None = None
    ai_prompt: str | None = None
    schema_json: dict | None = None


class CategoryUpdate(BaseModel):
    label: str | None = None
    description: str | None = None
    icon: str | None = None
    ai_prompt: str | None = None
    schema_json: dict | None = None
