"""Tests for user accounts: register, verify, login, reset, profile, delete, admin members."""
import pytest

import app.api.auth as auth_api
from app.config import settings


@pytest.fixture
def outbox(monkeypatch):
    """Capture tokens that would be emailed."""
    box = {"verify": [], "reset": []}
    monkeypatch.setattr(auth_api, "send_verification", lambda to, alias, token: box["verify"].append((to, token)))
    monkeypatch.setattr(auth_api, "send_password_reset", lambda to, alias, token: box["reset"].append((to, token)))
    return box


def _register(client, alias="Karim", email="karim@example.com", password="secret123"):
    return client.post("/auth/register", json={"alias": alias, "email": email, "password": password})


def _bearer(token):
    return {"Authorization": f"Bearer {token}"}


# ── Register / login ──────────────────────────────────────────────────────

def test_register_logs_in_and_sends_verification(client, outbox):
    resp = _register(client, email="  Karim@Example.com ")
    assert resp.status_code == 201
    body = resp.json()
    assert body["user"]["email"] == "karim@example.com"
    assert body["user"]["email_verified"] is False
    assert body["user"]["role"] == "user"
    assert "password_hash" not in body["user"]
    assert outbox["verify"][0][0] == "karim@example.com"
    me = client.get("/me", headers=_bearer(body["token"]))
    assert me.status_code == 200 and me.json()["alias"] == "Karim"


@pytest.mark.parametrize("payload,field", [
    ({"alias": "ab", "email": "a@b.co", "password": "secret123"}, "alias"),
    ({"alias": "Karim", "email": "not-an-email", "password": "secret123"}, "email"),
    ({"alias": "Karim", "email": "a@b.co", "password": "short"}, "password"),
])
def test_register_validation(client, outbox, payload, field):
    resp = client.post("/auth/register", json=payload)
    assert resp.status_code == 422
    assert field in str(resp.json())


def test_register_duplicate_email_and_alias(client, outbox):
    _register(client)
    assert _register(client, alias="Other").status_code == 409
    assert _register(client, alias="KARIM", email="new@example.com").status_code == 409


def test_login(client, outbox):
    _register(client)
    assert client.post("/auth/login", json={"email": "karim@example.com", "password": "wrong-pass"}).status_code == 401
    assert client.post("/auth/login", json={"email": "nobody@example.com", "password": "secret123"}).status_code == 401
    resp = client.post("/auth/login", json={"email": "KARIM@example.com", "password": "secret123"})
    assert resp.status_code == 200 and resp.json()["token"]


def test_logout_revokes_token(client, outbox):
    token = _register(client).json()["token"]
    assert client.post("/auth/logout", headers=_bearer(token)).status_code == 204
    assert client.get("/me", headers=_bearer(token)).status_code == 401


def test_me_requires_login(client):
    assert client.get("/me").status_code == 401
    assert client.get("/me", headers=_bearer("garbage")).status_code == 401


def test_login_rate_limited(client, outbox):
    _register(client)
    codes = [
        client.post("/auth/login", json={"email": "karim@example.com", "password": "wrong-pass"}).status_code
        for _ in range(11)
    ]
    assert codes[-1] == 429


# ── Email verification ────────────────────────────────────────────────────

def test_verify_email(client, outbox):
    token = _register(client).json()["token"]
    verify_token = outbox["verify"][0][1]
    resp = client.post("/auth/verify-email", json={"token": verify_token})
    assert resp.status_code == 200 and resp.json()["email_verified"] is True
    assert client.get("/me", headers=_bearer(token)).json()["email_verified"] is True
    # One-time use
    assert client.post("/auth/verify-email", json={"token": verify_token}).status_code == 400


def test_resend_verification_invalidates_old_link(client, outbox):
    token = _register(client).json()["token"]
    old = outbox["verify"][0][1]
    assert client.post("/auth/resend-verification", headers=_bearer(token)).status_code == 202
    new = outbox["verify"][1][1]
    assert client.post("/auth/verify-email", json={"token": old}).status_code == 400
    assert client.post("/auth/verify-email", json={"token": new}).status_code == 200


def test_admin_email_becomes_admin_only_after_verification(client, outbox, monkeypatch):
    monkeypatch.setattr(settings, "admin_email", "boss@example.com")
    token = _register(client, alias="Boss", email="boss@example.com").json()["token"]
    assert client.get("/me", headers=_bearer(token)).json()["role"] == "user"
    assert client.get("/admin/decks", headers=_bearer(token)).status_code == 401
    client.post("/auth/verify-email", json={"token": outbox["verify"][0][1]})
    assert client.get("/me", headers=_bearer(token)).json()["role"] == "admin"
    assert client.get("/admin/decks", headers=_bearer(token)).status_code == 200


def test_admin_email_set_after_verification_promotes_at_login(client, outbox, monkeypatch):
    _register(client, alias="Boss", email="boss@example.com")
    client.post("/auth/verify-email", json={"token": outbox["verify"][0][1]})
    monkeypatch.setattr(settings, "admin_email", "boss@example.com")
    login = client.post("/auth/login", json={"email": "boss@example.com", "password": "secret123"})
    assert login.json()["user"]["role"] == "admin"


def test_unverified_admin_email_not_promoted_at_login(client, outbox, monkeypatch):
    monkeypatch.setattr(settings, "admin_email", "boss@example.com")
    _register(client, alias="Boss", email="boss@example.com")
    login = client.post("/auth/login", json={"email": "boss@example.com", "password": "secret123"})
    assert login.json()["user"]["role"] == "user"


# ── Password reset / change ───────────────────────────────────────────────

def test_forgot_password_does_not_reveal_accounts(client, outbox):
    assert client.post("/auth/forgot-password", json={"email": "nobody@example.com"}).status_code == 202
    assert outbox["reset"] == []


def test_reset_password_flow(client, outbox):
    old_session = _register(client).json()["token"]
    client.post("/auth/forgot-password", json={"email": "karim@example.com"})
    reset_token = outbox["reset"][0][1]
    assert client.post("/auth/reset-password", json={"token": reset_token, "password": "brand-new-pw"}).status_code == 204
    # Old sessions are signed out, old password stops working, new one works
    assert client.get("/me", headers=_bearer(old_session)).status_code == 401
    assert client.post("/auth/login", json={"email": "karim@example.com", "password": "secret123"}).status_code == 401
    login = client.post("/auth/login", json={"email": "karim@example.com", "password": "brand-new-pw"})
    assert login.status_code == 200
    # Reset link proves email ownership
    assert login.json()["user"]["email_verified"] is True
    assert client.post("/auth/reset-password", json={"token": reset_token, "password": "another-pw"}).status_code == 400


def test_change_password_keeps_current_session_only(client, outbox):
    token_a = _register(client).json()["token"]
    token_b = client.post("/auth/login", json={"email": "karim@example.com", "password": "secret123"}).json()["token"]
    bad = client.post("/me/password", json={"current_password": "nope-nope", "new_password": "newpass123"}, headers=_bearer(token_a))
    assert bad.status_code == 403
    ok = client.post("/me/password", json={"current_password": "secret123", "new_password": "newpass123"}, headers=_bearer(token_a))
    assert ok.status_code == 204
    assert client.get("/me", headers=_bearer(token_a)).status_code == 200
    assert client.get("/me", headers=_bearer(token_b)).status_code == 401


# ── Profile / delete ──────────────────────────────────────────────────────

def test_update_alias(client, outbox):
    token = _register(client).json()["token"]
    _register(client, alias="Taken", email="t@example.com")
    assert client.patch("/me", json={"alias": "taken"}, headers=_bearer(token)).status_code == 409
    resp = client.patch("/me", json={"alias": "Karim V"}, headers=_bearer(token))
    assert resp.status_code == 200 and resp.json()["alias"] == "Karim V"


def test_delete_account(client, outbox):
    token = _register(client).json()["token"]
    assert client.request("DELETE", "/me", json={"password": "wrong-pass"}, headers=_bearer(token)).status_code == 403
    assert client.request("DELETE", "/me", json={"password": "secret123"}, headers=_bearer(token)).status_code == 204
    assert client.get("/me", headers=_bearer(token)).status_code == 401
    assert client.post("/auth/login", json={"email": "karim@example.com", "password": "secret123"}).status_code == 401
    # Email can be reused afterwards
    assert _register(client).status_code == 201


# ── Admin members ─────────────────────────────────────────────────────────

def test_admin_members_requires_admin(client, outbox):
    token = _register(client).json()["token"]
    assert client.get("/admin/users").status_code in (401, 403)
    assert client.get("/admin/users", headers=_bearer(token)).status_code == 401


def test_admin_list_and_search_members(client, outbox, auth_headers):
    _register(client, alias="Alice", email="alice@example.com")
    _register(client, alias="Bob", email="bob@example.com")
    all_users = client.get("/admin/users", headers=auth_headers).json()
    assert {u["alias"] for u in all_users} == {"Alice", "Bob"}
    assert "last_login_at" in all_users[0]
    found = client.get("/admin/users?q=ALI", headers=auth_headers).json()
    assert [u["alias"] for u in found] == ["Alice"]


def test_admin_grant_and_remove_services(client, outbox, auth_headers):
    user = _register(client).json()
    uid, token = user["user"]["id"], user["token"]
    resp = client.put(f"/admin/users/{uid}/services/premium", json={"enabled": True}, headers=auth_headers)
    assert resp.status_code == 200 and resp.json()["services"] == ["premium"]
    client.put(f"/admin/users/{uid}/services/ai_claude", json={"enabled": True}, headers=auth_headers)
    # Idempotent
    client.put(f"/admin/users/{uid}/services/premium", json={"enabled": True}, headers=auth_headers)
    assert client.get("/me", headers=_bearer(token)).json()["services"] == ["ai_claude", "premium"]
    resp = client.put(f"/admin/users/{uid}/services/premium", json={"enabled": False}, headers=auth_headers)
    assert resp.json()["services"] == ["ai_claude"]
    assert client.put(f"/admin/users/{uid}/services/bogus", json={"enabled": True}, headers=auth_headers).status_code == 422
    assert client.put("/admin/users/9999/services/premium", json={"enabled": True}, headers=auth_headers).status_code == 404


def test_admin_delete_member(client, outbox, auth_headers):
    user = _register(client).json()
    assert client.delete(f"/admin/users/{user['user']['id']}", headers=auth_headers).status_code == 204
    assert client.get("/me", headers=_bearer(user["token"])).status_code == 401


def test_admin_cannot_delete_self(client, outbox, monkeypatch):
    monkeypatch.setattr(settings, "admin_email", "boss@example.com")
    boss = _register(client, alias="Boss", email="boss@example.com").json()
    client.post("/auth/verify-email", json={"token": outbox["verify"][0][1]})
    resp = client.delete(f"/admin/users/{boss['user']['id']}", headers=_bearer(boss["token"]))
    assert resp.status_code == 400
