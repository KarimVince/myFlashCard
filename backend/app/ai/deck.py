"""Deck format for AI generation: the JSON schema sent to providers and the checks every result must pass."""
import json

import jsonschema

_COLOR = {"type": "string", "description": "Hex colour like #1E88E5"}
_ICON = {"type": "string", "description": "One emoji, e.g. 🍝"}

_BLOCKS = [
    {
        "type": "object",
        "properties": {
            "type": {"const": "stats"},
            "items": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {"label": {"type": "string"}, "value": {"type": "string"}, "icon": _ICON},
                    "required": ["label", "value"],
                    "additionalProperties": False,
                },
            },
        },
        "required": ["type", "items"],
        "additionalProperties": False,
    },
    {
        "type": "object",
        "properties": {"type": {"const": "note"}, "text": {"type": "string"}, "accentColor": _COLOR},
        "required": ["type", "text"],
        "additionalProperties": False,
    },
    {
        "type": "object",
        "properties": {
            "type": {"const": "steps"},
            "style": {"enum": ["number", "bullet"]},
            "items": {"type": "array", "items": {"type": "string"}},
            "accentColor": _COLOR,
        },
        "required": ["type", "style", "items"],
        "additionalProperties": False,
    },
    {
        "type": "object",
        "properties": {
            "type": {"const": "table"},
            "heading": {"type": "string"},
            "columns": {"type": "array", "items": {"type": "string"}},
            "rows": {"type": "array", "items": {"type": "array", "items": {"type": "string"}}},
            "accentColor": _COLOR,
        },
        "required": ["type", "columns", "rows"],
        "additionalProperties": False,
    },
    {
        # Simple chart drawn by the apps: horizontal bars ("bar") or progress bars out of `max` ("progress").
        "type": "object",
        "properties": {
            "type": {"const": "chart"},
            "style": {"enum": ["bar", "progress"]},
            "heading": {"type": "string"},
            "unit": {"type": "string", "description": "Shown after each value, e.g. kcal, %, min"},
            "max": {"type": "number", "description": "progress only: the full value (default 100)"},
            "items": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {"label": {"type": "string"}, "value": {"type": "number"}, "icon": _ICON},
                    "required": ["label", "value"],
                    "additionalProperties": False,
                },
            },
            "accentColor": _COLOR,
        },
        "required": ["type", "style", "items"],
        "additionalProperties": False,
    },
]

# Uses only features supported by Claude structured outputs (no length/number constraints).
DECK_SCHEMA = {
    "type": "object",
    "properties": {
        "deckTitle": {"type": "string"},
        "accentColor": _COLOR,
        "cards": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "title": {"type": "string"},
                    "subtitle": {"type": "string"},
                    "icon": _ICON,
                    "accentColor": _COLOR,
                    "blocks": {"type": "array", "items": {"anyOf": _BLOCKS}},
                },
                "required": ["title", "blocks"],
                "additionalProperties": False,
            },
        },
    },
    "required": ["deckTitle", "cards"],
    "additionalProperties": False,
}

MAX_CARDS = 40
MAX_CHART_ITEMS = 12
MAX_ICON_CHARS = 8  # one emoji can be several code points (skin tone, flags, ZWJ sequences)

FORMAT_GUIDE = """JSON format (use these exact field names):
{
  "deckTitle": "...",
  "accentColor": "#hex (optional)",
  "cards": [
    { "title": "...", "subtitle": "optional", "icon": "one emoji (optional)", "accentColor": "#hex (optional)", "blocks": [ ... ] }
  ]
}
Block types — use only these five:
- stats: { "type": "stats", "items": [ { "label": "...", "value": "...", "icon": "emoji (optional)" } ] }
- note:  { "type": "note", "text": "..." }
- steps: { "type": "steps", "style": "number" | "bullet", "items": [ "...", "..." ] }
- table: { "type": "table", "heading": "optional", "columns": [ "..." ], "rows": [ [ "...", "..." ] ] }
- chart: { "type": "chart", "style": "bar" | "progress", "heading": "optional", "unit": "optional, e.g. kcal",
           "max": 100 (progress only, optional), "items": [ { "label": "...", "value": 12.5, "icon": "emoji (optional)" } ] }
Icons and charts are optional extras:
- Give each card one fitting emoji "icon" (🍝 🏋️ 📜 ✈️ …); add stat icons only when they help. Never use more than one emoji per icon.
- Use a chart only for real numbers worth comparing (2–8 items, values are plain numbers without units, unit goes in "unit").
  "bar" compares amounts; "progress" shows parts of a whole (e.g. % of daily value, with "max": 100).
- Most cards need no chart. Don't invent numbers to fill one."""


class InvalidDeck(ValueError):
    """The AI returned something that isn't a usable deck. The message is fed back to the model on retry."""


def _check_icon(icon: str, where: str) -> None:
    icon = icon.strip()
    if not icon or len(icon) > MAX_ICON_CHARS or any(c.isalnum() and c.isascii() for c in icon):
        raise InvalidDeck(f"{where} must be a single emoji, not text.")


def _check_chart(block: dict, card_no: int) -> None:
    items = block["items"]
    if not 1 <= len(items) <= MAX_CHART_ITEMS:
        raise InvalidDeck(f"Card {card_no}: a chart needs 1 to {MAX_CHART_ITEMS} items.")
    values = [item["value"] for item in items]
    if any(isinstance(v, bool) or v != v or v in (float("inf"), float("-inf")) or v < 0 for v in values):
        raise InvalidDeck(f"Card {card_no}: chart values must be plain numbers of 0 or more.")
    for item in items:
        if "icon" in item:
            _check_icon(item["icon"], f"Card {card_no}: chart icon")
    if block["style"] == "progress":
        top = block.get("max", 100)
        if top <= 0:
            raise InvalidDeck(f"Card {card_no}: a progress chart's max must be more than 0.")
        if any(v > top for v in values):
            raise InvalidDeck(f"Card {card_no}: progress values can't be more than max ({top}).")
    elif not any(v > 0 for v in values):
        raise InvalidDeck(f"Card {card_no}: a bar chart needs at least one value above 0.")


def extract_json(text: str) -> dict:
    """Parse the model's text as JSON, tolerating markdown fences or text around the object."""
    text = text.strip()
    if text.startswith("```"):
        text = text.split("\n", 1)[1] if "\n" in text else ""
        text = text.rsplit("```", 1)[0]
    try:
        data = json.loads(text)
    except json.JSONDecodeError:
        start, end = text.find("{"), text.rfind("}")
        if start == -1 or end <= start:
            raise InvalidDeck("The response did not contain a JSON object.")
        try:
            data = json.loads(text[start : end + 1])
        except json.JSONDecodeError as exc:
            raise InvalidDeck(f"The JSON is invalid: {exc.msg} at position {exc.pos}.")
    if not isinstance(data, dict):
        raise InvalidDeck("The top level must be a JSON object.")
    return data


def validate_deck(data: dict, category_schema: dict | None = None) -> dict:
    """Check a generated deck against the app format (and the category schema, if any)."""
    try:
        jsonschema.validate(data, DECK_SCHEMA)
    except jsonschema.ValidationError as exc:
        where = "/".join(str(p) for p in exc.absolute_path) or "top level"
        raise InvalidDeck(f"The deck does not match the format at {where}: {exc.message}")
    if not data["deckTitle"].strip():
        raise InvalidDeck("deckTitle is empty.")
    cards = data["cards"]
    if not cards:
        raise InvalidDeck("The deck has no cards.")
    if len(cards) > MAX_CARDS:
        raise InvalidDeck(f"The deck has {len(cards)} cards; the maximum is {MAX_CARDS}.")
    for i, card in enumerate(cards):
        if not card["blocks"]:
            raise InvalidDeck(f"Card {i + 1} ({card['title']!r}) has no blocks.")
        if "icon" in card:
            _check_icon(card["icon"], f"Card {i + 1} icon")
        for block in card["blocks"]:
            if block["type"] == "stats":
                for item in block["items"]:
                    if "icon" in item:
                        _check_icon(item["icon"], f"Card {i + 1}: stat icon")
            if block["type"] == "chart":
                _check_chart(block, i + 1)
            if block["type"] == "table":
                width = len(block["columns"])
                if any(len(row) != width for row in block["rows"]):
                    raise InvalidDeck(
                        f"Card {i + 1}: every table row must have {width} cells, like the columns."
                    )
    if category_schema and any(k in category_schema for k in ("properties", "$schema", "type")):
        try:
            jsonschema.validate(data, category_schema)
        except jsonschema.ValidationError as exc:
            raise InvalidDeck(f"The deck does not match the category schema: {exc.message}")
    return data
