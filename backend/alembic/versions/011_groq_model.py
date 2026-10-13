"""Move Groq off the retired llama-3.3-70b-versatile model.

Revision ID: 011
Revises: 010
Create Date: 2026-10-13
"""
from alembic import op

revision = "011"
down_revision = "010"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Only rows still on the retired default; a model the admin picked is kept.
    op.execute(
        "UPDATE ai_providers SET model = 'openai/gpt-oss-120b' "
        "WHERE id = 'groq' AND model = 'llama-3.3-70b-versatile'"
    )


def downgrade() -> None:
    pass
