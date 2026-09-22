"""Auth module tests: register/login/me/logout/google-session validations."""

import uuid
import requests
from conftest import credential_password


QA1_EMAIL = "revenuecat.qa1@example.com"
QA1_PASSWORD = credential_password(QA1_EMAIL)


def test_api_root_health(base_url: str, api_client: requests.Session):
    response = api_client.get(f"{base_url}/api/")
    assert response.status_code == 200
    assert response.json().get("message") == "Hello World"


def test_me_unauthenticated_returns_401(base_url: str, api_client: requests.Session):
    response = api_client.get(f"{base_url}/api/auth/me")
    assert response.status_code == 401
    assert "sign in" in response.json().get("detail", "").lower()


def test_login_success_sets_cookie_and_returns_expected_user(base_url: str, api_client: requests.Session):
    response = api_client.post(
        f"{base_url}/api/auth/login",
        json={"email": QA1_EMAIL, "password": QA1_PASSWORD},
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["user"]["email"] == QA1_EMAIL
    assert payload["user"]["id"] == "user_82eb45c97ff04cfc8e611589d1586377"
    assert isinstance(payload["session_token"], str) and len(payload["session_token"]) > 20

    me_response = api_client.get(f"{base_url}/api/auth/me")
    assert me_response.status_code == 200
    assert me_response.json()["id"] == payload["user"]["id"]


def test_login_bad_credentials_returns_401(base_url: str, api_client: requests.Session):
    response = api_client.post(
        f"{base_url}/api/auth/login",
        json={"email": QA1_EMAIL, "password": "Wrong-Password-2026"},
    )
    assert response.status_code == 401
    assert "incorrect" in response.json().get("detail", "").lower()


def test_invalid_bearer_token_rejected(base_url: str, api_client: requests.Session):
    response = api_client.get(
        f"{base_url}/api/auth/me",
        headers={"Authorization": "Bearer invalid_token_preview_test"},
    )
    assert response.status_code == 401
    assert "expired" in response.json().get("detail", "").lower()


def test_logout_revokes_current_session(base_url: str, api_client: requests.Session):
    login_response = api_client.post(
        f"{base_url}/api/auth/login",
        json={"email": QA1_EMAIL, "password": QA1_PASSWORD},
    )
    assert login_response.status_code == 200

    logout_response = api_client.post(f"{base_url}/api/auth/logout", json={})
    assert logout_response.status_code == 200
    assert logout_response.json().get("ok") is True

    me_response = api_client.get(f"{base_url}/api/auth/me")
    assert me_response.status_code == 401


def test_duplicate_register_is_blocked(base_url: str, api_client: requests.Session):
    response = api_client.post(
        f"{base_url}/api/auth/register",
        json={
            "name": "QA One",
            "email": QA1_EMAIL,
            "password": QA1_PASSWORD,
        },
    )
    assert response.status_code == 409
    assert "already exists" in response.json().get("detail", "").lower()


def test_register_short_password_validation(base_url: str, api_client: requests.Session):
    email = f"test_short_{uuid.uuid4().hex[:8]}@example.com"
    response = api_client.post(
        f"{base_url}/api/auth/register",
        json={"name": "Test User", "email": email, "password": "short"},
    )
    assert response.status_code == 422
    details = response.json().get("detail", [])
    assert isinstance(details, list) and len(details) > 0


def test_register_whitespace_name_validation(base_url: str, api_client: requests.Session):
    email = f"test_blank_{uuid.uuid4().hex[:8]}@example.com"
    response = api_client.post(
        f"{base_url}/api/auth/register",
        json={"name": "   ", "email": email, "password": "LongEnough!123"},
    )
    assert response.status_code == 422
    assert "name" in response.json().get("detail", "").lower()


def test_google_session_invalid_id_is_rejected(base_url: str, api_client: requests.Session):
    response = api_client.post(
        f"{base_url}/api/auth/session",
        json={"session_id": "invalid-session-id-preview-test"},
    )
    assert response.status_code in (401, 503)
    message = response.json().get("detail", "").lower()
    assert any(token in message for token in ["expired", "unavailable", "verify"])
