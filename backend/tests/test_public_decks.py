"""Tests for public deck endpoints: GET /decks and GET /decks/{id}/download."""
import pytest
import io


def _upload_deck(client, auth_headers, sample_deck_json, category="recipe"):
    resp = client.post(
        "/admin/decks",
        data={"category_slug": category, "title": "Test Deck", "language": "en"},
        files={"json_file": ("deck.json", io.BytesIO(sample_deck_json), "application/json")},
        headers=auth_headers,
    )
    assert resp.status_code == 201
    return resp.json()


def test_list_returns_200(client):
    resp = client.get("/decks")
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


def test_list_only_public(client, auth_headers, sample_deck_json):
    deck = _upload_deck(client, auth_headers, sample_deck_json)
    # Hide it
    client.patch(
        f"/admin/decks/{deck['id']}/visibility",
        json={"is_public": False},
        headers=auth_headers,
    )
    resp = client.get("/decks")
    ids = [d["id"] for d in resp.json()]
    assert deck["id"] not in ids


def test_list_filter_by_category(client, auth_headers, sample_deck_json):
    _upload_deck(client, auth_headers, sample_deck_json, "recipe")
    _upload_deck(client, auth_headers, sample_deck_json, "study")
    resp = client.get("/decks?category=recipe")
    assert resp.status_code == 200
    for d in resp.json():
        assert d["category"]["slug"] == "recipe"


def test_get_deck_fields(client, auth_headers, sample_deck_json):
    deck = _upload_deck(client, auth_headers, sample_deck_json)
    resp = client.get(f"/decks/{deck['id']}")
    assert resp.status_code == 200
    data = resp.json()
    for field in ("id", "title", "category", "public_url", "downloads"):
        assert field in data, f"Missing field: {field}"


@pytest.fixture
def stored_file(monkeypatch):
    """Serve deck files from a fake storage."""
    import httpx

    import app.api.decks as decks_api

    real = httpx.AsyncClient

    class Client(real):
        def __init__(self, *a, **kw):
            kw.pop("transport", None)
            super().__init__(*a, transport=httpx.MockTransport(lambda r: httpx.Response(200, json={"deckTitle": "X"})), **kw)

    monkeypatch.setattr(decks_api.httpx, "AsyncClient", Client)


def test_download_is_an_attachment_not_a_redirect(client, auth_headers, sample_deck_json, stored_file):
    """Browsers show JSON from another site as a page; serving it as an attachment always saves it."""
    deck = _upload_deck(client, auth_headers, sample_deck_json)
    resp = client.get(f"/decks/{deck['id']}/download", follow_redirects=False)
    assert resp.status_code == 200
    assert resp.headers["content-disposition"] == 'attachment; filename="test-deck.json"'
    assert resp.headers["content-type"].startswith("application/json")
    assert resp.json() == {"deckTitle": "X"}


def test_download_file_name_is_plain():
    from app.api.decks import _download_name

    assert _download_name("Crêpes à l'orange!") == "crepes-a-l-orange.json"
    assert _download_name("日本語") == "deck.json"


def test_download_increments_counter(client, auth_headers, sample_deck_json, stored_file):
    deck = _upload_deck(client, auth_headers, sample_deck_json)
    before = client.get(f"/decks/{deck['id']}").json()["downloads"]
    client.get(f"/decks/{deck['id']}/download", follow_redirects=False)
    after = client.get(f"/decks/{deck['id']}").json()["downloads"]
    assert after == before + 1


def test_get_nonexistent_returns_404(client):
    resp = client.get("/decks/999999")
    assert resp.status_code == 404
