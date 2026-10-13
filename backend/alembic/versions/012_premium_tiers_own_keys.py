"""Premium levels (Bronze/Silver/Gold) and members' own AI keys.

Replaces the per-member "premium" / "ai_claude" grants with users.tier, and the free/premium
monthly allowances with Silver (in total) / Gold (per month). Premium isn't live yet, so no
member keeps a level.

Revision ID: 012
Revises: 011
Create Date: 2026-10-13
"""
from alembic import op
import sqlalchemy as sa

revision = "012"
down_revision = "011"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("users") as batch:
        batch.add_column(sa.Column("tier", sa.Text, nullable=False, server_default="none"))
    op.drop_table("user_services")

    with op.batch_alter_table("ai_providers") as batch:
        batch.drop_column("requires_service")

    with op.batch_alter_table("generations") as batch:
        batch.add_column(sa.Column("key_source", sa.Text, nullable=False, server_default="shared"))

    op.create_table(
        "user_ai_keys",
        sa.Column("user_id", sa.Integer, sa.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("provider_id", sa.String(32), sa.ForeignKey("ai_providers.id", ondelete="CASCADE"), nullable=False),
        sa.Column("api_key_enc", sa.Text, nullable=False),
        sa.Column("last_test_ok", sa.Boolean),
        sa.Column("last_tested_at", sa.DateTime(timezone=True)),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    op.execute("UPDATE token_ledger SET source = 'shared' WHERE source = 'monthly'")
    op.execute(
        "DELETE FROM app_settings WHERE key IN ('ai_free_monthly_tokens', 'ai_premium_monthly_tokens')"
    )


def downgrade() -> None:
    op.execute("UPDATE token_ledger SET source = 'monthly' WHERE source = 'shared'")
    op.drop_table("user_ai_keys")
    with op.batch_alter_table("generations") as batch:
        batch.drop_column("key_source")
    with op.batch_alter_table("ai_providers") as batch:
        batch.add_column(sa.Column("requires_service", sa.Text))
    op.execute("UPDATE ai_providers SET requires_service = 'ai_claude' WHERE id = 'claude'")
    op.create_table(
        "user_services",
        sa.Column("user_id", sa.Integer, sa.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("service", sa.Text, primary_key=True),
        sa.Column("granted_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    with op.batch_alter_table("users") as batch:
        batch.drop_column("tier")
