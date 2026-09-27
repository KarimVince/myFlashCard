"""Seed the 4 deck categories with AI prompts and JSON schemas.

Revision ID: 002
Revises: 001
Create Date: 2025-09-17
"""
from alembic import op
import sqlalchemy as sa

revision = "002"
down_revision = "001"
branch_labels = None
depends_on = None

RECIPE_PROMPT = """Create a recipe flashcard deck in the following JSON format.
Include exactly one card per dish. Each card must have a "stats" block (Prep time, Cook time, Serves),
a "steps" block for ingredients (style: "bullet"), a "steps" block for method (style: "number"),
and optionally a "note" block with a chef tip.

JSON structure:
{
  "deckTitle": "Name of the recipe collection",
  "accentColor": "#hexcolor",
  "cards": [
    {
      "title": "Dish name",
      "subtitle": "X min · Serves Y",
      "blocks": [...]
    }
  ]
}"""

STUDY_PROMPT = """Create a study flashcard deck in the following JSON format.
Each card covers one concept, event, or topic. Use "note" blocks for definitions,
"stats" blocks for key figures/dates, "steps" blocks for sequences or lists,
and "table" blocks for comparisons.

JSON structure:
{
  "deckTitle": "Subject — Topic",
  "accentColor": "#hexcolor",
  "cards": [
    {
      "title": "Concept name",
      "subtitle": "Optional context",
      "blocks": [...]
    }
  ]
}"""

TRAINING_PROMPT = """Create a training flashcard deck in the following JSON format.
Each card covers one exercise or drill. Use "stats" blocks for sets/reps/rest,
"steps" blocks for technique cues (style: "number"), and "note" blocks for safety tips.

JSON structure:
{
  "deckTitle": "Training program name",
  "accentColor": "#hexcolor",
  "cards": [
    {
      "title": "Exercise name",
      "subtitle": "Muscle group · Equipment",
      "blocks": [...]
    }
  ]
}"""

SONG_PROMPT = """Create a song/music flashcard deck in the following JSON format.
Each card covers one section of a song (verse, chorus, bridge). Use "text" blocks for lyrics,
"note" blocks for chord progressions, and "stats" blocks for tempo/key/capo.

JSON structure:
{
  "deckTitle": "Artist — Song title",
  "accentColor": "#hexcolor",
  "cards": [
    {
      "title": "Section name (e.g. Verse 1)",
      "subtitle": "Optional note",
      "blocks": [...]
    }
  ]
}"""

# Minimal shared schema — all deck types share the same top-level structure
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

CATEGORIES = [
    {
        "slug": "recipe",
        "label": "Recipe",
        "description": "Cooking and recipe cards",
        "ai_prompt": RECIPE_PROMPT,
        "schema_json": BASE_SCHEMA,
    },
    {
        "slug": "study",
        "label": "Study",
        "description": "Study and revision cards",
        "ai_prompt": STUDY_PROMPT,
        "schema_json": BASE_SCHEMA,
    },
    {
        "slug": "training",
        "label": "Training",
        "description": "Workout and training cards",
        "ai_prompt": TRAINING_PROMPT,
        "schema_json": BASE_SCHEMA,
    },
    {
        "slug": "song",
        "label": "Song",
        "description": "Music and lyrics cards",
        "ai_prompt": SONG_PROMPT,
        "schema_json": BASE_SCHEMA,
    },
]


def upgrade() -> None:
    categories_table = sa.table(
        "categories",
        sa.column("slug", sa.Text),
        sa.column("label", sa.Text),
        sa.column("description", sa.Text),
        sa.column("ai_prompt", sa.Text),
        sa.column("schema_json", sa.JSON),
    )
    op.bulk_insert(categories_table, CATEGORIES)


def downgrade() -> None:
    op.execute("DELETE FROM categories WHERE slug IN ('recipe','study','training','song')")
