"""Tests for AI deck generation: Premium levels, own keys, tokens, validation/retry, history, admin AI settings."""
import json

import pytest

import app.ai.service as service
import app.api.auth as auth_api
from app.ai.deck import InvalidDeck, extract_json, validate_deck
from app.ai.providers import ProviderError
from app.crypto import encrypt
from app.models import AIProvider, AppSetting, TokenLedger, User, UserAIKey
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
                   api_key_enc=encrypt("claude-secret-key-5678"), token_cost=2, sort_order=2),
        AIProvider(id="mistral", label="Mistral", enabled=True, is_default=False, model="mistral-small-latest",
                   api_key_enc=encrypt("mistral-secret-key-4321"), token_cost=1, sort_order=3,
                   base_url="https://api.mistral.ai/v1"),
        # Premium is live in these tests; the "off" behaviour is tested explicitly.
        AppSetting(key="premium_enabled", value=True),
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
    return state


def _set(user_id, **fields):
    db = TestingSessionLocal()
    u = db.get(User, user_id)
    for k, v in fields.items():
        setattr(u, k, v)
    db.commit()
    db.close()


def _set_flag(key, value):
    db = TestingSessionLocal()
    db.merge(AppSetting(key=key, value=value))
    db.commit()
    db.close()


def _member(client, monkeypatch, alias="Maker", tier="gold", verified=True):
    """Register a member at a Premium level. Returns (headers, user_id)."""
    box = []
    monkeypatch.setattr(auth_api, "send_verification", lambda to, alias, token: box.append(token))
    resp = client.post("/auth/register", json={"alias": alias, "email": f"{alias.lower()}@example.com", "password": "secret123"})
    if verified:
        client.post("/auth/verify-email", json={"token": box[0]})
    uid = resp.json()["user"]["id"]
    _set(uid, tier=tier)
    return {"Authorization": f"Bearer {resp.json()['token']}"}, uid


@pytest.fixture
def user(client, monkeypatch):
    """A verified Gold member. Returns (headers, user_id)."""
    return _member(client, monkeypatch)


@pytest.fixture
def admin(client, monkeypatch):
    """A verified admin account (no Premium level). Returns (headers, user_id)."""
    headers, uid = _member(client, monkeypatch, alias="Boss", tier="none")
    _set(uid, role="admin")
    return headers, uid


def _generate(client, headers, provider=None, description="A classic Roman pasta dish", source=None):
    body = {"category_slug": "recipe", "description": description}
    if provider:
        body["provider"] = provider
    if source:
        body["source"] = source
    return client.post("/ai/generate", json=body, headers=headers)


def _options(client, headers):
    return client.get("/ai/options", headers=headers).json()


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


# ── Access by level ───────────────────────────────────────────────────────

def test_options_requires_login(client):
    assert client.get("/ai/options").status_code == 401


def test_options_gold_member(client, user):
    headers, _ = user
    data = _options(client, headers)
    assert data["tier"] == "gold" and data["can_generate"] and data["shared"] and data["own_key_allowed"]
    assert data["balance"]["allowance"] == 10 and data["balance"]["total"] == 10
    assert data["balance"]["period"] == "month" and data["balance"]["resets_on"]
    by_id = {p["id"]: p for p in data["providers"]}
    assert by_id["gemini"]["available"] and by_id["gemini"]["is_default"]
    assert by_id["claude"]["available"] and by_id["claude"]["token_cost"] == 2
    assert {p["id"] for p in data["key_providers"]} == {"gemini", "claude", "mistral"}
    assert data["own_key"] is None


@pytest.mark.parametrize("tier,can,shared,allowance,period", [
    ("none", False, False, 0, None),
    ("bronze", True, False, 0, None),
    ("silver", True, True, 3, "total"),
    ("gold", True, True, 10, "month"),
])
def test_options_by_level(client, monkeypatch, tier, can, shared, allowance, period):
    headers, _ = _member(client, monkeypatch, tier=tier)
    data = _options(client, headers)
    assert data["can_generate"] is can and data["shared"] is shared and data["own_key_allowed"] is can
    assert data["balance"]["allowance"] == allowance and data["balance"]["period"] == period
    assert bool(data["providers"]) is shared
    if not can:
        assert "Premium members" in data["reason"]


def test_no_premium_level_cannot_generate(client, monkeypatch, ai_reply):
    headers, _ = _member(client, monkeypatch, tier="none")
    resp = _generate(client, headers)
    assert resp.status_code == 403 and "Premium members" in resp.json()["detail"]
    assert ai_reply["calls"] == []


@pytest.mark.parametrize("flag", ["premium_enabled", "ai_enabled"])
def test_members_wait_for_launch_switches(client, user, ai_reply, flag):
    headers, _ = user
    _set_flag(flag, False)
    data = _options(client, headers)
    assert data["can_generate"] is False and "isn't open" in data["reason"]
    assert _generate(client, headers).status_code == 403


def test_admin_can_always_generate_without_tokens(client, admin, ai_reply):
    headers, _ = admin
    _set_flag("premium_enabled", False)
    _set_flag("ai_enabled", False)
    data = _options(client, headers)
    assert data["can_generate"] and data["is_admin"] and data["balance"]["unlimited"]
    ai_reply["replies"] = [json.dumps(GOOD_DECK)] * 2
    for _ in range(2):
        resp = _generate(client, headers)
        assert resp.status_code == 200 and resp.json()["generation"]["tokens_spent"] == 0


def test_allowances_are_configurable(client, monkeypatch, auth_headers):
    resp = client.put("/admin/ai/allowances", json={"silver_total": 5, "gold_monthly": 30}, headers=auth_headers)
    assert resp.status_code == 200 and resp.json()["silver_total"] == 5 and resp.json()["gold_monthly"] == 30
    silver, _ = _member(client, monkeypatch, alias="Silv", tier="silver")
    assert _options(client, silver)["balance"]["total"] == 5
    assert client.put("/admin/ai/allowances", json={"silver_total": -1, "gold_monthly": 5}, headers=auth_headers).status_code == 422


# ── Generate with the site's AI ───────────────────────────────────────────

def test_generate_success_spends_token_and_saves_history(client, user, ai_reply):
    headers, _ = user
    ai_reply["replies"] = [json.dumps(GOOD_DECK)]
    resp = _generate(client, headers)
    assert resp.status_code == 200
    body = resp.json()
    assert body["generation"]["deck"]["deckTitle"] == "Carbonara"
    assert body["generation"]["card_count"] == 2 and body["generation"]["key_source"] == "shared"
    assert body["balance"]["total"] == 9
    call = ai_reply["calls"][0]
    assert call["provider"] == "gemini" and call["key"] == "gemini-secret-key-1234"
    assert "Roman pasta" in call["turns"][0].text
    history = client.get("/me/generations", headers=headers).json()
    assert [g["title"] for g in history] == ["Carbonara"]
    one = client.get(f"/me/generations/{history[0]['id']}", headers=headers).json()
    assert one["deck"]["cards"][0]["title"] == "Ingredients"


def test_generate_requires_verified_email(client, monkeypatch, ai_reply):
    headers, _ = _member(client, monkeypatch, alias="New", verified=False)
    resp = _generate(client, headers)
    assert resp.status_code == 403 and "Confirm your email" in resp.json()["detail"]
    assert ai_reply["calls"] == []


def test_generate_validation(client, user):
    headers, _ = user
    assert _generate(client, headers, description="short").status_code == 422
    assert _generate(client, headers, description="x" * 1001).status_code == 422
    assert _generate(client, headers, source="mine").status_code == 422
    assert client.post("/ai/generate", json={"category_slug": "nope", "description": "A long enough topic"}, headers=headers).status_code == 404


def test_invalid_then_valid_retries_once(client, user, ai_reply):
    headers, _ = user
    bad = {"deckTitle": "X", "cards": [{"title": "A", "blocks": [{"type": "video"}]}]}
    ai_reply["replies"] = [json.dumps(bad), json.dumps(GOOD_DECK)]
    resp = _generate(client, headers)
    assert resp.status_code == 200 and resp.json()["balance"]["total"] == 9
    retry_turns = ai_reply["calls"][1]["turns"]
    assert [t.role for t in retry_turns] == ["user", "assistant", "user"]
    assert "not valid" in retry_turns[2].text


def test_invalid_twice_fails_without_spending(client, user, ai_reply, auth_headers):
    headers, _ = user
    ai_reply["replies"] = ["not json", "still not json"]
    resp = _generate(client, headers)
    assert resp.status_code == 502 and "usable deck" in resp.json()["detail"]
    assert _options(client, headers)["balance"]["total"] == 10
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


def test_gold_runs_out_for_the_month(client, user, ai_reply, auth_headers):
    headers, _ = user
    client.put("/admin/ai/allowances", json={"silver_total": 3, "gold_monthly": 1}, headers=auth_headers)
    ai_reply["replies"] = [json.dumps(GOOD_DECK)]
    assert _generate(client, headers).status_code == 200
    resp = _generate(client, headers)
    assert resp.status_code == 402 and "renews on" in resp.json()["detail"]
    assert len(ai_reply["calls"]) == 1


def test_silver_allowance_is_in_total_not_per_month(client, monkeypatch, ai_reply):
    headers, uid = _member(client, monkeypatch, alias="Silv", tier="silver")
    db = TestingSessionLocal()
    # Two decks used in an earlier month still count for Silver.
    db.add_all([TokenLedger(user_id=uid, delta=-1, source="shared", period="2020-01") for _ in range(2)])
    db.commit()
    db.close()
    assert _options(client, headers)["balance"]["total"] == 1
    ai_reply["replies"] = [json.dumps(GOOD_DECK)]
    assert _generate(client, headers).status_code == 200
    resp = _generate(client, headers)
    assert resp.status_code == 402 and "used up" in resp.json()["detail"]


def test_claude_costs_more(client, user, ai_reply):
    headers, _ = user
    ai_reply["replies"] = [json.dumps(GOOD_DECK)]
    resp = _generate(client, headers, provider="claude")
    assert resp.status_code == 200 and resp.json()["balance"]["total"] == 8
    assert ai_reply["calls"][0]["key"] == "claude-secret-key-5678"


def test_disabled_provider(client, user, auth_headers):
    headers, _ = user
    client.patch("/admin/ai/providers/gemini", json={"enabled": False}, headers=auth_headers)
    assert _generate(client, headers, provider="gemini").status_code == 403


def test_no_provider_usable(client, user, auth_headers):
    headers, _ = user
    for pid in ("gemini", "claude", "mistral"):
        client.patch(f"/admin/ai/providers/{pid}", json={"enabled": False}, headers=auth_headers)
    assert _generate(client, headers).status_code == 503


def test_default_falls_back_to_another_usable_provider(client, user, ai_reply, auth_headers):
    headers, _ = user
    client.patch("/admin/ai/providers/gemini", json={"enabled": False}, headers=auth_headers)
    ai_reply["replies"] = [json.dumps(GOOD_DECK)]
    assert _generate(client, headers).status_code == 200
    assert ai_reply["calls"][0]["provider"] == "claude"


# ── The member's own key ──────────────────────────────────────────────────

def test_own_key_needs_a_premium_level(client, monkeypatch):
    headers, _ = _member(client, monkeypatch, tier="none")
    resp = client.put("/me/ai-key", json={"provider": "mistral", "api_key": "my-key-0000"}, headers=headers)
    assert resp.status_code == 403


def test_own_key_is_saved_masked_and_replaceable(client, monkeypatch):
    headers, _ = _member(client, monkeypatch, tier="bronze")
    resp = client.put("/me/ai-key", json={"provider": "mistral", "api_key": "  my-mistral-key-7777 "}, headers=headers)
    assert resp.status_code == 200
    assert resp.json()["key_hint"] == "••••7777" and resp.json()["model"] == "mistral-small-latest"
    data = _options(client, headers)
    assert data["own_key"]["provider"] == "mistral" and "my-mistral-key" not in json.dumps(data)
    replaced = client.put("/me/ai-key", json={"provider": "gemini", "api_key": "my-gemini-key-8888"}, headers=headers)
    assert replaced.json()["provider"] == "gemini" and replaced.json()["key_hint"] == "••••8888"
    assert client.put("/me/ai-key", json={"provider": "nope", "api_key": "k-123456789"}, headers=headers).status_code == 404
    assert client.put("/me/ai-key", json={"provider": "gemini", "api_key": "two words"}, headers=headers).status_code == 422
    assert client.delete("/me/ai-key", headers=headers).status_code == 204
    assert _options(client, headers)["own_key"] is None


def test_bronze_generates_with_own_key_for_free(client, monkeypatch, ai_reply, auth_headers):
    headers, _ = _member(client, monkeypatch, tier="bronze")
    resp = _generate(client, headers)
    assert resp.status_code == 403 and "own API key" in resp.json()["detail"]
    client.put("/me/ai-key", json={"provider": "mistral", "api_key": "my-mistral-key-7777"}, headers=headers)
    # Asking for the site's AI is refused for Bronze
    assert _generate(client, headers, source="shared").status_code == 403
    ai_reply["replies"] = [json.dumps(GOOD_DECK)]
    resp = _generate(client, headers)
    assert resp.status_code == 200
    gen = resp.json()["generation"]
    assert gen["key_source"] == "own" and gen["tokens_spent"] == 0 and gen["provider"] == "mistral"
    call = ai_reply["calls"][0]
    assert call["key"] == "my-mistral-key-7777" and call["base_url"] == "https://api.mistral.ai/v1"
    # Uses the model set in AI Card
    client.patch("/admin/ai/providers/mistral", json={"model": "mistral-large-latest"}, headers=auth_headers)
    ai_reply["replies"] = [json.dumps(GOOD_DECK)]
    _generate(client, headers)
    assert ai_reply["calls"][1]["model"] == "mistral-large-latest"


def test_gold_switches_to_own_key_when_shared_runs_out(client, user, ai_reply, auth_headers):
    headers, _ = user
    client.put("/admin/ai/allowances", json={"silver_total": 3, "gold_monthly": 1}, headers=auth_headers)
    client.put("/me/ai-key", json={"provider": "mistral", "api_key": "my-mistral-key-7777"}, headers=headers)
    ai_reply["replies"] = [json.dumps(GOOD_DECK)] * 3
    first = _generate(client, headers).json()["generation"]
    second = _generate(client, headers).json()["generation"]
    assert (first["key_source"], second["key_source"]) == ("shared", "own")
    resp = _generate(client, headers, source="shared")
    assert resp.status_code == 402 and "own API key" in resp.json()["detail"]
    # The member can also pick their own key while shared decks remain
    client.put("/admin/ai/allowances", json={"silver_total": 3, "gold_monthly": 10}, headers=auth_headers)
    assert _generate(client, headers, source="own").json()["generation"]["key_source"] == "own"


def test_own_source_without_key(client, user):
    headers, _ = user
    resp = _generate(client, headers, source="own")
    assert resp.status_code == 403 and "AI settings" in resp.json()["detail"]


def test_test_own_key(client, monkeypatch, ai_reply):
    headers, _ = _member(client, monkeypatch, tier="bronze")
    assert client.post("/me/ai-key/test", headers=headers).status_code == 404
    client.put("/me/ai-key", json={"provider": "gemini", "api_key": "my-gemini-key-8888"}, headers=headers)
    ai_reply["replies"] = [json.dumps(GOOD_DECK), ProviderError("x", admin_detail="Gemini rejected the API key")]
    ok = client.post("/me/ai-key/test", headers=headers).json()
    assert ok["ok"] is True and ai_reply["calls"][0]["key"] == "my-gemini-key-8888"
    assert _options(client, headers)["own_key"]["last_test_ok"] is True
    bad = client.post("/me/ai-key/test", headers=headers).json()
    assert bad["ok"] is False and bad["message"].startswith("Gemini rejected this key. Check you copied")
    assert _options(client, headers)["own_key"]["last_test_ok"] is False


def test_own_key_deleted_with_account(client, monkeypatch):
    headers, uid = _member(client, monkeypatch, tier="bronze")
    client.put("/me/ai-key", json={"provider": "gemini", "api_key": "my-gemini-key-8888"}, headers=headers)
    client.request("DELETE", "/me", json={"password": "secret123"}, headers=headers)
    db = TestingSessionLocal()
    assert db.query(UserAIKey).count() == 0
    db.close()


# ── History and admin views ───────────────────────────────────────────────

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
    assert _options(client, headers)["balance"]["total"] == 9


def test_members_show_tokens_used_and_own_key(client, user, ai_reply, auth_headers):
    headers, uid = user
    ai_reply["replies"] = [json.dumps(GOOD_DECK)]
    _generate(client, headers)
    client.put("/me/ai-key", json={"provider": "mistral", "api_key": "my-mistral-key-7777"}, headers=headers)
    member = next(u for u in client.get("/admin/users", headers=auth_headers).json() if u["id"] == uid)
    assert member["tokens_used_month"] == 1 and member["own_key_provider"] == "mistral" and member["tier"] == "gold"


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
async def test_rate_limit_is_retried_once(monkeypatch):
    import httpx

    import app.ai.providers as providers
    from app.ai.providers import Turn, call_provider

    monkeypatch.setattr(providers.asyncio, "sleep", lambda s: _noop())
    responses = [
        httpx.Response(429, headers={"retry-after": "1"}, json={"message": "Rate limit exceeded"}),
        httpx.Response(200, json={"choices": [{"message": {"content": "{}"}, "finish_reason": "stop"}]}),
    ]
    _patch_transport(monkeypatch, lambda request: responses.pop(0))
    assert await call_provider("mistral", "k", "m", "S", [Turn("user", "hi")], "https://api.mistral.ai/v1") == "{}"
    assert responses == []


async def _noop():
    return None


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


@pytest.mark.anyio
async def test_groq_request_url(monkeypatch):
    import httpx

    from app.ai.providers import Turn, call_provider

    seen = {}

    def handler(request: httpx.Request):
        seen["url"] = str(request.url)
        seen["model"] = json.loads(request.content)["model"]
        return httpx.Response(200, json={"choices": [{"message": {"content": "{}"}, "finish_reason": "stop"}]})

    _patch_transport(monkeypatch, handler)
    text = await call_provider("groq", "gsk_test", "llama-3.3-70b-versatile", "S", [Turn("user", "hi")], "https://api.groq.com/openai/v1")
    assert text == "{}"
    assert seen["url"] == "https://api.groq.com/openai/v1/chat/completions"
    assert seen["model"] == "llama-3.3-70b-versatile"


def test_invalid_secrets_key_gives_clear_error(client, auth_headers, monkeypatch):
    from app.config import settings

    monkeypatch.setattr(settings, "secrets_key", "not-a-fernet-key")
    r = client.patch("/admin/ai/providers/mistral", json={"api_key": "abc"}, headers=auth_headers)
    assert r.status_code == 500 and "SECRETS_KEY is not a valid key" in r.json()["detail"]


def test_enable_without_key_explains_what_to_do(client, auth_headers):
    client.patch("/admin/ai/providers/mistral", json={"enabled": False, "api_key": ""}, headers=auth_headers)
    r = client.patch("/admin/ai/providers/mistral", json={"enabled": True}, headers=auth_headers)
    assert r.status_code == 422 and "press Save" in r.json()["detail"]
    ok = client.patch("/admin/ai/providers/mistral", json={"enabled": True, "api_key": "gsk_new"}, headers=auth_headers)
    assert ok.status_code == 200 and ok.json()["has_key"] and ok.json()["enabled"]


# ── Publishing an AI deck to the library (admin) ──────────────────────────

def test_admin_publishes_ai_deck_to_library(client, admin, ai_reply, auth_headers):
    headers, _ = admin
    ai_reply["replies"] = [json.dumps(GOOD_DECK)]
    gen_id = _generate(client, headers).json()["generation"]["id"]
    body = {"title": "Roman Carbonara", "description": "The real one", "language": "it", "is_free": True}
    resp = client.post(f"/admin/ai/generations/{gen_id}/publish", json=body, headers=headers)
    assert resp.status_code == 201
    deck = resp.json()
    assert deck["title"] == "Roman Carbonara" and deck["author"] == "Boss" and deck["card_count"] == 2
    assert deck["language"] == "it" and deck["is_free"] and deck["is_public"]
    assert any(d["id"] == deck["id"] for d in client.get("/decks").json())
    # Remembered on the generation, and only once
    assert client.get("/me/generations", headers=headers).json()[0]["published_deck_id"] == deck["id"]
    again = client.post(f"/admin/ai/generations/{gen_id}/publish", json=body, headers=headers)
    assert again.status_code == 409
    # The legacy admin password can publish too; validation applies
    assert client.post(f"/admin/ai/generations/{gen_id}/publish", json={"title": " "}, headers=auth_headers).status_code == 422


def test_members_cannot_publish(client, user, ai_reply):
    headers, _ = user
    ai_reply["replies"] = [json.dumps(GOOD_DECK)]
    gen_id = _generate(client, headers).json()["generation"]["id"]
    assert client.post(f"/admin/ai/generations/{gen_id}/publish", json={"title": "X"}, headers=headers).status_code == 401


def test_publish_unknown_or_failed_generation(client, admin, ai_reply, auth_headers):
    headers, _ = admin
    assert client.post("/admin/ai/generations/999/publish", json={"title": "X"}, headers=headers).status_code == 404
    ai_reply["replies"] = ["not json", "still not json"]
    _generate(client, headers)
    failed = client.get("/admin/ai/generations?status=failed", headers=auth_headers).json()[0]
    assert client.post(f"/admin/ai/generations/{failed['id']}/publish", json={"title": "X"}, headers=headers).status_code == 404
