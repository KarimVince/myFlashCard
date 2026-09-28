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

    @classmethod
    def of(cls, user) -> "AdminUserOut":
        return cls(**UserOut.of(user).model_dump(), last_login_at=user.last_login_at)


class AuthOut(BaseModel):
    token: str
    user: UserOut


class ServiceUpdate(BaseModel):
    enabled: bool
