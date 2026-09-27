"""Add Game category with AI prompt and icon.

Revision ID: 005
Revises: 004
Create Date: 2026-09-27
"""
from alembic import op
import sqlalchemy as sa

revision = "005"
down_revision = "004"
branch_labels = None
depends_on = None

GAME_PROMPT = """You are creating a flashcard reference deck for a game. The deck must cover everything a player needs to play, score, and improve — covering any game type: card games (poker, mahjong, bridge), board games (chess, Catan, Monopoly), dice games, tile games, or any other.

Generate a JSON deck following the exact structure below. Return only valid JSON — no markdown, no explanation.

─────────────────────────────────────────
REQUIRED CARDS (include all that apply):

1. Cover card — game name, one-line objective, key facts (players, components, duration, difficulty)
2. Setup — numbered steps to prepare before play starts
3. How to Play — turn structure and core actions (numbered steps)
4. Scoring / Winning — how points are earned or how to win (table or stats)
5. Key Rules — important rules, exceptions, special cases (bullet list)
6. Strategy Tips — beginner to advanced tips (bullet list + note)
7. Glossary — key terms specific to this game (two-column table)

Add extra cards as needed for the game (e.g. Hand Rankings for poker, Fan Table for mahjong, Piece Movements for chess, Special Cards for Uno). Each card should cover one focused topic.

─────────────────────────────────────────
BLOCK TYPE REFERENCE — use exact field names:

stats block — key/value tiles, ideal for game facts and counts:
  { "type": "stats", "items": [ { "label": "...", "value": "..." } ] }

note block — single paragraph of text, rules clarification, or tip:
  { "type": "note", "text": "...", "accentColor": "#hex" }

steps block — ordered steps (style: "number") or bullet list (style: "bullet"):
  { "type": "steps", "style": "number" | "bullet", "items": [ "...", "..." ] }

table block — grid lookup (use "columns" not "headers", use "rows" not "data"):
  { "type": "table", "columns": [ "Col1", "Col2" ], "rows": [ [ "val", "val" ], ... ] }
  Optional: add "heading": "..." above the table for context.

─────────────────────────────────────────
JSON STRUCTURE:

{
  "deckTitle": "<Game Name> — Quick Reference",
  "accentColor": "<primary hex colour matching the game's theme>",
  "cards": [
    {
      "title": "Card title",
      "subtitle": "One-line subtitle",
      "accentColor": "<hex — vary per card section for visual grouping>",
      "blocks": [ ... ]
    }
  ]
}

Rules:
- "deckTitle" and "title" are required on every card
- Vary "accentColor" across card sections (e.g. blue for structure, green for strategy, amber for scoring, red for rules)
- Use "stats" on the cover card and any card with several key numbers
- Use "steps" with style "number" for ordered processes, style "bullet" for unordered lists
- Use "table" for anything that benefits from a row/column lookup
- Use "note" to add a clarifying sentence after a table or list
- Keep each card focused on one topic — split if content gets too long
- Include real, accurate content for the specific game requested"""


def upgrade() -> None:
    categories_table = sa.table(
        "categories",
        sa.column("slug", sa.Text),
        sa.column("label", sa.Text),
        sa.column("description", sa.Text),
        sa.column("icon", sa.Text),
        sa.column("ai_prompt", sa.Text),
        sa.column("schema_json", sa.JSON),
    )
    op.bulk_insert(categories_table, [
        {
            "slug": "game",
            "label": "Game",
            "description": "Rules, scoring and strategy for card, board, tile and dice games",
            "icon": "🎮",
            "ai_prompt": GAME_PROMPT,
            "schema_json": None,
        }
    ])


def downgrade() -> None:
    op.execute("DELETE FROM categories WHERE slug = 'game'")
