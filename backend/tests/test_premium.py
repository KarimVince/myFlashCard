"""Tests for the global premium toggle: premium decks behave like hidden decks while it's off."""
import io

import pytest


def _upload(client, auth_headers, sample_deck_json, is_free):
    resp = client.post(
        "/admin/decks",
        data={"category_slug": "recipe", "title": "Deck", "is_free": str(is_free).lower()},
        files={"json_file": ("deck.json", io.BytesIO(sample_deck_json), "application/json")},
        headers=auth_headers,
    )
    assert resp.status_code == 201
    return resp.json()


def _set_premium(client, auth_headers, enabled):
    resp = client.patch("/admin/settings/premium", json={"enabled": enabled}, headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["premium_enabled"] is enabled


def test_premium_off_by_default(client):
    assert client.get("/settings").json()["premium_enabled"] is False


def test_toggle_requires_auth(client):
    assert client.patch("/admin/settings/premium", json={"enabled": True}).status_code in (401, 403)


def test_toggle_persists(client, auth_headers):
    _set_premium(client, auth_headers, True)
    assert client.get("/settings").json()["premium_enabled"] is True
    assert client.get("/admin/settings", headers=auth_headers).json()["premium_enabled"] is True
    _set_premium(client, auth_headers, False)
    assert client.get("/settings").json()["premium_enabled"] is False


def test_premium_decks_hidden_when_inactive(client, auth_headers, sample_deck_json):
    free = _upload(client, auth_headers, sample_deck_json, True)
    premium = _upload(client, auth_headers, sample_deck_json, False)

    ids = [d["id"] for d in client.get("/decks").json()]
    assert free["id"] in ids
    assert premium["id"] not in ids
    assert client.get(f"/decks/{premium['id']}").status_code == 404
    recipe = next(c for c in client.get("/categories").json() if c["slug"] == "recipe")
    assert recipe["deck_count"] == 1

    # Admin still sees and can manage it
    admin_ids = [d["id"] for d in client.get("/admin/decks", headers=auth_headers).json()]
    assert premium["id"] in admin_ids


def test_premium_decks_listed_when_active(client, auth_headers, sample_deck_json):
    premium = _upload(client, auth_headers, sample_deck_json, False)
    _set_premium(client, auth_headers, True)

    listed = {d["id"]: d for d in client.get("/decks").json()}
    assert premium["id"] in listed
    assert listed[premium["id"]]["is_free"] is False
    # The file address isn't public: premium decks only come through the access-checked endpoint
    assert listed[premium["id"]]["public_url"] == ""
    assert client.get(f"/decks/{premium['id']}").json()["public_url"] == ""
    # Still not downloadable until payments exist
    assert client.get(f"/decks/{premium['id']}/download", follow_redirects=False).status_code == 403


# ── Premium decks: Silver and Gold only ───────────────────────────────────

def _member_headers(client, monkeypatch, tier):
    import app.api.auth as auth_api
    from app.models import User
    from tests.conftest import TestingSessionLocal

    monkeypatch.setattr(auth_api, "send_verification", lambda *a: None)
    resp = client.post("/auth/register", json={"alias": tier.title(), "email": f"{tier}@example.com", "password": "secret123"})
    db = TestingSessionLocal()
    db.get(User, resp.json()["user"]["id"]).tier = tier
    db.commit()
    db.close()
    return {"Authorization": f"Bearer {resp.json()['token']}"}


@pytest.fixture
def deck_file(monkeypatch):
    """Serve deck files from a fake R2."""
    import httpx

    import app.api.decks as decks_api

    real = httpx.AsyncClient

    class Client(real):
        def __init__(self, *a, **kw):
            kw.pop("transport", None)
            super().__init__(*a, transport=httpx.MockTransport(lambda r: httpx.Response(200, json={"deckTitle": "P"})), **kw)

    monkeypatch.setattr(decks_api.httpx, "AsyncClient", Client)


@pytest.mark.parametrize("tier,status", [("none", 403), ("bronze", 403), ("silver", 200), ("gold", 200)])
def test_premium_deck_content_by_level(client, auth_headers, sample_deck_json, monkeypatch, deck_file, tier, status):
    premium = _upload(client, auth_headers, sample_deck_json, False)
    _set_premium(client, auth_headers, True)
    headers = _member_headers(client, monkeypatch, tier)
    resp = client.get(f"/decks/{premium['id']}/content", headers=headers)
    assert resp.status_code == status
    if status == 403:
        assert "Silver and Gold" in resp.json()["detail"]
    # Anonymous visitors can't get it either
    assert client.get(f"/decks/{premium['id']}/content").status_code == 403


def test_free_deck_content_needs_no_login(client, auth_headers, sample_deck_json, deck_file):
    free = _upload(client, auth_headers, sample_deck_json, True)
    assert client.get(f"/decks/{free['id']}/content").status_code == 200
