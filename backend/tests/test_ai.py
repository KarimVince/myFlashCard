"""Tests for AI deck generation: providers, tokens, validation/retry, history, admin AI settings."""
import json

import pytest

import app.ai.service as service
import app.api.admin_ai as admin_ai
import app.api.auth as auth_api
from app.ai.deck import InvalidDeck, extract_json, validate_deck
from app.ai.providers import ProviderError
from app.crypto import encrypt
from app.models import AIProvider
from tests.conftest import TestingSessionLocal

GOOD_DECK = {
    "deckTitle": "Carbonara",
    "cards": [
        {"title": "Ingredients", "blocks": [{"type": "steps", "style": "bullet", "items": ["Eggs", "Pecorino"]}]},
        {"title": "Method", "blocks": [{"type": "note", "text": "No cream."}]},
    ],
}


@pytest.fixture(autouse=True)
def providers():
    db = TestingSessionLocal()
    db.add_all([
        AIProvider(id="gemini", label="Gemini", enabled=True, is_default=True, model="gemini-test",
                   api_key_enc=encrypt("gemini-secret-key-1234"), token_cost=1, sort_order=1),
        AIProvider(id="claude", label="Claude", enabled=True, is_default=False, model="claude-opus-5",
                   api_key_enc=encrypt("claude-secret-key-5678"), token_cost=2, requires_service="ai_claude", sort_order=2),
        AIProvider(id="mistral", label="Mistral", enabled=True, is_default=False, model="mistral-small-latest",
                   api_key_enc=encrypt("mistral-secret-key-4321"), token_cost=1, sort_order=3,
                   base_url="https://api.mistral.ai/v1"),
    ])
    db.commit()
    db.close()


@pytest.fixture
def ai_reply(monkeypatch):
    """Queue of fake provider replies (str = model text, Exception = raised). Records calls."""
    state = {"replies": [], "calls": []}

    async def fake_call(provider_id, api_key, model, system, turns, base_url=None):
        state["calls"].append({"provider": provider_id, "key": api_key, "model": model, "system": system,
                               "turns": turns, "base_url": base_url})
        reply = state["replies"].pop(0)
        if isinstance(reply, Exception):
            raise reply
        return reply

    monkeypatch.setattr(service, "call_provider", fake_call)
    monkeypatch.setattr(admin_ai, "call_provider", fake_call)
    return state


@pytest.fixture
def user(client, monkeypatch):
    """A registered, verified user. Returns (headers, user_id)."""
    box = []
    monkeypatch.setattr(auth_api, "send_verification", lambda to, alias, token: box.append(token))
    resp = client.post("/auth/register", json={"alias": "Maker", "email": "maker@example.com", "password": "secret123"})
    client.post("/auth/verify-email", json={"token": box[0]})
    return {"Authorization": f"Bearer {resp.json()['token']}"}, resp.json()["user"]["id"]


def _generate(client, headers, provider=None, description="A classic Roman pasta dish"):
    body = {"category_slug": "recipe", "description": description}
    if provider:
        body["provider"] = provider
    return client.post("/ai/generate", json=body, headers=headers)


# ── Deck validation ───────────────────────────────────────────────────────

def test_extract_json_handles_fences_and_chatter():
    assert extract_json("```json\n" + json.dumps(GOOD_DECK) + "\n```")["deckTitle"] == "Carbonara"
    assert extract_json("Here you go: " + json.dumps(GOOD_DECK) + " Enjoy!")["deckTitle"] == "Carbonara"
    with pytest.raises(InvalidDeck):
        extract_json("no json here")


@pytest.mark.parametrize("deck,msg", [
    ({"deckTitle": "X", "cards": []}, "no cards"),
    ({"deckTitle": "X", "cards": [{"title": "A", "blocks": [{"type": "video", "url": "x"}]}]}, "format"),
    ({"deckTitle": "X", "cards": [{"title": "A", "blocks": [
        {"type": "table", "columns": ["a", "b"], "rows": [["1"]]}]}]}, "table row"),
    ({"cards": [{"title": "A", "blocks": [{"type": "note", "text": "x"}]}]}, "deckTitle"),
])
def test_validate_deck_rejects_bad_decks(deck, msg):
    with pytest.raises(InvalidDeck, match=msg):
        validate_deck(deck)


# ── Options / balance ─────────────────────────────────────────────────────

def test_options_requires_login(client):
    assert client.get("/ai/options").status_code == 401


def test_options_free_user(client, user):
    headers, _ = user
    data = client.get("/ai/options", headers=headers).json()
    assert data["email_verified"] is True
    assert data["balance"]["monthly_allowance"] == 5 and data["balance"]["total"] == 5
    by_id = {p["id"]: p for p in data["providers"]}
    assert by_id["gemini"]["available"] is True and by_id["gemini"]["is_default"] is True
    assert by_id["claude"]["available"] is False and "access" in by_id["claude"]["reason"]


def test_premium_user_gets_premium_allowance(client, user, auth_headers):
    headers, uid = user
    client.put(f"/admin/users/{uid}/services/premium", json={"enabled": True}, headers=auth_headers)
    assert client.get("/ai/options", headers=headers).json()["balance"]["monthly_allowance"] == 15


def test_allowances_are_configurable(client, user, auth_headers):
    headers, _ = user
    resp = client.put("/admin/ai/allowances", json={"free_monthly": 3, "premium_monthly": 30}, headers=auth_headers)
    assert resp.status_code == 200 and resp.json()["free_monthly"] == 3
    assert client.get("/ai/options", headers=headers).json()["balance"]["total"] == 3
    assert client.put("/admin/ai/allowances", json={"free_monthly": -1, "premium_monthly": 5}, headers=auth_headers).status_code == 422


# ── Generate ──────────────────────────────────────────────────────────────

def test_generate_success_spends_token_and_saves_history(client, user, ai_reply):
    headers, _ = user
    ai_reply["replies"] = [json.dumps(GOOD_DECK)]
    resp = _generate(client, headers)
    assert resp.status_code == 200
    body = resp.json()
    assert body["generation"]["deck"]["deckTitle"] == "Carbonara"
    assert body["generation"]["card_count"] == 2
    assert body["balance"]["total"] == 4
    call = ai_reply["calls"][0]
    assert call["provider"] == "gemini" and call["key"] == "gemini-secret-key-1234"
    assert "Roman pasta" in call["turns"][0].text
    history = client.get("/me/generations", headers=headers).json()
    assert [g["title"] for g in history] == ["Carbonara"]
    one = client.get(f"/me/generations/{history[0]['id']}", headers=headers).json()
    assert one["deck"]["cards"][0]["title"] == "Ingredients"


def test_generate_requires_verified_email(client, ai_reply, monkeypatch):
    monkeypatch.setattr(auth_api, "send_verification", lambda *a: None)
    token = client.post("/auth/register", json={"alias": "New", "email": "new@example.com", "password": "secret123"}).json()["token"]
    resp = _generate(client, {"Authorization": f"Bearer {token}"})
    assert resp.status_code == 403 and "Confirm your email" in resp.json()["detail"]
    assert ai_reply["calls"] == []


def test_generate_validation(client, user):
    headers, _ = user
    assert _generate(client, headers, description="short").status_code == 422
    assert _generate(client, headers, description="x" * 1001).status_code == 422
    assert client.post("/ai/generate", json={"category_slug": "nope", "description": "A long enough topic"}, headers=headers).status_code == 404


def test_invalid_then_valid_retries_once(client, user, ai_reply):
    headers, _ = user
    bad = {"deckTitle": "X", "cards": [{"title": "A", "blocks": [{"type": "video"}]}]}
    ai_reply["replies"] = [json.dumps(bad), json.dumps(GOOD_DECK)]
    resp = _generate(client, headers)
    assert resp.status_code == 200 and resp.json()["balance"]["total"] == 4
    retry_turns = ai_reply["calls"][1]["turns"]
    assert [t.role for t in retry_turns] == ["user", "assistant", "user"]
    assert "not valid" in retry_turns[2].text


def test_invalid_twice_fails_without_spending(client, user, ai_reply, auth_headers):
    headers, _ = user
    ai_reply["replies"] = ["not json", "still not json"]
    resp = _generate(client, headers)
    assert resp.status_code == 502 and "usable deck" in resp.json()["detail"]
    assert client.get("/ai/options", headers=headers).json()["balance"]["total"] == 5
    assert client.get("/me/generations", headers=headers).json() == []
    failed = client.get("/admin/ai/generations?status=failed", headers=auth_headers).json()
    assert len(failed) == 1 and "Attempt 2" in failed[0]["error"]


def test_provider_error_shows_safe_message(client, user, ai_reply, auth_headers):
    headers, _ = user
    ai_reply["replies"] = [ProviderError("The AI service is busy right now.", admin_detail="Gemini HTTP 429: quota")]
    resp = _generate(client, headers)
    assert resp.status_code == 502 and resp.json()["detail"] == "The AI service is busy right now."
    assert "quota" not in resp.text
    assert client.get("/admin/ai/generations", headers=auth_headers).json()[0]["error"] == "Gemini HTTP 429: quota"


def test_out_of_tokens(client, user, ai_reply, auth_headers):
    headers, _ = user
    client.put("/admin/ai/allowances", json={"free_monthly": 1, "premium_monthly": 15}, headers=auth_headers)
    ai_reply["replies"] = [json.dumps(GOOD_DECK)]
    assert _generate(client, headers).status_code == 200
    resp = _generate(client, headers)
    assert resp.status_code == 402 and "resets on" in resp.json()["detail"]
    assert len(ai_reply["calls"]) == 1


def test_claude_needs_extra_access_and_costs_more(client, user, ai_reply, auth_headers):
    headers, uid = user
    assert _generate(client, headers, provider="claude").status_code == 403
    client.put(f"/admin/users/{uid}/services/ai_claude", json={"enabled": True}, headers=auth_headers)
    ai_reply["replies"] = [json.dumps(GOOD_DECK)]
    resp = _generate(client, headers, provider="claude")
    assert resp.status_code == 200 and resp.json()["balance"]["total"] == 3
    assert ai_reply["calls"][0]["key"] == "claude-secret-key-5678"


def test_disabled_provider(client, user, auth_headers):
    headers, _ = user
    client.patch("/admin/ai/providers/gemini", json={"enabled": False}, headers=auth_headers)
    assert _generate(client, headers, provider="gemini").status_code == 403


def test_no_provider_usable(client, user, auth_headers):
    headers, _ = user
    for pid in ("gemini", "mistral"):
        client.patch(f"/admin/ai/providers/{pid}", json={"enabled": False}, headers=auth_headers)
    # Claude is enabled but this user lacks access
    assert _generate(client, headers).status_code == 503


def test_default_falls_back_to_another_usable_provider(client, user, ai_reply, auth_headers):
    headers, _ = user
    client.patch("/admin/ai/providers/gemini", json={"enabled": False}, headers=auth_headers)
    ai_reply["replies"] = [json.dumps(GOOD_DECK)]
    assert _generate(client, headers).status_code == 200
    assert ai_reply["calls"][0]["provider"] == "mistral"


def test_history_is_private_and_deletable(client, user, ai_reply, monkeypatch):
    headers, _ = user
    ai_reply["replies"] = [json.dumps(GOOD_DECK)]
    gen_id = _generate(client, headers).json()["generation"]["id"]
    monkeypatch.setattr(auth_api, "send_verification", lambda *a: None)
    other = client.post("/auth/register", json={"alias": "Other", "email": "o@example.com", "password": "secret123"}).json()["token"]
    assert client.get(f"/me/generations/{gen_id}", headers={"Authorization": f"Bearer {other}"}).status_code == 404
    assert client.delete(f"/me/generations/{gen_id}", headers=headers).status_code == 204
    assert client.get("/me/generations", headers=headers).json() == []
    # Deleting from history doesn't refund the token
    assert client.get("/ai/options", headers=headers).json()["balance"]["total"] == 4


def test_members_show_tokens_used(client, user, ai_reply, auth_headers):
    headers, uid = user
    ai_reply["replies"] = [json.dumps(GOOD_DECK)]
    _generate(client, headers)
    member = next(u for u in client.get("/admin/users", headers=auth_headers).json() if u["id"] == uid)
    assert member["tokens_used_month"] == 1


def test_deleting_account_removes_generations(client, user, ai_reply, auth_headers):
    headers, _ = user
    ai_reply["replies"] = [json.dumps(GOOD_DECK)]
    _generate(client, headers)
    client.request("DELETE", "/me", json={"password": "secret123"}, headers=headers)
    assert client.get("/admin/ai/generations", headers=auth_headers).json() == []


# ── Admin AI settings ─────────────────────────────────────────────────────

def test_admin_ai_requires_admin(client, user):
    headers, _ = user
    assert client.get("/admin/ai", headers=headers).status_code == 401


def test_admin_keys_are_masked(client, auth_headers):
    data = client.get("/admin/ai", headers=auth_headers).json()
    gemini = next(p for p in data["providers"] if p["id"] == "gemini")
    assert gemini["has_key"] is True and gemini["key_hint"] == "••••1234"
    assert "gemini-secret-key" not in json.dumps(data)


def test_admin_update_provider(client, auth_headers):
    resp = client.patch("/admin/ai/providers/claude", json={
        "api_key": "  new-claude-key-9999 ", "model": "claude-sonnet-5", "token_cost": 3, "is_default": True,
    }, headers=auth_headers)
    assert resp.status_code == 200
    body = resp.json()
    assert body["key_hint"] == "••••9999" and body["model"] == "claude-sonnet-5" and body["token_cost"] == 3
    providers = {p["id"]: p for p in client.get("/admin/ai", headers=auth_headers).json()["providers"]}
    assert providers["claude"]["is_default"] and not providers["gemini"]["is_default"]
    # Removing the key while enabled is refused
    assert client.patch("/admin/ai/providers/claude", json={"api_key": ""}, headers=auth_headers).status_code == 422
    assert client.patch("/admin/ai/providers/claude", json={"token_cost": 0}, headers=auth_headers).status_code == 422
    assert client.patch("/admin/ai/providers/nope", json={"enabled": True}, headers=auth_headers).status_code == 404


def test_admin_test_provider(client, auth_headers, ai_reply):
    ai_reply["replies"] = [json.dumps(GOOD_DECK), ProviderError("x", admin_detail="Claude rejected the API key")]
    ok = client.post("/admin/ai/providers/gemini/test", headers=auth_headers).json()
    assert ok["ok"] is True and "Carbonara" in ok["message"]
    bad = client.post("/admin/ai/providers/claude/test", headers=auth_headers).json()
    assert bad["ok"] is False and bad["message"] == "Claude rejected the API key"


# ── Mistral / OpenAI-compatible ───────────────────────────────────────────

def test_mistral_generation_passes_base_url(client, user, ai_reply):
    headers, _ = user
    ai_reply["replies"] = [json.dumps(GOOD_DECK)]
    assert _generate(client, headers, provider="mistral").status_code == 200
    call = ai_reply["calls"][0]
    assert call["base_url"] == "https://api.mistral.ai/v1" and call["key"] == "mistral-secret-key-4321"


def test_admin_base_url_rules(client, auth_headers):
    ok = client.patch("/admin/ai/providers/mistral", json={"base_url": "https://api.mistral.ai/v1/"}, headers=auth_headers)
    assert ok.status_code == 200 and ok.json()["base_url"] == "https://api.mistral.ai/v1"
    assert client.patch("/admin/ai/providers/mistral", json={"base_url": "http://evil.example"}, headers=auth_headers).status_code == 422
    assert client.patch("/admin/ai/providers/claude", json={"base_url": "https://x.example"}, headers=auth_headers).status_code == 422


def _patch_transport(monkeypatch, handler):
    import httpx

    import app.ai.providers as providers

    real = httpx.AsyncClient

    class Client(real):
        def __init__(self, *a, **kw):
            super().__init__(*a, transport=httpx.MockTransport(handler), **kw)

    monkeypatch.setattr(providers.httpx, "AsyncClient", Client)


@pytest.mark.anyio
async def test_openai_compatible_request_and_parse(monkeypatch):
    import httpx

    from app.ai.providers import Turn, call_provider

    seen = {}

    def handler(request: httpx.Request):
        seen["url"] = str(request.url)
        seen["auth"] = request.headers["authorization"]
        seen["body"] = json.loads(request.content)
        return httpx.Response(200, json={"choices": [{"message": {"content": "{\"ok\": 1}"}, "finish_reason": "stop"}]})

    _patch_transport(monkeypatch, handler)
    text = await call_provider("mistral", "k-123", "mistral-small-latest", "SYS", [Turn("user", "hi")], "https://api.mistral.ai/v1")
    assert text == '{"ok": 1}'
    assert seen["url"] == "https://api.mistral.ai/v1/chat/completions"
    assert seen["auth"] == "Bearer k-123"
    assert seen["body"]["messages"][0] == {"role": "system", "content": "SYS"}
    assert seen["body"]["response_format"] == {"type": "json_object"}


@pytest.mark.anyio
@pytest.mark.parametrize("status,expected", [
    (401, "rejected the API key"),
    (429, "rate limit"),
    (404, "not found"),
    (500, "HTTP 500"),
])
async def test_openai_compatible_errors(monkeypatch, status, expected):
    import httpx

    from app.ai.providers import Turn, call_provider

    _patch_transport(monkeypatch, lambda request: httpx.Response(status, json={"message": "nope"}))
    with pytest.raises(ProviderError) as exc:
        await call_provider("mistral", "k", "m", "S", [Turn("user", "hi")], "https://api.mistral.ai/v1")
    assert expected in exc.value.admin_detail
