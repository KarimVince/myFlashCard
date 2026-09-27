"""Add icon to categories, is_free to decks; seed icons; update AI prompts with field docs.

Revision ID: 004
Revises: 003
Create Date: 2026-09-27
"""
from alembic import op
import sqlalchemy as sa

revision = "004"
down_revision = "003"
branch_labels = None
depends_on = None

# ── Updated AI prompts with explicit field-name docs ──────────────────────────

RECIPE_PROMPT = """Create a recipe flashcard deck in the following JSON format.
Include exactly one card per dish.

BLOCK TYPE REFERENCE — use these exact field names:
  {"type": "stats",  "items": [{"label": "Prep", "value": "15 min"}, ...]}
  {"type": "steps",  "style": "bullet", "items": ["200g flour", "2 eggs", ...]}
  {"type": "steps",  "style": "number", "items": ["Step 1", "Step 2", ...]}
  {"type": "note",   "text": "A single helpful tip or variation"}
  {"type": "table",  "columns": ["Col A", "Col B"], "rows": [["v1", "v2"]]}

Each recipe card must include:
1. A "stats" block: Prep time, Cook time, Serves
2. A "steps" block (style "bullet"): ingredients list
3. A "steps" block (style "number"): cooking method steps
4. Optionally a "note" block: chef tip or variation

JSON structure:
{
  "deckTitle": "Name of the recipe collection",
  "accentColor": "#hexcolor",
  "cards": [
    {
      "title": "Dish name",
      "subtitle": "20 min · Serves 4",
      "blocks": [
        {"type": "stats", "items": [{"label": "Prep", "value": "10 min"}, {"label": "Cook", "value": "20 min"}, {"label": "Serves", "value": "4"}]},
        {"type": "steps", "style": "bullet", "items": ["200g pasta", "2 cloves garlic", "olive oil", "salt"]},
        {"type": "steps", "style": "number", "items": ["Boil a large pot of salted water", "Cook pasta until al dente", "Sauté garlic in olive oil for 2 min", "Toss pasta in pan and season"]},
        {"type": "note", "text": "Add chilli flakes for heat or finish with lemon zest for brightness"}
      ]
    }
  ]
}"""

STUDY_PROMPT = """Create a study flashcard deck in the following JSON format.
Each card covers one concept, event, or topic.

BLOCK TYPE REFERENCE — use these exact field names:
  {"type": "note",   "text": "Definition or explanation — plain text only"}
  {"type": "stats",  "items": [{"label": "Date", "value": "1789"}, {"label": "Place", "value": "Paris"}]}
  {"type": "steps",  "style": "bullet", "items": ["Key point 1", "Key point 2"]}
  {"type": "steps",  "style": "number", "items": ["First step", "Second step"]}
  {"type": "table",  "columns": ["Concept", "Definition"], "rows": [["term", "meaning"]]}

Use "note" for definitions, "stats" for key figures/dates, "steps" for sequences or lists,
and "table" for side-by-side comparisons.

JSON structure:
{
  "deckTitle": "Subject — Topic",
  "accentColor": "#hexcolor",
  "cards": [
    {
      "title": "Concept name",
      "subtitle": "Optional context or date",
      "blocks": [
        {"type": "note", "text": "Clear one-paragraph definition of the concept"},
        {"type": "stats", "items": [{"label": "Year", "value": "1789"}, {"label": "Country", "value": "France"}]},
        {"type": "steps", "style": "bullet", "items": ["Cause 1", "Cause 2", "Cause 3"]},
        {"type": "table", "columns": ["Before", "After"], "rows": [["Monarchy", "Republic"], ["Church power", "Secular state"]]}
      ]
    }
  ]
}"""

TRAINING_PROMPT = """Create a training flashcard deck in the following JSON format.
Each card covers one exercise or drill.

BLOCK TYPE REFERENCE — use these exact field names:
  {"type": "stats",  "items": [{"label": "Sets", "value": "3"}, {"label": "Reps", "value": "12"}, {"label": "Rest", "value": "60 s"}]}
  {"type": "steps",  "style": "number", "items": ["Cue 1", "Cue 2", "Cue 3"]}
  {"type": "note",   "text": "Safety tip or common mistake to avoid"}
  {"type": "table",  "columns": ["Level", "Sets", "Reps"], "rows": [["Beginner", "2", "8"]]}

Each exercise card must include:
1. A "stats" block: Sets, Reps, Rest (or Duration/Distance for cardio)
2. A "steps" block (style "number"): technique cues in order
3. Optionally a "note" block: safety warning or modification

JSON structure:
{
  "deckTitle": "Training program name",
  "accentColor": "#hexcolor",
  "cards": [
    {
      "title": "Exercise name",
      "subtitle": "Muscle group · Equipment",
      "blocks": [
        {"type": "stats", "items": [{"label": "Sets", "value": "3"}, {"label": "Reps", "value": "10–12"}, {"label": "Rest", "value": "90 s"}]},
        {"type": "steps", "style": "number", "items": ["Stand with feet shoulder-width apart", "Brace core and drive hips back", "Lower until thighs are parallel to floor", "Drive through heels to stand"]},
        {"type": "note", "text": "Keep chest tall throughout; avoid letting knees cave inward"}
      ]
    }
  ]
}"""

SONG_PROMPT = """Create a song/music flashcard deck in the following JSON format.
Each card covers one section of a song (Intro, Verse 1, Pre-Chorus, Chorus, Bridge, Outro).

BLOCK TYPE REFERENCE — use these exact field names:
  {"type": "note",   "text": "Chord progression, e.g. Am - F - C - G"}
  {"type": "steps",  "style": "bullet", "items": ["Lyric line 1", "Lyric line 2"]}
  {"type": "stats",  "items": [{"label": "Key", "value": "A minor"}, {"label": "Tempo", "value": "120 bpm"}, {"label": "Capo", "value": "2nd fret"}]}
  {"type": "table",  "columns": ["String", "Note"], "rows": [["E2", "Root"], ["A2", "Fourth"]]}

Each card should include:
- Lyrics for that section (steps, style "bullet")
- Chord progression (note block)
- Optional stats for key/tempo/capo on the first card

JSON structure:
{
  "deckTitle": "Artist — Song Title",
  "accentColor": "#hexcolor",
  "cards": [
    {
      "title": "Verse 1",
      "subtitle": "Optional note about feel or dynamics",
      "blocks": [
        {"type": "stats", "items": [{"label": "Key", "value": "G major"}, {"label": "Tempo", "value": "95 bpm"}, {"label": "Capo", "value": "No capo"}]},
        {"type": "note", "text": "G - D - Em - C"},
        {"type": "steps", "style": "bullet", "items": ["First lyric line here", "Second lyric line here", "Third lyric line here", "Fourth lyric line here"]}
      ]
    }
  ]
}"""

TRAVEL_PROMPT = """Create a travel guide flashcard deck for a city or country in the following JSON format.
Each card covers one aspect of the destination. Aim for 7–9 cards.

BLOCK TYPE REFERENCE — use these exact field names:
  {"type": "stats",  "items": [{"label": "Currency", "value": "EUR"}, {"label": "Time Zone", "value": "UTC+1"}]}
  {"type": "note",   "text": "Cultural context, local tip, or essential warning — plain text"}
  {"type": "steps",  "style": "bullet", "items": ["Attraction 1 — brief description", "Attraction 2 — brief description"]}
  {"type": "steps",  "style": "number", "items": ["First step", "Second step"]}
  {"type": "table",  "columns": ["Col A", "Col B", "Col C"], "rows": [["v1", "v2", "v3"]]}

Suggested card topics (7–9 cards):
1. City Snapshot — key facts (stats block) + overview note
2. History & Heritage — numbered timeline (steps) + heritage note
3. Must-See Attractions — bullet list of top 8–10 sights with brief descriptions
4. Neighborhoods — table: District, Vibe, Don't Miss
5. Food & Drink — bullet list of must-try dishes + street food note
6. Parks & Nature — bullet list of outdoor options
7. Events Calendar — table: Month, Event, Highlight
8. Getting Around — stats (fares) + table: Mode, Coverage, Tip

JSON structure:
{
  "deckTitle": "City Name — City Travel Guide",
  "accentColor": "#hexcolor (pick a color that evokes the destination)",
  "cards": [
    {
      "title": "City Snapshot",
      "subtitle": "Evocative one-line tagline",
      "blocks": [
        {"type": "stats", "items": [{"label": "Population", "value": "..."}, {"label": "Currency", "value": "..."}, {"label": "Language", "value": "..."}, {"label": "Time Zone", "value": "UTC+N"}]},
        {"type": "note", "text": "Two-sentence overview of the city's character and appeal"},
        {"type": "stats", "items": [{"label": "Best time", "value": "..."}, {"label": "Visa", "value": "..."}, {"label": "Power", "value": "Type X · 220V"}]}
      ]
    }
  ]
}"""


def upgrade() -> None:
    # ── Add columns ───────────────────────────────────────────────────────
    op.add_column("categories", sa.Column("icon", sa.Text(), nullable=True))
    op.add_column(
        "decks",
        sa.Column(
            "is_free",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("true"),
        ),
    )

    # ── Seed category icons ───────────────────────────────────────────────
    for slug, icon in [
        ("recipe",   "🍳"),
        ("study",    "📚"),
        ("training", "🏋️"),
        ("song",     "🎵"),
        ("travel",   "✈️"),
    ]:
        op.execute(
            sa.text("UPDATE categories SET icon = :icon WHERE slug = :slug").bindparams(
                icon=icon, slug=slug
            )
        )

    # ── Update AI prompts with explicit field documentation ───────────────
    for slug, prompt in [
        ("recipe",   RECIPE_PROMPT),
        ("study",    STUDY_PROMPT),
        ("training", TRAINING_PROMPT),
        ("song",     SONG_PROMPT),
        ("travel",   TRAVEL_PROMPT),
    ]:
        op.execute(
            sa.text(
                "UPDATE categories SET ai_prompt = :prompt WHERE slug = :slug"
            ).bindparams(prompt=prompt, slug=slug)
        )


def downgrade() -> None:
    op.drop_column("decks", "is_free")
    op.drop_column("categories", "icon")
