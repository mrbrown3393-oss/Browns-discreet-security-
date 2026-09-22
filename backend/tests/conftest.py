"""Shared fixtures for backend API integration tests."""

import os
import pytest
import requests


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
