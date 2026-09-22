"""Security workspace module tests: workspace/devices/alerts/reports/tenant isolation."""

import uuid
import secrets
import requests
import pytest
from conftest import credential_password, record_test_account


QA1_EMAIL = "revenuecat.qa1@example.com"
QA2_EMAIL = "revenuecat.qa2@example.com"
QA_PASSWORD = credential_password(QA1_EMAIL)


def _login(base_url: str, email: str, password: str) -> requests.Session:
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    response = session.post(f"{base_url}/api/auth/login", json={"email": email, "password": password})
    assert response.status_code == 200
    return session


def _has_mongo_id_key(value):
    if isinstance(value, dict):
        if "_id" in value:
            return True
        return any(_has_mongo_id_key(v) for v in value.values())
    if isinstance(value, list):
        return any(_has_mongo_id_key(v) for v in value)
    return False


@pytest.fixture
def qa1_session(base_url: str):
    return _login(base_url, QA1_EMAIL, QA_PASSWORD)


@pytest.fixture
def qa2_session(base_url: str):
    return _login(base_url, QA2_EMAIL, QA_PASSWORD)


@pytest.fixture
def temp_user_session(base_url: str):
    # Dedicated temporary user fixture for deterministic score and no-device report checks.
    email = f"test_security_{uuid.uuid4().hex[:10]}@example.com"
    password = secrets.token_urlsafe(24)
    register = requests.post(
        f"{base_url}/api/auth/register",
        json={"name": "TEST Security Temp", "email": email, "password": password},
        headers={"Content-Type": "application/json"},
    )
    assert register.status_code == 201
    record_test_account(email, password, register.json()["user"]["id"])
    session = _login(base_url, email, password)
    yield session, email
    session.post(f"{base_url}/api/auth/logout", json={})


class TestSecurityWorkspace:
    # Workspace/settings persistence and government warning context.
    def test_workspace_save_and_dashboard_persistence(self, base_url: str, qa1_session: requests.Session):
        name = f"TEST WS {uuid.uuid4().hex[:6]}"
        saved = qa1_session.post(f"{base_url}/api/workspace", json={"name": name, "sector": "government"})
        assert saved.status_code == 200
        assert saved.json()["sector"] == "government"

        dashboard = qa1_session.get(f"{base_url}/api/dashboard")
        assert dashboard.status_code == 200
        body = dashboard.json()
        assert body["workspace"]["name"] == name
        assert body["workspace"]["sector"] == "government"
        assert _has_mongo_id_key(body) is False


class TestDevicesAlertsAndScore:
    # Device CRUD + control-check alerts + score calculations.
    def test_no_device_report_returns_friendly_400(self, base_url: str, temp_user_session):
        session, _email = temp_user_session
        response = session.post(f"{base_url}/api/reports", json={})
        assert response.status_code == 400
        assert "register a device" in response.json().get("detail", "").lower()

    def test_single_fully_controlled_device_yields_100(self, base_url: str, temp_user_session):
        session, _email = temp_user_session
        created = session.post(
            f"{base_url}/api/devices",
            json={
                "name": "TEST Device Full",
                "platform": "Windows",
                "owner": "TEST",
                "mfa": True,
                "encrypted": True,
                "updated": True,
                "access": "allowed",
            },
        )
        assert created.status_code == 201

        dashboard = session.get(f"{base_url}/api/dashboard")
        assert dashboard.status_code == 200
        posture = dashboard.json()["posture"]
        assert posture["device_count"] == 1
        assert posture["score"] == 100

    def test_all_false_with_review_yields_0_and_open_control_alert(self, base_url: str, temp_user_session):
        session, _email = temp_user_session
        created = session.post(
            f"{base_url}/api/devices",
            json={
                "name": "TEST Device Weak",
                "platform": "Linux",
                "owner": "TEST",
                "mfa": False,
                "encrypted": False,
                "updated": False,
                "access": "review",
            },
        )
        assert created.status_code == 201
        device_id = created.json()["id"]

        dashboard = session.get(f"{base_url}/api/dashboard")
        assert dashboard.status_code == 200
        posture = dashboard.json()["posture"]
        assert posture["score"] == 0

        alerts = session.get(f"{base_url}/api/alerts")
        assert alerts.status_code == 200
        control = [a for a in alerts.json() if a.get("source") == "control_check" and a.get("device_id") == device_id]
        assert len(control) == 1
        assert control[0]["status"] == "open"

    def test_control_alert_resolves_when_all_controls_met(self, base_url: str, qa1_session: requests.Session):
        created = qa1_session.post(
            f"{base_url}/api/devices",
            json={
                "name": f"TEST Resolve {uuid.uuid4().hex[:6]}",
                "platform": "macOS",
                "owner": "TEST",
                "mfa": False,
                "encrypted": False,
                "updated": False,
                "access": "review",
            },
        )
        assert created.status_code == 201
        device = created.json()
        device_id = device["id"]

        edited = qa1_session.post(
            f"{base_url}/api/devices/{device_id}",
            json={
                "name": device["name"],
                "platform": device["platform"],
                "owner": device["owner"],
                "mfa": True,
                "encrypted": True,
                "updated": True,
                "access": "allowed",
            },
        )
        assert edited.status_code == 200

        alerts = qa1_session.get(f"{base_url}/api/alerts")
        assert alerts.status_code == 200
        control = [a for a in alerts.json() if a.get("device_id") == device_id and a.get("source") == "control_check"]
        assert len(control) == 1
        assert control[0]["status"] == "resolved"

        removed = qa1_session.post(f"{base_url}/api/devices/{device_id}/remove", json={})
        assert removed.status_code == 200

    def test_remove_device_and_verify_not_found(self, base_url: str, qa1_session: requests.Session):
        created = qa1_session.post(
            f"{base_url}/api/devices",
            json={
                "name": f"TEST Remove {uuid.uuid4().hex[:6]}",
                "platform": "Other",
                "owner": "TEST",
                "mfa": True,
                "encrypted": False,
                "updated": False,
                "access": "denied",
            },
        )
        assert created.status_code == 201
        device_id = created.json()["id"]

        deleted = qa1_session.post(f"{base_url}/api/devices/{device_id}/remove", json={})
        assert deleted.status_code == 200
        assert deleted.json().get("ok") is True

        deleted_again = qa1_session.post(f"{base_url}/api/devices/{device_id}/remove", json={})
        assert deleted_again.status_code == 404


class TestTenantIsolationAndReports:
    # Cross-tenant isolation and report snapshot persistence.
    def test_qa2_cannot_edit_or_remove_qa1_device(self, base_url: str, qa1_session: requests.Session, qa2_session: requests.Session):
        created = qa1_session.post(
            f"{base_url}/api/devices",
            json={
                "name": f"TEST QA1 Shared {uuid.uuid4().hex[:6]}",
                "platform": "Windows",
                "owner": "QA1",
                "mfa": True,
                "encrypted": True,
                "updated": False,
                "access": "review",
            },
        )
        assert created.status_code == 201
        device = created.json()
        device_id = device["id"]

        edit_by_qa2 = qa2_session.post(
            f"{base_url}/api/devices/{device_id}",
            json={
                "name": "TEST Illegal Edit",
                "platform": device["platform"],
                "owner": device["owner"],
                "mfa": True,
                "encrypted": True,
                "updated": True,
                "access": "allowed",
            },
        )
        assert edit_by_qa2.status_code == 404

        remove_by_qa2 = qa2_session.post(f"{base_url}/api/devices/{device_id}/remove", json={})
        assert remove_by_qa2.status_code == 404

        cleanup = qa1_session.post(f"{base_url}/api/devices/{device_id}/remove", json={})
        assert cleanup.status_code == 200

    def test_qa2_cannot_toggle_qa1_alert(self, base_url: str, qa1_session: requests.Session, qa2_session: requests.Session):
        created = qa1_session.post(
            f"{base_url}/api/alerts",
            json={"title": f"TEST Incident {uuid.uuid4().hex[:6]}", "description": "isolation test", "severity": "high"},
        )
        assert created.status_code == 201
        alert_id = created.json()["id"]

        illegal = qa2_session.post(f"{base_url}/api/alerts/{alert_id}", json={"status": "resolved"})
        assert illegal.status_code == 404

        owner_update = qa1_session.post(f"{base_url}/api/alerts/{alert_id}", json={"status": "resolved"})
        assert owner_update.status_code == 200
        assert owner_update.json()["status"] == "resolved"

    def test_report_generation_and_persistence(self, base_url: str, qa1_session: requests.Session):
        created = qa1_session.post(
            f"{base_url}/api/devices",
            json={
                "name": f"TEST Report Device {uuid.uuid4().hex[:6]}",
                "platform": "Windows",
                "owner": "QA1",
                "mfa": True,
                "encrypted": True,
                "updated": True,
                "access": "allowed",
            },
        )
        assert created.status_code == 201

        report = qa1_session.post(f"{base_url}/api/reports", json={})
        assert report.status_code == 201
        report_body = report.json()
        assert report_body["workspace"]["sector"] in ["personal", "private", "government"]
        assert isinstance(report_body["posture"]["findings"], list)
        assert _has_mongo_id_key(report_body) is False

        reports = qa1_session.get(f"{base_url}/api/reports")
        assert reports.status_code == 200
        ids = [r["id"] for r in reports.json()]
        assert report_body["id"] in ids

        cleanup = qa1_session.post(f"{base_url}/api/devices/{created.json()['id']}/remove", json={})
        assert cleanup.status_code == 200
