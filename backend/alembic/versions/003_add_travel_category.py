"""Add Travel deck category.

Revision ID: 003
Revises: 002
Create Date: 2026-09-26
"""
from alembic import op
import sqlalchemy as sa

revision = "003"
down_revision = "002"
branch_labels = None
depends_on = None

TRAVEL_PROMPT = """Create a travel guide flashcard deck for a city or country in the following JSON format.
Each card covers one aspect of the destination. Use "stats" blocks for key facts (population,
currency, timezone, visa requirements, best travel season). Use "note" blocks for cultural context,
local tips, and essential warnings. Use "steps" blocks (style: "bullet") for attraction lists,
food recommendations, and activity options. Use "table" blocks for events calendars,
neighborhood comparisons, or transport mode comparisons.

Aim for 7–9 cards covering: City Snapshot, History & Heritage, Must-See Attractions,
Neighborhoods Guide, Food & Drink, Parks & Nature, Events Calendar, Getting Around,
and optionally Day Trips or Practical Tips.

JSON structure:
{
  "deckTitle": "City/Country Name — City Travel Guide",
  "accentColor": "#hexcolor (pick a color that evokes the destination)",
  "cards": [
    {
      "title": "Card topic",
      "subtitle": "Short evocative tagline",
      "blocks": [
        {"type": "stats", "items": [{"label": "...", "value": "..."}]},
        {"type": "note", "text": "..."},
        {"type": "steps", "style": "bullet", "items": ["..."]},
        {"type": "table", "columns": ["Col1","Col2","Col3"], "rows": [["...","...","..."]]}
      ]
    }
  ]
}"""

BASE_SCHEMA = {
    "type": "object",
    "required": ["deckTitle", "cards"],
    "properties": {
        "deckTitle": {"type": "string"},
        "accentColor": {"type": "string"},
        "cards": {
            "type": "array",
            "minItems": 1,
            "items": {
                "type": "object",
                "required": ["title", "blocks"],
                "properties": {
                    "title": {"type": "string"},
                    "subtitle": {"type": "string"},
                    "accentColor": {"type": "string"},
                    "blocks": {"type": "array"},
                },
            },
        },
    },
}


def upgrade() -> None:
    categories_table = sa.table(
        "categories",
        sa.column("slug", sa.Text),
        sa.column("label", sa.Text),
        sa.column("description", sa.Text),
        sa.column("ai_prompt", sa.Text),
        sa.column("schema_json", sa.JSON),
    )
    op.bulk_insert(categories_table, [
        {
            "slug": "travel",
            "label": "Travel",
            "description": "City and country travel guides",
            "ai_prompt": TRAVEL_PROMPT,
            "schema_json": BASE_SCHEMA,
        }
    ])


def downgrade() -> None:
    op.execute("DELETE FROM categories WHERE slug = 'travel'")
