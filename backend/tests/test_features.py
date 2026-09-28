"""Launch switches: member accounts and AI generation can be hidden until launch."""
import app.api.auth as auth_api
from app.models import AppSetting
from tests.conftest import TestingSessionLocal


def _set(key, value):
    db = TestingSessionLocal()
    db.merge(AppSetting(key=key, value=value))
    db.commit()
    db.close()


def test_defaults_are_off_without_settings_rows(client):
    db = TestingSessionLocal()
    db.query(AppSetting).delete()
    db.commit()
    db.close()
    assert client.get("/settings").json() == {"premium_enabled": False, "accounts_enabled": False, "ai_enabled": False}


def test_registration_closed_when_accounts_off(client, monkeypatch):
    monkeypatch.setattr(auth_api, "send_verification", lambda *a: None)
    _set("accounts_enabled", False)
    resp = client.post("/auth/register", json={"alias": "Late", "email": "late@example.com", "password": "secret123"})
    assert resp.status_code == 403 and "closed" in resp.json()["detail"]


def test_admin_email_can_register_when_accounts_off(client, monkeypatch):
    from app.config import settings

    monkeypatch.setattr(auth_api, "send_verification", lambda *a: None)
    monkeypatch.setattr(settings, "admin_email", "Boss@Example.com")
    _set("accounts_enabled", False)
    resp = client.post("/auth/register", json={"alias": "Boss", "email": "boss@example.com", "password": "secret123"})
    assert resp.status_code == 201


def test_login_still_works_when_accounts_off(client, monkeypatch):
    monkeypatch.setattr(auth_api, "send_verification", lambda *a: None)
    client.post("/auth/register", json={"alias": "Boss", "email": "boss@example.com", "password": "secret123"})
    _set("accounts_enabled", False)
    assert client.post("/auth/login", json={"email": "boss@example.com", "password": "secret123"}).status_code == 200


def test_ai_endpoints_refused_when_ai_off(client, monkeypatch):
    monkeypatch.setattr(auth_api, "send_verification", lambda *a: None)
    token = client.post("/auth/register", json={"alias": "Maker", "email": "m@example.com", "password": "secret123"}).json()["token"]
    _set("ai_enabled", False)
    headers = {"Authorization": f"Bearer {token}"}
    assert client.get("/ai/options", headers=headers).status_code == 503
    resp = client.post("/ai/generate", json={"category_slug": "recipe", "description": "A long enough topic"}, headers=headers)
    assert resp.status_code == 503


def test_admin_switches_and_dependency(client, auth_headers):
    # AI needs accounts: can't turn accounts off while AI is on
    assert client.patch("/admin/settings/accounts", json={"enabled": False}, headers=auth_headers).status_code == 422
    assert client.patch("/admin/settings/ai", json={"enabled": False}, headers=auth_headers).json()["ai_enabled"] is False
    off = client.patch("/admin/settings/accounts", json={"enabled": False}, headers=auth_headers)
    assert off.status_code == 200 and off.json()["accounts_enabled"] is False
    # ...and can't turn AI on while accounts are off
    assert client.patch("/admin/settings/ai", json={"enabled": True}, headers=auth_headers).status_code == 422
    assert client.get("/settings").json() == {"premium_enabled": False, "accounts_enabled": False, "ai_enabled": False}


def test_switches_require_admin(client):
    assert client.patch("/admin/settings/ai", json={"enabled": True}).status_code in (401, 403)
    assert client.patch("/admin/settings/accounts", json={"enabled": True}).status_code in (401, 403)
