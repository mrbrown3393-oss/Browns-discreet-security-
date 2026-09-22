"""Shared fixtures for backend API integration tests."""

import os
import re
from pathlib import Path
import pytest
import requests

PRIVATE_CREDENTIALS = Path(__file__).resolve().parents[2] / "memory" / "test_credentials.md"


def credential_password(email: str) -> str:
    for section in PRIVATE_CREDENTIALS.read_text().split("## "):
        if f"- Email: {email}\n" in section:
            match = re.search(r"^- Password: (.+)$", section, re.MULTILINE)
            if match:
                return match.group(1).strip()
    raise RuntimeError("Test credentials missing from private memory file")


def record_test_account(email: str, password: str, user_id: str):
    with PRIVATE_CREDENTIALS.open("a") as target:
        target.write(f"\n## Generated test account\n- Email: {email}\n- Password: {password}\n- User ID: {user_id}\n- Role: ordinary test account\n")


@pytest.fixture(scope="session")
def base_url() -> str:
    """Base preview URL injected from environment."""
    value = os.environ.get("EXPO_PUBLIC_BACKEND_URL") or os.environ.get("EXPO_BACKEND_URL")
    if not value:
        pytest.skip("EXPO_PUBLIC_BACKEND_URL/EXPO_BACKEND_URL is not set")
    return value.rstrip("/")


@pytest.fixture
def api_client() -> requests.Session:
    """HTTP session for API requests."""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session
