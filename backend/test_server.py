import copy
import hashlib
from types import SimpleNamespace

from fastapi.testclient import TestClient

from backend import server


class FakeCollection:
    def __init__(self, document=None):
        self.document = copy.deepcopy(document)

    async def find_one(self, _query, _projection=None):
        return copy.deepcopy(self.document)

    async def update_one(self, _query, update):
        self.document.update(update["$set"])


def test_health_endpoint_is_public():
    response = TestClient(server.app).get("/api/")

    assert response.status_code == 200
    assert response.json()["message"] == "Undangan.id API is running"


def test_account_endpoint_requires_bearer_token():
    response = TestClient(server.app).get("/api/auth/me")

    assert response.status_code == 401


def test_admin_settings_reject_anonymous_requests():
    response = TestClient(server.app).get("/api/admin/billing/config")

    assert response.status_code == 401


def test_registration_requires_jwt_secret(monkeypatch):
    monkeypatch.delenv("JWT_SECRET", raising=False)
    response = TestClient(server.app).post(
        "/api/auth/register",
        json={"full_name": "Test User", "email": "test@example.com", "password": "password123"},
    )

    assert response.status_code == 503
    assert "JWT_SECRET" in response.json()["detail"]


def test_admin_login_requires_server_configuration(monkeypatch):
    monkeypatch.setenv("JWT_SECRET", "test-secret-that-is-at-least-32-characters-long")
    monkeypatch.delenv("ADMIN_EMAIL", raising=False)
    monkeypatch.delenv("ADMIN_PASSWORD_HASH", raising=False)
    response = TestClient(server.app).post(
        "/api/admin/login",
        json={"email": "admin@example.com", "password": "not-a-real-password"},
    )

    assert response.status_code == 503
    assert "ADMIN_EMAIL" in response.json()["detail"]


def test_midtrans_webhook_rejects_when_gateway_is_unconfigured(monkeypatch):
    monkeypatch.delenv("MIDTRANS_SERVER_KEY", raising=False)
    response = TestClient(server.app).post("/api/payments/midtrans/notification", json={})

    assert response.status_code == 503
    assert "Gateway" in response.json()["detail"]


def test_midtrans_settlement_activates_invitation_and_cannot_be_downgraded(monkeypatch):
    server_key = "test-midtrans-key"
    order_id = "UND-TESTORDER123456789"
    payment = {
        "id": "payment-1",
        "order_id": order_id,
        "invitation_id": "invitation-1",
        "provider": "midtrans",
        "status": "pending",
        "amount": 249000,
        "duration_days": 365,
    }
    payment_collection = FakeCollection(payment)
    invitation_collection = FakeCollection({"id": "invitation-1", "active_until": None})
    monkeypatch.setattr(server, "db", SimpleNamespace(
        payment_orders=payment_collection,
        invitations=invitation_collection,
    ))
    monkeypatch.setenv("MIDTRANS_SERVER_KEY", server_key)

    def notification(transaction_status):
        gross_amount = "249000.00"
        status_code = "200"
        signature = hashlib.sha512(
            f"{order_id}{status_code}{gross_amount}{server_key}".encode("utf-8")
        ).hexdigest()
        return {
            "order_id": order_id,
            "status_code": status_code,
            "gross_amount": gross_amount,
            "signature_key": signature,
            "transaction_status": transaction_status,
            "fraud_status": "accept",
        }

    client = TestClient(server.app)
    settled = client.post("/api/payments/midtrans/notification", json=notification("settlement"))
    assert settled.status_code == 200
    assert payment_collection.document["status"] == "paid"
    assert invitation_collection.document["status"] == "active"

    expired = client.post("/api/payments/midtrans/notification", json=notification("expire"))
    assert expired.status_code == 200
    assert payment_collection.document["status"] == "paid"
    assert invitation_collection.document["status"] == "active"


def test_midtrans_webhook_rejects_invalid_signature(monkeypatch):
    monkeypatch.setenv("MIDTRANS_SERVER_KEY", "test-midtrans-key")
    response = TestClient(server.app).post(
        "/api/payments/midtrans/notification",
        json={
            "order_id": "UND-FAKE",
            "status_code": "200",
            "gross_amount": "99000.00",
            "signature_key": "invalid",
            "transaction_status": "settlement",
        },
    )

    assert response.status_code == 401


def test_publish_rejects_unpaid_draft(monkeypatch):
    invitation_collection = FakeCollection({
        "id": "invitation-draft",
        "owner_id": "user-1",
        "status": "draft",
        "active_until": None,
    })
    monkeypatch.setattr(server, "db", SimpleNamespace(invitations=invitation_collection))
    monkeypatch.setitem(server.app.dependency_overrides, server.get_current_user, lambda: {"id": "user-1"})

    response = TestClient(server.app).post("/api/invitations/invitation-draft/publish")

    assert response.status_code == 402
    assert "pembayaran" in response.json()["detail"].lower()
