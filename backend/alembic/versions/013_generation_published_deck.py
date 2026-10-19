"""Link an AI generation to the library deck the admin published from it.

Revision ID: 013
Revises: 012
Create Date: 2026-10-19
"""
from alembic import op
import sqlalchemy as sa

revision = "013"
down_revision = "012"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("generations") as batch:
        batch.add_column(sa.Column("published_deck_id", sa.Integer))
        batch.create_foreign_key(
            "fk_generations_published_deck", "decks", ["published_deck_id"], ["id"], ondelete="SET NULL"
        )


def downgrade() -> None:
    with op.batch_alter_table("generations") as batch:
        batch.drop_constraint("fk_generations_published_deck", type_="foreignkey")
        batch.drop_column("published_deck_id")
