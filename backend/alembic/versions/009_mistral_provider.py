"""Add base_url to ai_providers (OpenAI-compatible APIs) and the Mistral provider.

Revision ID: 009
Revises: 008
Create Date: 2026-09-28
"""
from alembic import op
import sqlalchemy as sa

revision = "009"
down_revision = "008"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("ai_providers") as batch:
        batch.add_column(sa.Column("base_url", sa.Text))
    providers = sa.table(
        "ai_providers",
        sa.column("id", sa.String), sa.column("label", sa.Text), sa.column("enabled", sa.Boolean),
        sa.column("is_default", sa.Boolean), sa.column("model", sa.Text), sa.column("token_cost", sa.Integer),
        sa.column("requires_service", sa.Text), sa.column("sort_order", sa.Integer), sa.column("base_url", sa.Text),
    )
    op.bulk_insert(providers, [{
        "id": "mistral", "label": "Mistral", "enabled": False, "is_default": False,
        "model": "mistral-small-latest", "token_cost": 1, "requires_service": None, "sort_order": 3,
        "base_url": "https://api.mistral.ai/v1",
    }])


def downgrade() -> None:
    op.execute("DELETE FROM ai_providers WHERE id = 'mistral'")
    with op.batch_alter_table("ai_providers") as batch:
        batch.drop_column("base_url")
