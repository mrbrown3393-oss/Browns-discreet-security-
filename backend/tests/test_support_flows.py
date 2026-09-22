"""Support module tests: customer/staff workflows, auth gating, and role safety."""

import uuid
import secrets
import requests
from conftest import credential_password, record_test_account


QA1_EMAIL = "revenuecat.qa1@example.com"
QA2_EMAIL = "revenuecat.qa2@example.com"
SUPPORT_EMAIL = "support.owner@example.com"
QA_PASSWORD = credential_password(QA1_EMAIL)
SUPPORT_PASSWORD = credential_password(SUPPORT_EMAIL)


def _login(base_url: str, email: str, password: str) -> requests.Session:
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    response = session.post(f"{base_url}/api/auth/login", json={"email": email, "password": password})
    assert response.status_code == 200
    return session


def _create_ticket(base_url: str, session: requests.Session, subject_suffix: str = "") -> dict:
    response = session.post(
        f"{base_url}/api/support/tickets",
        json={
            "subject": f"TEST support flow {subject_suffix or uuid.uuid4().hex[:6]}",
            "category": "Other",
            "message": "TEST ticket creation for support verification workflow.",
        },
    )
    assert response.status_code == 201
    return response.json()


class TestSupportAuthAndRole:
    # Auth and role boundaries for support endpoints.
    def test_support_tickets_requires_auth(self, base_url: str):
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        response = session.get(f"{base_url}/api/support/tickets")
        assert response.status_code == 401

    def test_nonstaff_inbox_forbidden(self, base_url: str):
        qa1 = _login(base_url, QA1_EMAIL, QA_PASSWORD)
        response = qa1.get(f"{base_url}/api/support/inbox")
        assert response.status_code == 403

    def test_signup_cannot_self_assign_support_staff(self, base_url: str):
        email = f"test_support_role_{uuid.uuid4().hex[:8]}@example.com"
        password = secrets.token_urlsafe(24)
        register = requests.post(
            f"{base_url}/api/auth/register",
            json={
                "name": "TEST Support Role",
                "email": email,
                "password": password,
                "support_staff": True,
            },
            headers={"Content-Type": "application/json"},
        )
        assert register.status_code == 201
        payload = register.json()
        record_test_account(email, password, payload["user"]["id"])
        assert payload["user"]["support_staff"] is False

        me = requests.get(
            f"{base_url}/api/auth/me",
            headers={"Content-Type": "application/json", "Authorization": f"Bearer {payload['session_token']}"},
        )
        assert me.status_code == 200
        assert me.json()["support_staff"] is False


class TestSupportTicketIsolationAndWorkflow:
    # Ticket ownership, customer/staff replies, and status transitions.
    def test_cross_user_ticket_access_blocked(self, base_url: str):
        qa1 = _login(base_url, QA1_EMAIL, QA_PASSWORD)
        qa2 = _login(base_url, QA2_EMAIL, QA_PASSWORD)
        ticket = _create_ticket(base_url, qa1, "isolation")
        ticket_id = ticket["id"]

        read_attempt = qa2.get(f"{base_url}/api/support/tickets/{ticket_id}")
        assert read_attempt.status_code == 404

        reply_attempt = qa2.post(
            f"{base_url}/api/support/tickets/{ticket_id}/reply",
            json={"message": "TEST unauthorized reply"},
        )
        assert reply_attempt.status_code == 404

        status_attempt = qa2.post(
            f"{base_url}/api/support/tickets/{ticket_id}/status",
            json={"status": "resolved"},
        )
        assert status_attempt.status_code == 404

    def test_customer_staff_reply_and_status_flow(self, base_url: str):
        qa1 = _login(base_url, QA1_EMAIL, QA_PASSWORD)
        staff = _login(base_url, SUPPORT_EMAIL, SUPPORT_PASSWORD)
        ticket = _create_ticket(base_url, qa1, "thread")
        ticket_id = ticket["id"]

        customer_reply = qa1.post(
            f"{base_url}/api/support/tickets/{ticket_id}/reply",
            json={"message": "TEST customer follow-up persisted"},
        )
        assert customer_reply.status_code == 200
        assert customer_reply.json()["messages"][-1]["author"] == "customer"

        inbox = staff.get(f"{base_url}/api/support/inbox")
        assert inbox.status_code == 200
        assert any(item["id"] == ticket_id for item in inbox.json())

        staff_reply = staff.post(
            f"{base_url}/api/support/tickets/{ticket_id}/reply",
            json={"message": "TEST staff response recorded"},
        )
        assert staff_reply.status_code == 200
        assert staff_reply.json()["status"] == "in_progress"
        assert staff_reply.json()["messages"][-1]["author"] == "support"

        resolved = staff.post(
            f"{base_url}/api/support/tickets/{ticket_id}/status",
            json={"status": "resolved"},
        )
        assert resolved.status_code == 200
        assert resolved.json()["status"] == "resolved"

        qa1_detail = qa1.get(f"{base_url}/api/support/tickets/{ticket_id}")
        assert qa1_detail.status_code == 200
        body = qa1_detail.json()
        assert body["status"] == "resolved"
        assert any(message["author"] == "support" and "TEST staff response" in message["text"] for message in body["messages"])
