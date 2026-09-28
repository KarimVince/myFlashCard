"""AI generation: providers, generations, token ledger, numeric settings.

Revision ID: 008
Revises: 007
Create Date: 2026-09-28
"""
from alembic import op
import sqlalchemy as sa

revision = "008"
down_revision = "007"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("app_settings") as batch:
        batch.add_column(sa.Column("number", sa.Integer))
    settings = sa.table(
        "app_settings", sa.column("key", sa.Text), sa.column("value", sa.Boolean), sa.column("number", sa.Integer)
    )
    op.bulk_insert(settings, [
        {"key": "ai_free_monthly_tokens", "value": False, "number": 5},
        {"key": "ai_premium_monthly_tokens", "value": False, "number": 15},
    ])

    providers = op.create_table(
        "ai_providers",
        sa.Column("id", sa.String(32), primary_key=True),
        sa.Column("label", sa.Text, nullable=False),
        sa.Column("enabled", sa.Boolean, nullable=False, server_default=sa.false()),
        sa.Column("is_default", sa.Boolean, nullable=False, server_default=sa.false()),
        sa.Column("model", sa.Text, nullable=False),
        sa.Column("api_key_enc", sa.Text),
        sa.Column("token_cost", sa.Integer, nullable=False, server_default="1"),
        sa.Column("requires_service", sa.Text),
        sa.Column("sort_order", sa.Integer, nullable=False, server_default="0"),
    )
    op.bulk_insert(providers, [
        {"id": "gemini", "label": "Gemini", "enabled": False, "is_default": True,
         "model": "gemini-2.5-flash", "token_cost": 1, "requires_service": None, "sort_order": 1},
        {"id": "claude", "label": "Claude", "enabled": False, "is_default": False,
         "model": "claude-opus-5", "token_cost": 1, "requires_service": "ai_claude", "sort_order": 2},
    ])

    op.create_table(
        "generations",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("user_id", sa.Integer, sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("category_id", sa.Integer, sa.ForeignKey("categories.id", ondelete="SET NULL")),
        sa.Column("provider", sa.Text, nullable=False),
        sa.Column("model", sa.Text, nullable=False),
        sa.Column("description", sa.Text, nullable=False),
        sa.Column("status", sa.Text, nullable=False),
        sa.Column("title", sa.Text),
        sa.Column("card_count", sa.Integer),
        sa.Column("deck_json", sa.JSON),
        sa.Column("error", sa.Text),
        sa.Column("tokens_spent", sa.Integer, nullable=False, server_default="0"),
        sa.Column("duration_ms", sa.Integer),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_table(
        "token_ledger",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("user_id", sa.Integer, sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("delta", sa.Integer, nullable=False),
        sa.Column("source", sa.Text, nullable=False),
        sa.Column("period", sa.String(7), nullable=False),
        sa.Column("generation_id", sa.Integer, sa.ForeignKey("generations.id", ondelete="SET NULL")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table("token_ledger")
    op.drop_table("generations")
    op.drop_table("ai_providers")
    op.execute("DELETE FROM app_settings WHERE key IN ('ai_free_monthly_tokens', 'ai_premium_monthly_tokens')")
    with op.batch_alter_table("app_settings") as batch:
        batch.drop_column("number")
