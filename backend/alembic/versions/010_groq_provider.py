"""Add Groq as an OpenAI-compatible AI provider (free tier).

Revision ID: 010
Revises: 009
Create Date: 2026-10-13
"""
from alembic import op
import sqlalchemy as sa

revision = "010"
down_revision = "009"
branch_labels = None
depends_on = None


def upgrade() -> None:
    providers = sa.table(
        "ai_providers",
        sa.column("id", sa.String), sa.column("label", sa.Text), sa.column("enabled", sa.Boolean),
        sa.column("is_default", sa.Boolean), sa.column("model", sa.Text), sa.column("token_cost", sa.Integer),
        sa.column("requires_service", sa.Text), sa.column("sort_order", sa.Integer), sa.column("base_url", sa.Text),
    )
    op.bulk_insert(providers, [{
        "id": "groq", "label": "Groq", "enabled": False, "is_default": False,
        "model": "llama-3.3-70b-versatile", "token_cost": 1, "requires_service": None, "sort_order": 4,
        "base_url": "https://api.groq.com/openai/v1",
    }])


def downgrade() -> None:
    op.execute("DELETE FROM ai_providers WHERE id = 'groq'")
