"""Tests for GET /categories."""


def test_all_categories_present(client):
    resp = client.get("/categories")
    assert resp.status_code == 200
    slugs = {c["slug"] for c in resp.json()}
    assert slugs == {"recipe", "study", "training", "song", "travel"}


def test_each_category_has_ai_prompt(client):
    resp = client.get("/categories")
    assert resp.status_code == 200
    for cat in resp.json():
        assert cat["ai_prompt"], f"Category {cat['slug']} has no ai_prompt"


def test_each_category_has_schema(client):
    resp = client.get("/categories")
    assert resp.status_code == 200
    for cat in resp.json():
        assert isinstance(cat["schema_json"], dict), f"Category {cat['slug']} has no schema_json"
