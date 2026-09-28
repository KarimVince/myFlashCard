from datetime import datetime, timezone

from sqlalchemy import (
    Boolean,
    ForeignKey,
    Integer,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy import DateTime, JSON, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


def utcnow():
    return datetime.now(timezone.utc)


class Category(Base):
    __tablename__ = "categories"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    slug: Mapped[str] = mapped_column(Text, unique=True, nullable=False)
    label: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    ai_prompt: Mapped[str | None] = mapped_column(Text)
    schema_json: Mapped[dict | None] = mapped_column(JSON)
    icon: Mapped[str | None] = mapped_column(Text)

    decks: Mapped[list["Deck"]] = relationship("Deck", back_populates="category")


class Deck(Base):
    __tablename__ = "decks"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    category_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("categories.id", ondelete="RESTRICT"), nullable=False
    )
    title: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    author: Mapped[str | None] = mapped_column(Text)
    language: Mapped[str] = mapped_column(Text, nullable=False, default="en")
    card_count: Mapped[int | None] = mapped_column(Integer)
    storage_path: Mapped[str] = mapped_column(Text, nullable=False)
    public_url: Mapped[str] = mapped_column(Text, nullable=False)
    is_public: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    is_free: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    downloads: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )

    category: Mapped[Category] = relationship("Category", back_populates="decks")


class AppSetting(Base):
    """Global key/value feature flags (e.g. premium_enabled)."""
    __tablename__ = "app_settings"

    key: Mapped[str] = mapped_column(Text, primary_key=True)
    value: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    number: Mapped[int | None] = mapped_column(Integer)  # for numeric settings (e.g. token allowances)


# ── Accounts ─────────────────────────────────────────────────────────────

class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    email: Mapped[str] = mapped_column(Text, unique=True, nullable=False)   # stored lowercase
    alias: Mapped[str] = mapped_column(Text, unique=True, nullable=False)
    alias_key: Mapped[str] = mapped_column(Text, unique=True, nullable=False)  # lowercase, for uniqueness
    password_hash: Mapped[str] = mapped_column(Text, nullable=False)
    role: Mapped[str] = mapped_column(Text, nullable=False, default="user")  # "user" | "admin"
    email_verified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    services: Mapped[list["UserService"]] = relationship(
        "UserService", cascade="all, delete-orphan", lazy="selectin"
    )
    # Deleted with the user (the DB cascades too; this covers SQLite, which doesn't enforce FKs).
    sessions: Mapped[list["UserSession"]] = relationship(
        "UserSession", cascade="all, delete-orphan", back_populates="user"
    )
    email_tokens: Mapped[list["EmailToken"]] = relationship("EmailToken", cascade="all, delete-orphan")
    generations: Mapped[list["Generation"]] = relationship(
        "Generation", cascade="all, delete-orphan", back_populates="user"
    )
    ledger: Mapped[list["TokenLedger"]] = relationship("TokenLedger", cascade="all, delete-orphan")

    @property
    def service_names(self) -> list[str]:
        return sorted(s.service for s in self.services)

    @property
    def is_admin(self) -> bool:
        return self.role == "admin"


class UserService(Base):
    """An access right held by a user, e.g. "premium" or "ai_claude"."""
    __tablename__ = "user_services"

    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    service: Mapped[str] = mapped_column(Text, primary_key=True)
    granted_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )


class UserSession(Base):
    __tablename__ = "sessions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    token_hash: Mapped[str] = mapped_column(Text, unique=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    user: Mapped[User] = relationship("User", back_populates="sessions")


class EmailToken(Base):
    """One-time token sent by email for verification or password reset."""
    __tablename__ = "email_tokens"
    __table_args__ = (UniqueConstraint("token_hash"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    purpose: Mapped[str] = mapped_column(Text, nullable=False)  # "verify" | "reset"
    token_hash: Mapped[str] = mapped_column(Text, nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


# ── AI generation ────────────────────────────────────────────────────────

class AIProvider(Base):
    """An AI provider (gemini, claude). The API key is stored encrypted."""
    __tablename__ = "ai_providers"

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    label: Mapped[str] = mapped_column(Text, nullable=False)
    enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    is_default: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    model: Mapped[str] = mapped_column(Text, nullable=False)
    api_key_enc: Mapped[str | None] = mapped_column(Text)
    token_cost: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    requires_service: Mapped[str | None] = mapped_column(Text)  # e.g. "ai_claude"
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)


class Generation(Base):
    """One AI deck generation attempt, kept for the user's history and for moderation."""
    __tablename__ = "generations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    category_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("categories.id", ondelete="SET NULL"))
    provider: Mapped[str] = mapped_column(Text, nullable=False)
    model: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(Text, nullable=False)  # "success" | "failed"
    title: Mapped[str | None] = mapped_column(Text)
    card_count: Mapped[int | None] = mapped_column(Integer)
    deck_json: Mapped[dict | None] = mapped_column(JSON)
    error: Mapped[str | None] = mapped_column(Text)
    tokens_spent: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    duration_ms: Mapped[int | None] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    category: Mapped[Category | None] = relationship("Category")
    user: Mapped["User"] = relationship("User", back_populates="generations")


class TokenLedger(Base):
    """Token movements. Spends are negative. source "monthly" draws from the monthly allowance;
    other sources (future: "purchase", "bonus") are extra tokens that don't expire."""
    __tablename__ = "token_ledger"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    delta: Mapped[int] = mapped_column(Integer, nullable=False)
    source: Mapped[str] = mapped_column(Text, nullable=False)
    period: Mapped[str] = mapped_column(String(7), nullable=False)  # "YYYY-MM"
    generation_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("generations.id", ondelete="SET NULL"))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
