"""Tests for the global premium toggle: premium decks behave like hidden decks while it's off."""
import io


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
    # Still not downloadable until payments exist
    assert client.get(f"/decks/{premium['id']}/download", follow_redirects=False).status_code == 403
