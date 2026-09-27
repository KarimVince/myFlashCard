"""
Test fixtures.

Uses an in-memory SQLite database so tests run without a real Postgres instance.
Supabase Storage calls are mocked at the module level.
"""
import json
from typing import Generator
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# ── Patch settings before app import ─────────────────────────────────────
import bcrypt
import os

_TEST_PASSWORD = "testpassword"
_TEST_HASH = bcrypt.hashpw(_TEST_PASSWORD.encode(), bcrypt.gensalt()).decode()

os.environ["DATABASE_URL"] = "sqlite:///./test.db"
os.environ["SUPABASE_URL"] = "https://fake.supabase.co"
os.environ["SUPABASE_SERVICE_KEY"] = "fake-key"
os.environ["ADMIN_PASSWORD_HASH"] = _TEST_HASH

from app.db import Base, get_db  # noqa: E402
from app.main import app  # noqa: E402
from app.models import Category  # noqa: E402

SQLALCHEMY_TEST_URL = "sqlite:///./test.db"
engine = create_engine(SQLALCHEMY_TEST_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db() -> Generator:
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db

# Patch Supabase storage to a no-op mock
_mock_storage = MagicMock()
_mock_storage.from_.return_value.upload.return_value = None
_mock_storage.from_.return_value.get_public_url.return_value = (
    "https://fake.supabase.co/storage/v1/object/public/deck-json/recipe/1.json"
)
_mock_storage.from_.return_value.remove.return_value = None

import app.storage as _storage_module  # noqa: E402

_storage_module._client = MagicMock()
_storage_module._client.storage = _mock_storage


@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    # Seed the 4 categories
    categories = [
        Category(
            slug="recipe",
            label="Recipe",
            description="Cooking cards",
            ai_prompt="Create a recipe flashcard deck in this JSON format...",
            schema_json={"type": "object", "required": ["deckTitle", "cards"]},
        ),
        Category(
            slug="study",
            label="Study",
            description="Study cards",
            ai_prompt="Create a study flashcard deck...",
            schema_json={"type": "object", "required": ["deckTitle", "cards"]},
        ),
        Category(
            slug="training",
            label="Training",
            description="Training cards",
            ai_prompt="Create a training flashcard deck...",
            schema_json={"type": "object", "required": ["deckTitle", "cards"]},
        ),
        Category(
            slug="song",
            label="Song",
            description="Song / lyrics cards",
            ai_prompt="Create a song flashcard deck...",
            schema_json={"type": "object", "required": ["deckTitle", "cards"]},
        ),
        Category(
            slug="travel",
            label="Travel",
            description="City and country travel guides",
            ai_prompt="Create a travel guide flashcard deck...",
            schema_json={"type": "object", "required": ["deckTitle", "cards"]},
        ),
    ]
    db.add_all(categories)
    db.commit()
    db.close()
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


@pytest.fixture
def auth_headers() -> dict:
    return {"Authorization": f"Bearer {_TEST_PASSWORD}"}


@pytest.fixture
def sample_deck_json() -> bytes:
    return json.dumps(
        {
            "deckTitle": "Test Deck",
            "cards": [
                {
                    "title": "Card 1",
                    "blocks": [{"type": "note", "text": "Hello"}],
                }
            ],
        }
    ).encode()
