"""Deck format for AI generation: the JSON schema sent to providers and the checks every result must pass."""
import json

import jsonschema

_COLOR = {"type": "string", "description": "Hex colour like #1E88E5"}

_BLOCKS = [
    {
        "type": "object",
        "properties": {
            "type": {"const": "stats"},
            "items": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {"label": {"type": "string"}, "value": {"type": "string"}},
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

FORMAT_GUIDE = """JSON format (use these exact field names):
{
  "deckTitle": "...",
  "accentColor": "#hex (optional)",
  "cards": [
    { "title": "...", "subtitle": "optional", "accentColor": "#hex (optional)", "blocks": [ ... ] }
  ]
}
Block types — use only these four:
- stats: { "type": "stats", "items": [ { "label": "...", "value": "..." } ] }
- note:  { "type": "note", "text": "..." }
- steps: { "type": "steps", "style": "number" | "bullet", "items": [ "...", "..." ] }
- table: { "type": "table", "heading": "optional", "columns": [ "..." ], "rows": [ [ "...", "..." ] ] }"""


class InvalidDeck(ValueError):
    """The AI returned something that isn't a usable deck. The message is fed back to the model on retry."""


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
        for block in card["blocks"]:
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
