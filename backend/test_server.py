import copy
import asyncio
from types import SimpleNamespace
from pymongo.errors import DuplicateKeyError

from fastapi.testclient import TestClient

from backend import server


class FakeHttpResponse:
    def raise_for_status(self):
        return None

    def json(self):
        return {"statusCode": 200, "data": {"id": "invoice-1", "transactionId": "transaction-1", "link": "https://merchant.myr.id/invoices/invoice-1"}}


class FakeHttpClient:
    calls = []

    def __init__(self, **_kwargs):
        pass

    async def __aenter__(self):
        return self

    async def __aexit__(self, *_args):
        return None

    async def request(self, method, url, **kwargs):
        self.calls.append((method, url, kwargs))
        return FakeHttpResponse()


class FakeCollection:
    def __init__(self, document=None):
        self.document = copy.deepcopy(document)

    async def find_one(self, _query, _projection=None):
        return copy.deepcopy(self.document)

    async def update_one(self, _query, update):
        self.document.update(update["$set"])

    async def create_index(self, *_args, **_kwargs):
        return None

    async def insert_one(self, document):
        self.document = copy.deepcopy(document)


class FakeTicketCollection:
    def __init__(self):
        self.documents = []

    async def create_index(self, *_args, **_kwargs):
        return None

    async def find_one(self, query, _projection=None):
        for document in self.documents:
            if all(document.get(key) == value for key, value in query.items()):
                return copy.deepcopy(document)
        return None

    async def insert_one(self, document):
        identity_keys = ("invitation_id", "phone", "name")
        if any(all(existing.get(key) == document.get(key) for key in identity_keys) for existing in self.documents):
            raise DuplicateKeyError("duplicate invitation recipient")
        self.documents.append(copy.deepcopy(document))

    async def update_one(self, query, update):
        for document in self.documents:
            if document.get("id") != query.get("id"):
                continue
            if query.get("checked_in_at") == {"$exists": False} and "checked_in_at" in document:
                return SimpleNamespace(modified_count=0)
            document.update(update["$set"])
            return SimpleNamespace(modified_count=1)
        return SimpleNamespace(modified_count=0)


class FakeGuestbookCollection:
    def __init__(self):
        self.documents = []

    async def create_index(self, *_args, **_kwargs):
        return None

    async def find_one(self, query, _projection=None):
        for document in self.documents:
            if all(document.get(key) == value for key, value in query.items()):
                return copy.deepcopy(document)
        return None

    async def insert_one(self, document):
        if document.get("ticket_id") and any(item.get("ticket_id") == document["ticket_id"] for item in self.documents):
            raise DuplicateKeyError("duplicate ticket check-in")
        self.documents.append(copy.deepcopy(document))


def test_saved_midtrans_checkout_config_migrates_to_mayar(monkeypatch):
    config = copy.deepcopy(server.DEFAULT_BILLING_CONFIG)
    config["payment_methods"][0] = {
        "id": "gopay-qris",
        "name": "GoPay / QRIS",
        "provider": "midtrans",
        "payment_code": "gopay",
        "enabled": True,
    }
    config["payment_methods"][1]["provider"] = "midtrans"
    config["payment_methods"][1]["payment_code"] = "bank_transfer"
    monkeypatch.setattr(server, "db", SimpleNamespace(platform_settings=FakeCollection(config)))

    migrated = asyncio.run(server.get_billing_config())

    assert migrated["payment_methods"][0]["provider"] == "mayar"
    assert migrated["payment_methods"][0]["name"] == "Mayar checkout"
    assert "payment_code" not in migrated["payment_methods"][0]
    assert migrated["payment_methods"][1]["provider"] == "manual"


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


def test_mayar_webhook_rejects_when_gateway_is_unconfigured(monkeypatch):
    monkeypatch.delenv("MAYAR_API_KEY", raising=False)
    response = TestClient(server.app).post("/api/payments/mayar/webhook", json={})

    assert response.status_code == 503
    assert "Mayar" in response.json()["detail"]


def test_mayar_webhook_verifies_invoice_before_activating_invitation(monkeypatch):
    payment = {
        "id": "payment-1",
        "order_id": "UND-TESTORDER123456789",
        "invitation_id": "invitation-1",
        "provider": "mayar",
        "status": "pending",
        "amount": 249000,
        "duration_days": 365,
        "mayar_invoice_id": "invoice-1",
        "mayar_transaction_id": "transaction-1",
    }
    payment_collection = FakeCollection(payment)
    invitation_collection = FakeCollection({"id": "invitation-1", "active_until": None})
    monkeypatch.setattr(server, "db", SimpleNamespace(
        payment_orders=payment_collection,
        invitations=invitation_collection,
    ))
    monkeypatch.setenv("MAYAR_API_KEY", "test-mayar-api-key")

    async def verified_invoice(method, path, **_kwargs):
        assert method == "GET"
        assert path == "/invoices/invoice-1"
        return {"id": "invoice-1", "amount": 249000, "status": "paid"}

    monkeypatch.setattr(server, "mayar_request", verified_invoice)

    client = TestClient(server.app)
    response = client.post("/api/payments/mayar/webhook", json={
        "event": "payment.received",
        "data": {"id": "transaction-1", "transactionId": "transaction-1", "status": "SUCCESS"},
    })
    assert response.status_code == 200
    assert payment_collection.document["status"] == "paid"
    assert invitation_collection.document["status"] == "active"
    duplicate = client.post("/api/payments/mayar/webhook", json={
        "event": "payment.received",
        "data": {"id": "transaction-1", "transactionId": "transaction-1", "status": "SUCCESS"},
    })
    assert duplicate.status_code == 200
    assert payment_collection.document["status"] == "paid"
    assert invitation_collection.document["status"] == "active"


def test_invitation_ticket_is_unique_and_scanning_records_idempotent_checkin(monkeypatch):
    monkeypatch.setenv("JWT_SECRET", "test-secret-that-is-at-least-32-characters-long")
    user = {"id": "owner-1", "full_name": "Event Owner", "email": "owner@example.com"}
    invitation = {
        "id": "invitation-1",
        "owner_id": "owner-1",
        "title": "Hari Bahagia",
        "slug": "hari-bahagia",
        "status": "published",
        "active_until": "9999-12-31T23:59:59+00:00",
        "content": {"event_date": "2026-10-07", "venue": "Gedung Acara"},
    }
    tickets = FakeTicketCollection()
    guestbook = FakeGuestbookCollection()
    monkeypatch.setattr(server, "db", SimpleNamespace(
        users=FakeCollection(user),
        invitations=FakeCollection(invitation),
        invitation_tickets=tickets,
        guestbook_entries=guestbook,
    ))
    token = server.create_access_token("owner-1")
    headers = {"Authorization": f"Bearer {token}"}
    client = TestClient(server.app)

    issued = client.post(
        "/api/invitations/invitation-1/tickets",
        headers=headers,
        json={"recipients": [{"name": "Alya", "phone": "6281234567890"}]},
    )
    issued_again = client.post(
        "/api/invitations/invitation-1/tickets",
        headers=headers,
        json={"recipients": [{"name": "Alya", "phone": "6281234567890"}]},
    )
    assert issued.status_code == 200
    assert issued_again.status_code == 200
    ticket = issued.json()["tickets"][0]
    assert len(ticket["token"]) >= 32
    assert issued_again.json()["tickets"][0]["token"] == ticket["token"]

    public_ticket = client.get(f"/api/public/invitation-tickets/{ticket['token']}")
    assert public_ticket.status_code == 200
    assert public_ticket.json()["name"] == "Alya"
    assert public_ticket.json()["slug"] == "hari-bahagia"

    check_in = client.post(
        "/api/invitations/invitation-1/check-in",
        headers=headers,
        json={"ticket_token": ticket["token"]},
    )
    duplicate_check_in = client.post(
        "/api/invitations/invitation-1/check-in",
        headers=headers,
        json={"ticket_token": ticket["token"]},
    )
    assert check_in.status_code == 200
    assert check_in.json()["already_checked_in"] is False
    assert check_in.json()["entry"]["source"] == "barcode_check_in"
    assert check_in.json()["entry"]["status"] == "hidden"
    assert duplicate_check_in.json()["already_checked_in"] is True
    assert len(guestbook.documents) == 1

def test_mayar_webhook_does_not_activate_when_invoice_amount_mismatches(monkeypatch):
    payment_collection = FakeCollection({
        "id": "payment-1",
        "order_id": "UND-TEST",
        "invitation_id": "invitation-1",
        "provider": "mayar",
        "status": "pending",
        "amount": 249000,
        "duration_days": 365,
        "mayar_invoice_id": "invoice-1",
        "mayar_transaction_id": "transaction-1",
    })
    invitation_collection = FakeCollection({"id": "invitation-1", "active_until": None})
    monkeypatch.setattr(server, "db", SimpleNamespace(
        payment_orders=payment_collection,
        invitations=invitation_collection,
    ))
    monkeypatch.setenv("MAYAR_API_KEY", "test-mayar-api-key")

    async def mismatched_invoice(_method, _path, **_kwargs):
        return {"id": "invoice-1", "amount": 1000, "status": "paid"}

    monkeypatch.setattr(server, "mayar_request", mismatched_invoice)
    response = TestClient(server.app).post(
        "/api/payments/mayar/webhook",
        json={
            "event": "payment.received",
            "data": {"id": "transaction-1", "transactionId": "transaction-1", "status": "SUCCESS"},
        },
    )

    assert response.status_code == 400
    assert payment_collection.document["status"] == "pending"
    assert invitation_collection.document["active_until"] is None


def test_mayar_invoice_creation_sends_v2_request_and_stores_invoice_ids(monkeypatch):
    captured = {}

    async def fake_request(method, path, **kwargs):
        captured.update({"method": method, "path": path, **kwargs})
        return {
            "id": "invoice-1",
            "transactionId": "transaction-1",
            "link": "https://merchant.myr.id/invoices/invoice-1",
        }

    monkeypatch.setattr(server, "mayar_request", fake_request)
    payment = {
        "id": "payment-1",
        "order_id": "UND-TEST",
        "plan_id": "basic",
        "plan_name": "Basic",
        "amount": 99000,
    }
    user = {"full_name": "Test User", "email": "test@example.com"}

    redirect_url = asyncio.run(server.create_mayar_invoice(payment, user, "+628123456789"))

    assert redirect_url == "https://merchant.myr.id/invoices/invoice-1"
    assert captured["method"] == "POST"
    assert captured["path"] == "/invoices/create"
    assert captured["json"]["name"] == "Test User"
    assert captured["json"]["mobile"] == "+628123456789"
    assert captured["json"]["items"][0]["rate"] == 99000
    assert payment["mayar_invoice_id"] == "invoice-1"
    assert payment["mayar_transaction_id"] == "transaction-1"


def test_mayar_requests_use_configured_v2_environment_and_api_key(monkeypatch):
    FakeHttpClient.calls.clear()
    monkeypatch.setattr(server.httpx, "AsyncClient", FakeHttpClient)
    monkeypatch.setenv("MAYAR_API_KEY", "test-mayar-api-key")
    monkeypatch.setenv("MAYAR_IS_SANDBOX", "true")

    result = asyncio.run(server.mayar_request("GET", "/invoices/invoice-1"))

    assert result["id"] == "invoice-1"
    method, url, kwargs = FakeHttpClient.calls[0]
    assert method == "GET"
    assert url == "https://api.mayar.io/hl/v2/invoices/invoice-1"
    assert kwargs["headers"]["Authorization"] == "test-mayar-api-key"


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


def test_local_test_account_gets_business_access_without_expiry(monkeypatch):
    plan_collection = FakeCollection(copy.deepcopy(server.DEFAULT_BILLING_CONFIG))
    invitation_collection = FakeCollection()
    monkeypatch.setattr(server, "db", SimpleNamespace(
        platform_settings=plan_collection,
        invitations=invitation_collection,
    ))
    monkeypatch.setitem(server.app.dependency_overrides, server.get_current_user, lambda: {
        "id": "tester-1",
        "is_test_account": True,
    })

    client = TestClient(server.app)
    created = client.post("/api/invitations", json={
        "plan_id": "basic",
        "title": "Undangan QA",
        "content": {},
        "slug": "undangan-qa",
    })

    assert created.status_code == 200
    invitation = created.json()
    assert invitation["plan_id"] == "business"
    assert invitation["status"] == "active"
    assert invitation["active_until"] == server.TEST_ACCOUNT_ACTIVE_UNTIL

    published = client.post(f"/api/invitations/{invitation['id']}/publish")
    assert published.status_code == 200
    assert published.json()["status"] == "published"


def test_regular_user_still_gets_a_draft_without_tester_access(monkeypatch):
    monkeypatch.setattr(server, "db", SimpleNamespace(
        platform_settings=FakeCollection(copy.deepcopy(server.DEFAULT_BILLING_CONFIG)),
        invitations=FakeCollection(),
    ))
    monkeypatch.setitem(server.app.dependency_overrides, server.get_current_user, lambda: {"id": "regular-user"})

    response = TestClient(server.app).post("/api/invitations", json={
        "plan_id": "basic",
        "title": "Undangan Biasa",
        "content": {},
    })

    assert response.status_code == 200
    assert response.json()["status"] == "draft"
    assert response.json()["active_until"] is None
