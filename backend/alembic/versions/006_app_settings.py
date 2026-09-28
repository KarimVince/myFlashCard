"""Add app_settings table with premium_enabled flag (inactive by default).

Revision ID: 006
Revises: 005
Create Date: 2026-09-28
"""
from alembic import op
import sqlalchemy as sa

revision = "006"
down_revision = "005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    table = op.create_table(
        "app_settings",
        sa.Column("key", sa.Text, primary_key=True),
        sa.Column("value", sa.Boolean, nullable=False, server_default=sa.false()),
    )
    op.bulk_insert(table, [{"key": "premium_enabled", "value": False}])


def downgrade() -> None:
    op.drop_table("app_settings")
