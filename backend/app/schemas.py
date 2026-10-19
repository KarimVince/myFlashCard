from datetime import datetime

from pydantic import BaseModel, ConfigDict, model_validator


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
    public_url: str   # empty for premium decks: their file only comes through /decks/{id}/content
    is_free: bool
    downloads: int
    category: CategoryOut
    created_at: datetime

    @model_validator(mode="after")
    def _hide_premium_file(self) -> "DeckPublicOut":
        if not self.is_free:
            self.public_url = ""
        return self


class VisibilityUpdate(BaseModel):
    is_public: bool


class FreeUpdate(BaseModel):
    is_free: bool


# ── Settings ──────────────────────────────────────────────────────────────

class PublicSettingsOut(BaseModel):
    premium_enabled: bool
    accounts_enabled: bool = False
    ai_enabled: bool = False


class FeatureUpdate(BaseModel):
    """On/off body for the admin feature switches (premium, accounts, ai)."""
    enabled: bool


PremiumUpdate = FeatureUpdate


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


# ── Accounts ──────────────────────────────────────────────────────────────

import re  # noqa: E402

from pydantic import field_validator  # noqa: E402

_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
_ALIAS_RE = re.compile(r"^[\w.\- ]{3,30}$")


def _clean_email(v: str) -> str:
    v = v.strip().lower()
    if len(v) > 254 or not _EMAIL_RE.match(v):
        raise ValueError("Enter a valid email address")
    return v


def _check_password(v: str) -> str:
    if len(v) < 8:
        raise ValueError("Password must be at least 8 characters")
    if len(v) > 128:
        raise ValueError("Password is too long")
    return v


def _clean_alias(v: str) -> str:
    v = " ".join(v.split())
    if not _ALIAS_RE.match(v):
        raise ValueError("Alias must be 3–30 characters: letters, numbers, spaces, . _ -")
    return v


class RegisterIn(BaseModel):
    alias: str
    email: str
    password: str

    _alias = field_validator("alias")(_clean_alias)
    _email = field_validator("email")(_clean_email)
    _password = field_validator("password")(_check_password)


class LoginIn(BaseModel):
    email: str
    password: str

    @field_validator("email")
    @classmethod
    def _lower(cls, v: str) -> str:
        return v.strip().lower()


class EmailIn(BaseModel):
    email: str

    _email = field_validator("email")(_clean_email)


class TokenIn(BaseModel):
    token: str


class ResetPasswordIn(BaseModel):
    token: str
    password: str

    _password = field_validator("password")(_check_password)


class ProfileUpdate(BaseModel):
    alias: str

    _alias = field_validator("alias")(_clean_alias)


class PasswordChangeIn(BaseModel):
    current_password: str
    new_password: str

    _password = field_validator("new_password")(_check_password)


class PasswordConfirmIn(BaseModel):
    password: str


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    alias: str
    email: str
    role: str
    tier: str
    email_verified: bool
    created_at: datetime

    @classmethod
    def of(cls, user) -> "UserOut":
        return cls(
            id=user.id,
            alias=user.alias,
            email=user.email,
            role=user.role,
            tier=user.tier,
            email_verified=user.email_verified_at is not None,
            created_at=user.created_at,
        )


class AdminUserOut(UserOut):
    last_login_at: datetime | None = None
    tokens_used_month: int = 0
    own_key_provider: str | None = None

    @classmethod
    def of(cls, user, tokens_used_month: int = 0) -> "AdminUserOut":
        return cls(
            **UserOut.of(user).model_dump(),
            last_login_at=user.last_login_at,
            tokens_used_month=tokens_used_month,
            own_key_provider=user.ai_key.provider_id if user.ai_key else None,
        )


class AuthOut(BaseModel):
    token: str
    user: UserOut


class MemberUpdate(BaseModel):
    """Admin changes to a member. Every field is optional."""
    tier: str | None = None
    role: str | None = None              # "user" | "admin"
    email_verified: bool | None = None   # lets the admin confirm an email when no email service is set up

    @field_validator("tier")
    @classmethod
    def _tier(cls, v: str | None) -> str | None:
        from app.accounts import TIERS

        if v is not None and v not in TIERS:
            raise ValueError(f"Level must be one of: {', '.join(TIERS)}")
        return v

    @field_validator("role")
    @classmethod
    def _role(cls, v: str | None) -> str | None:
        if v is not None and v not in ("user", "admin"):
            raise ValueError("Role must be user or admin")
        return v


# ── AI generation ─────────────────────────────────────────────────────────

MAX_DESCRIPTION = 1000


class BalanceOut(BaseModel):
    """Shared-AI allowance. period: "month" (Gold, resets on resets_on), "total" (Silver, never
    resets), or None (no shared AI). Admins are unlimited and get unlimited=True."""
    allowance: int
    used: int
    left: int
    extra: int
    total: int
    period: str | None
    resets_on: str | None = None
    unlimited: bool = False


class ProviderOption(BaseModel):
    id: str
    label: str
    token_cost: int
    is_default: bool
    available: bool
    reason: str | None = None


class KeyProviderOut(BaseModel):
    """A provider a member can use their own key with."""
    id: str
    label: str
    model: str


class OwnKeyOut(BaseModel):
    provider: str
    provider_label: str
    model: str
    key_hint: str | None          # None when the stored key can't be read (SECRETS_KEY changed)
    last_test_ok: bool | None
    last_tested_at: datetime | None


class OwnKeyIn(BaseModel):
    provider: str
    api_key: str

    @field_validator("api_key")
    @classmethod
    def _key(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Paste your API key")
        if len(v) > 500 or any(c.isspace() for c in v):
            raise ValueError("That doesn't look like an API key")
        return v


class AIOptionsOut(BaseModel):
    """Everything the Create screen and AI settings page need for the current user."""
    email_verified: bool
    tier: str
    is_admin: bool
    can_generate: bool             # may use AI at all (plan, launch switches)
    reason: str | None = None      # why not, when can_generate is False
    shared: bool                   # plan includes the site's AI (Silver, Gold, admin)
    own_key_allowed: bool          # plan allows the member's own key (Bronze and up)
    own_key: OwnKeyOut | None = None
    balance: BalanceOut
    providers: list[ProviderOption]          # the site's AIs (shared)
    key_providers: list[KeyProviderOut]      # AIs a member can add their own key for
    max_description: int = MAX_DESCRIPTION


class GenerateIn(BaseModel):
    category_slug: str
    description: str
    provider: str | None = None    # shared AI to use; ignored for source "own"
    source: str | None = None      # "shared" | "own"; None picks shared while the allowance lasts
    source_text: str | None = None  # text from the member's document (see /ai/extract)
    source_name: str | None = None  # that document's file name, for the prompt

    @field_validator("source_text")
    @classmethod
    def _source_text(cls, v: str | None) -> str | None:
        from app.ai.documents import MAX_SOURCE_CHARS

        v = (v or "").strip()
        if not v:
            return None
        if len(v) > MAX_SOURCE_CHARS:
            raise ValueError(f"The document text is too long (max {MAX_SOURCE_CHARS} characters)")
        return v

    @field_validator("source_name")
    @classmethod
    def _source_name(cls, v: str | None) -> str | None:
        return (v or "").strip()[:120] or None

    @field_validator("source")
    @classmethod
    def _source(cls, v: str | None) -> str | None:
        if v is not None and v not in ("shared", "own"):
            raise ValueError("source must be shared or own")
        return v

    @field_validator("description")
    @classmethod
    def _desc(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 10:
            raise ValueError("Describe your deck in at least 10 characters")
        if len(v) > MAX_DESCRIPTION:
            raise ValueError(f"Keep the description under {MAX_DESCRIPTION} characters")
        return v


class ExtractOut(BaseModel):
    text: str
    chars: int
    truncated: bool
    filename: str


class GenerationSummary(BaseModel):
    id: int
    title: str | None
    category_slug: str | None
    category_label: str | None
    provider: str
    key_source: str
    card_count: int | None
    tokens_spent: int
    published_deck_id: int | None = None
    created_at: datetime

    @classmethod
    def of(cls, g) -> "GenerationSummary":
        return cls(
            id=g.id,
            title=g.title,
            category_slug=g.category.slug if g.category else None,
            category_label=g.category.label if g.category else None,
            provider=g.provider,
            key_source=g.key_source,
            card_count=g.card_count,
            tokens_spent=g.tokens_spent,
            published_deck_id=g.published_deck_id,
            created_at=g.created_at,
        )


class PublishIn(BaseModel):
    """Admin: put an AI-generated deck in the public library."""
    title: str
    description: str | None = None
    language: str = "en"
    is_free: bool = True

    @field_validator("title")
    @classmethod
    def _title(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Give the deck a title")
        return v[:200]

    @field_validator("language")
    @classmethod
    def _lang(cls, v: str) -> str:
        v = v.strip().lower()
        if not 2 <= len(v) <= 5:
            raise ValueError("Language must be a short code like en or fr")
        return v


class GenerationOut(GenerationSummary):
    description: str
    deck: dict

    @classmethod
    def of(cls, g) -> "GenerationOut":
        return cls(**GenerationSummary.of(g).model_dump(), description=g.description, deck=g.deck_json or {})


class GenerateOut(BaseModel):
    generation: GenerationOut
    balance: BalanceOut


class AdminProviderOut(BaseModel):
    id: str
    label: str
    enabled: bool
    is_default: bool
    model: str
    token_cost: int
    base_url: str | None = None
    has_key: bool
    key_hint: str | None


class AdminAIOut(BaseModel):
    providers: list[AdminProviderOut]
    silver_total: int
    gold_monthly: int
    secrets_key_configured: bool


class ProviderUpdate(BaseModel):
    enabled: bool | None = None
    is_default: bool | None = None
    model: str | None = None
    token_cost: int | None = None
    base_url: str | None = None  # only for OpenAI-compatible providers
    api_key: str | None = None  # "" removes the key

    @field_validator("token_cost")
    @classmethod
    def _cost(cls, v: int | None) -> int | None:
        if v is not None and not 1 <= v <= 100:
            raise ValueError("Token cost must be between 1 and 100")
        return v


class AllowancesUpdate(BaseModel):
    silver_total: int
    gold_monthly: int

    @field_validator("silver_total", "gold_monthly")
    @classmethod
    def _range(cls, v: int) -> int:
        if not 0 <= v <= 1000:
            raise ValueError("Allowances must be between 0 and 1000")
        return v


class ProviderTestOut(BaseModel):
    ok: bool
    message: str
    duration_ms: int


class AdminGenerationOut(BaseModel):
    id: int
    user_alias: str
    user_email: str
    category_label: str | None
    provider: str
    model: str
    key_source: str
    description: str
    status: str
    title: str | None
    error: str | None
    tokens_spent: int
    duration_ms: int | None
    created_at: datetime
