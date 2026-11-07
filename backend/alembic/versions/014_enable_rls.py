"""Turn on Row-Level Security on every table.

Supabase publishes the public schema through its Data API, so a table without RLS can be read and
changed by anyone with the project URL and public key. The app only reaches the database through
the backend, which connects as the tables' owner and so isn't restricted by RLS. With RLS on and no
policies, the Data API gets nothing.

Revision ID: 014
Revises: 013
Create Date: 2026-11-07
"""
from alembic import op

revision = "014"
down_revision = "013"
branch_labels = None
depends_on = None


def _set_rls(action: str) -> None:
    if op.get_bind().dialect.name != "postgresql":   # local dev and tests use SQLite, which has no RLS
        return
    op.execute(f"""
        DO $$
        DECLARE t text;
        BEGIN
            FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
                EXECUTE format('ALTER TABLE public.%I {action} ROW LEVEL SECURITY', t);
            END LOOP;
        END $$;
    """)


def upgrade() -> None:
    _set_rls("ENABLE")


def downgrade() -> None:
    _set_rls("DISABLE")
