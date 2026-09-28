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
    email_verified: bool
    services: list[str]
    created_at: datetime

    @classmethod
    def of(cls, user) -> "UserOut":
        return cls(
            id=user.id,
            alias=user.alias,
            email=user.email,
            role=user.role,
            email_verified=user.email_verified_at is not None,
            services=user.service_names,
            created_at=user.created_at,
        )


class AdminUserOut(UserOut):
    last_login_at: datetime | None = None
    tokens_used_month: int = 0

    @classmethod
    def of(cls, user, tokens_used_month: int = 0) -> "AdminUserOut":
        return cls(
            **UserOut.of(user).model_dump(),
            last_login_at=user.last_login_at,
            tokens_used_month=tokens_used_month,
        )


class AuthOut(BaseModel):
    token: str
    user: UserOut


class ServiceUpdate(BaseModel):
    enabled: bool


# ── AI generation ─────────────────────────────────────────────────────────

MAX_DESCRIPTION = 1000


class BalanceOut(BaseModel):
    monthly_allowance: int
    monthly_used: int
    monthly_left: int
    extra: int
    total: int
    resets_on: str  # ISO date of the next monthly reset


class ProviderOption(BaseModel):
    id: str
    label: str
    token_cost: int
    is_default: bool
    available: bool
    reason: str | None = None


class AIOptionsOut(BaseModel):
    email_verified: bool
    balance: BalanceOut
    providers: list[ProviderOption]
    max_description: int = MAX_DESCRIPTION


class GenerateIn(BaseModel):
    category_slug: str
    description: str
    provider: str | None = None

    @field_validator("description")
    @classmethod
    def _desc(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 10:
            raise ValueError("Describe your deck in at least 10 characters")
        if len(v) > MAX_DESCRIPTION:
            raise ValueError(f"Keep the description under {MAX_DESCRIPTION} characters")
        return v


class GenerationSummary(BaseModel):
    id: int
    title: str | None
    category_slug: str | None
    category_label: str | None
    provider: str
    card_count: int | None
    tokens_spent: int
    created_at: datetime

    @classmethod
    def of(cls, g) -> "GenerationSummary":
        return cls(
            id=g.id,
            title=g.title,
            category_slug=g.category.slug if g.category else None,
            category_label=g.category.label if g.category else None,
            provider=g.provider,
            card_count=g.card_count,
            tokens_spent=g.tokens_spent,
            created_at=g.created_at,
        )


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
    requires_service: str | None
    base_url: str | None = None
    has_key: bool
    key_hint: str | None


class AdminAIOut(BaseModel):
    providers: list[AdminProviderOut]
    free_monthly: int
    premium_monthly: int
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
    free_monthly: int
    premium_monthly: int

    @field_validator("free_monthly", "premium_monthly")
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
    description: str
    status: str
    title: str | None
    error: str | None
    tokens_spent: int
    duration_ms: int | None
    created_at: datetime
