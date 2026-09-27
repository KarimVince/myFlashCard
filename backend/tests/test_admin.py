"""Tests for admin endpoints (require Bearer token)."""
import io
import json


def _make_file(content: bytes):
    return ("deck.json", io.BytesIO(content), "application/json")


def _upload(client, auth_headers, sample_deck_json, category="recipe"):
    resp = client.post(
        "/admin/decks",
        data={"category_slug": category, "title": "Admin Test Deck", "language": "en"},
        files={"json_file": _make_file(sample_deck_json)},
        headers=auth_headers,
    )
    return resp


def test_upload_requires_auth(client, sample_deck_json):
    resp = client.post(
        "/admin/decks",
        data={"category_slug": "recipe", "title": "No Auth"},
        files={"json_file": _make_file(sample_deck_json)},
    )
    assert resp.status_code == 403  # HTTPBearer returns 403 when header missing


def test_upload_valid_json_returns_201(client, auth_headers, sample_deck_json):
    resp = _upload(client, auth_headers, sample_deck_json)
    assert resp.status_code == 201
    data = resp.json()
    assert data["title"] == "Admin Test Deck"
    assert data["category"]["slug"] == "recipe"


def test_upload_invalid_json_returns_422(client, auth_headers):
    resp = client.post(
        "/admin/decks",
        data={"category_slug": "recipe", "title": "Bad JSON"},
        files={"json_file": _make_file(b"not valid json at all")},
        headers=auth_headers,
    )
    assert resp.status_code == 422


def test_upload_wrong_schema_returns_422(client, auth_headers):
    # Missing required "cards" field
    bad = json.dumps({"deckTitle": "No cards here"}).encode()
    resp = client.post(
        "/admin/decks",
        data={"category_slug": "recipe", "title": "Wrong Schema"},
        files={"json_file": _make_file(bad)},
        headers=auth_headers,
    )
    assert resp.status_code == 422


def test_update_metadata_works(client, auth_headers, sample_deck_json):
    deck = _upload(client, auth_headers, sample_deck_json).json()
    resp = client.put(
        f"/admin/decks/{deck['id']}",
        data={"title": "Updated Title"},
        headers=auth_headers,
    )
    assert resp.status_code == 200
    assert resp.json()["title"] == "Updated Title"


def test_toggle_visibility(client, auth_headers, sample_deck_json):
    deck = _upload(client, auth_headers, sample_deck_json).json()
    # Hide it
    client.patch(
        f"/admin/decks/{deck['id']}/visibility",
        json={"is_public": False},
        headers=auth_headers,
    )
    # Should not appear in public list
    resp = client.get("/decks")
    ids = [d["id"] for d in resp.json()]
    assert deck["id"] not in ids


def test_delete_removes_row_and_file(client, auth_headers, sample_deck_json):
    deck = _upload(client, auth_headers, sample_deck_json).json()
    del_resp = client.delete(f"/admin/decks/{deck['id']}", headers=auth_headers)
    assert del_resp.status_code == 204
    get_resp = client.get(f"/decks/{deck['id']}")
    assert get_resp.status_code == 404
