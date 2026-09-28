"""Calls to AI providers. Each returns the model's raw text; parsing/validation happens in deck.py."""
import logging
from dataclasses import dataclass

import anthropic
import httpx

from app.ai.deck import DECK_SCHEMA

log = logging.getLogger("myflashcard.ai")

TIMEOUT_S = 120
MAX_OUTPUT_TOKENS = 16000

# Models that accept Anthropic's server-side refusal fallback (`fallbacks: "default"`).
_CLAUDE_FALLBACK_MODELS = {"claude-opus-5", "claude-fable-5", "claude-fable-5-1"}


class ProviderError(Exception):
    """A provider call failed. `message` is safe to show to users."""

    def __init__(self, message: str, *, admin_detail: str | None = None):
        super().__init__(message)
        self.message = message
        self.admin_detail = admin_detail or message


@dataclass
class Turn:
    role: str  # "user" | "assistant"
    text: str


async def call_provider(
    provider_id: str, api_key: str, model: str, system: str, turns: list[Turn], base_url: str | None = None
) -> str:
    if provider_id == "gemini":
        return await _gemini(api_key, model, system, turns)
    if provider_id == "claude":
        return await _claude(api_key, model, system, turns)
    if base_url:
        return await _openai_compatible(provider_id, base_url, api_key, model, system, turns)
    raise ProviderError("This AI provider isn't supported.", admin_detail=f"Unknown provider {provider_id!r}")


# ── Gemini (REST) ─────────────────────────────────────────────────────────

async def _gemini(api_key: str, model: str, system: str, turns: list[Turn]) -> str:
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
    body = {
        "systemInstruction": {"parts": [{"text": system}]},
        "contents": [
            {"role": "model" if t.role == "assistant" else "user", "parts": [{"text": t.text}]} for t in turns
        ],
        "generationConfig": {"responseMimeType": "application/json", "maxOutputTokens": MAX_OUTPUT_TOKENS},
    }
    try:
        async with httpx.AsyncClient(timeout=TIMEOUT_S) as client:
            r = await client.post(url, json=body, headers={"x-goog-api-key": api_key})
    except httpx.TimeoutException:
        raise ProviderError("The AI took too long to answer. Please try again.")
    except httpx.HTTPError as exc:
        raise ProviderError("Could not reach the AI service. Please try again.", admin_detail=str(exc))

    if r.status_code != 200:
        detail = r.text[:500]
        if r.status_code == 429:
            raise ProviderError("The AI service is busy right now. Please try again in a minute.", admin_detail=detail)
        if r.status_code in (400, 401, 403) and ("API_KEY" in detail or "PERMISSION" in detail):
            raise ProviderError("The AI service is not configured correctly.", admin_detail=f"Gemini rejected the API key: {detail}")
        if r.status_code == 404:
            raise ProviderError("The AI service is not configured correctly.", admin_detail=f"Gemini model {model!r} not found: {detail}")
        raise ProviderError("The AI service returned an error. Please try again.", admin_detail=f"Gemini HTTP {r.status_code}: {detail}")

    data = r.json()
    block = (data.get("promptFeedback") or {}).get("blockReason")
    if block:
        raise ProviderError("The AI declined this description. Try rewording it.", admin_detail=f"Gemini blocked prompt: {block}")
    candidates = data.get("candidates") or []
    if not candidates:
        raise ProviderError("The AI returned no answer. Please try again.", admin_detail=str(data)[:500])
    cand = candidates[0]
    if cand.get("finishReason") in ("SAFETY", "PROHIBITED_CONTENT", "BLOCKLIST", "SPII"):
        raise ProviderError("The AI declined this description. Try rewording it.", admin_detail=f"Gemini finishReason {cand['finishReason']}")
    text = "".join(p.get("text", "") for p in (cand.get("content") or {}).get("parts", []))
    if cand.get("finishReason") == "MAX_TOKENS":
        log.warning("Gemini hit max tokens")
    return text


# ── Claude (Anthropic SDK) ────────────────────────────────────────────────

async def _claude(api_key: str, model: str, system: str, turns: list[Turn]) -> str:
    client = anthropic.AsyncAnthropic(api_key=api_key, timeout=TIMEOUT_S, max_retries=1)
    kwargs: dict = {
        "model": model,
        "max_tokens": MAX_OUTPUT_TOKENS,
        "system": system,
        "messages": [{"role": t.role, "content": t.text} for t in turns],
        "output_config": {"format": {"type": "json_schema", "schema": DECK_SCHEMA}},
    }
    try:
        if model in _CLAUDE_FALLBACK_MODELS:
            # On a safety decline, Anthropic re-runs the request on its recommended fallback model.
            response = await client.beta.messages.create(
                **kwargs, betas=["server-side-fallback-2026-07-01"], fallbacks="default"
            )
        else:
            response = await client.messages.create(**kwargs)
    except anthropic.AuthenticationError as exc:
        raise ProviderError("The AI service is not configured correctly.", admin_detail=f"Claude rejected the API key: {exc.message}")
    except anthropic.PermissionDeniedError as exc:
        raise ProviderError("The AI service is not configured correctly.", admin_detail=f"Claude permission denied: {exc.message}")
    except anthropic.NotFoundError as exc:
        raise ProviderError("The AI service is not configured correctly.", admin_detail=f"Claude model {model!r} not found: {exc.message}")
    except anthropic.BadRequestError as exc:
        raise ProviderError("The AI service returned an error. Please try again.", admin_detail=f"Claude bad request: {exc.message}")
    except anthropic.RateLimitError as exc:
        raise ProviderError("The AI service is busy right now. Please try again in a minute.", admin_detail=f"Claude rate limit: {exc.message}")
    except anthropic.APITimeoutError:
        raise ProviderError("The AI took too long to answer. Please try again.")
    except anthropic.APIStatusError as exc:
        raise ProviderError("The AI service returned an error. Please try again.", admin_detail=f"Claude HTTP {exc.status_code}: {exc.message}")
    except anthropic.APIConnectionError as exc:
        raise ProviderError("Could not reach the AI service. Please try again.", admin_detail=f"Claude connection error: {exc}")

    if response.stop_reason == "refusal":
        category = getattr(response.stop_details, "category", None) if response.stop_details else None
        raise ProviderError("The AI declined this description. Try rewording it.", admin_detail=f"Claude refusal ({category})")
    if response.stop_reason == "max_tokens":
        log.warning("Claude hit max tokens (request %s)", response._request_id)
    return "".join(b.text for b in response.content if b.type == "text")


# ── OpenAI-compatible chat completions (Mistral, Groq, OpenAI, …) ──────────

OPENAI_COMPAT_MAX_TOKENS = 8000


async def _openai_compatible(
    provider_id: str, base_url: str, api_key: str, model: str, system: str, turns: list[Turn]
) -> str:
    name = provider_id.capitalize()
    url = f"{base_url.rstrip('/')}/chat/completions"
    body = {
        "model": model,
        "messages": [{"role": "system", "content": system}]
        + [{"role": t.role, "content": t.text} for t in turns],
        "response_format": {"type": "json_object"},
        "max_tokens": OPENAI_COMPAT_MAX_TOKENS,
    }
    try:
        async with httpx.AsyncClient(timeout=TIMEOUT_S) as client:
            r = await client.post(url, json=body, headers={"Authorization": f"Bearer {api_key}"})
    except httpx.TimeoutException:
        raise ProviderError("The AI took too long to answer. Please try again.")
    except httpx.HTTPError as exc:
        raise ProviderError("Could not reach the AI service. Please try again.", admin_detail=f"{name}: {exc}")

    if r.status_code != 200:
        detail = r.text[:500]
        if r.status_code in (401, 403):
            raise ProviderError("The AI service is not configured correctly.", admin_detail=f"{name} rejected the API key: {detail}")
        if r.status_code == 404:
            raise ProviderError("The AI service is not configured correctly.", admin_detail=f"{name} model {model!r} or URL not found: {detail}")
        if r.status_code == 429:
            raise ProviderError("The AI service is busy right now. Please try again in a minute.", admin_detail=f"{name} rate limit: {detail}")
        raise ProviderError("The AI service returned an error. Please try again.", admin_detail=f"{name} HTTP {r.status_code}: {detail}")

    try:
        choice = r.json()["choices"][0]
        text = choice["message"]["content"] or ""
    except (ValueError, KeyError, IndexError, TypeError):
        raise ProviderError("The AI returned no answer. Please try again.", admin_detail=f"{name} unexpected response: {r.text[:300]}")
    if choice.get("finish_reason") == "length":
        log.warning("%s hit max tokens", name)
    return text
