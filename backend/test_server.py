import copy
import asyncio
import hashlib
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from pymongo.errors import DuplicateKeyError

import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError

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


class FakeCursor:
    def __init__(self, documents):
        self.documents = copy.deepcopy(documents)

    async def to_list(self, length):
        return self.documents[:length]


class FakeInvitationAccessCollection:
    def __init__(self, documents):
        self.documents = copy.deepcopy(documents)

    async def find_one(self, query, _projection=None):
        for document in self.documents:
            if all(
                document.get(key) in value["$in"] if isinstance(value, dict) and "$in" in value else document.get(key) == value
                for key, value in query.items()
            ):
                return copy.deepcopy(document)
        return None

    def find(self, query, _projection=None):
        documents = [
            document for document in self.documents
            if all(
                document.get(key) in value["$in"] if isinstance(value, dict) and "$in" in value else document.get(key) == value
                for key, value in query.items()
            )
        ]
        return FakeCursor(documents)


class FakeDashboardUsers:
    def __init__(self, documents):
        self.documents = copy.deepcopy(documents)

    async def create_index(self, *_args, **_kwargs):
        return None

    def find(self, query, _projection=None):
        return FakeCursor([
            document for document in self.documents
            if all(document.get(key) == value for key, value in query.items())
        ])

    async def find_one(self, query, _projection=None):
        return next((
            copy.deepcopy(document) for document in self.documents
            if all(document.get(key) == value for key, value in query.items())
        ), None)

    async def count_documents(self, query):
        return sum(all(document.get(key) == value for key, value in query.items()) for document in self.documents)

    async def insert_one(self, document):
        self.documents.append(copy.deepcopy(document))


class FakeAdvertisementUsers:
    def __init__(self, affiliate, owner):
        self.affiliate = affiliate
        self.owner = owner

    def find(self, _query, _projection=None):
        return FakeCursor([self.affiliate])

    async def find_one(self, query, _projection=None):
        return self.owner if query.get("id") == self.owner["id"] else None


class FakeBusinessInvitations:
    def __init__(self):
        self.invitation = {
            "id": "business-invitation",
            "owner_id": "business-owner",
            "plan_id": "business",
            "status": "published",
            "active_until": (datetime.now(timezone.utc) + timedelta(days=2)).isoformat(),
        }

    async def find_one(self, _query, _projection=None):
        return self.invitation


class FakeEmptySettings:
    async def find_one(self, _query, _projection=None):
        return None

    async def update_one(self, _query, _update, upsert=False):
        return None


class FakeLockedAffiliatePrograms:
    def __init__(self, program):
        self.program = program

    async def find_one(self, _query, _projection=None):
        return copy.deepcopy(self.program)


class FakeInvitationLimit:
    async def count_documents(self, _query):
        return 2


class FakeWritableCollection:
    def __init__(self):
        self.documents = []

    async def create_index(self, _field, unique=False):
        return None

    async def find_one(self, query, _projection=None):
        return next((copy.deepcopy(item) for item in self.documents if all(item.get(key) == value for key, value in query.items())), None)

    async def insert_one(self, document):
        self.documents.append(copy.deepcopy(document))


def test_health_endpoint_is_public():
    response = TestClient(server.app).get("/api/")

    assert response.status_code == 200
    assert response.json()["message"] == "Undangan.id API is running"


def test_public_invitation_only_exposes_enabled_digital_envelope_methods(monkeypatch):
    invitation = {
        "id": "invitation-1",
        "title": "Hari Bahagia",
        "slug": "hari-bahagia",
        "status": "published",
        "active_until": "9999-12-31T23:59:59+00:00",
        "content": {
            "event_type": "Pernikahan",
            "digital_envelope": {
                "bank": {"enabled": True, "name": "BCA", "account_name": "Aulia", "account_number": "12345"},
                "e_wallet": {"enabled": False, "provider": "DANA", "account_name": "Aulia", "account_number": "67890"},
                "qris": {"enabled": False, "image_url": "https://example.com/private-qris.png", "instructions": "Private instructions"},
            },
        },
    }
    monkeypatch.setattr(server, "db", SimpleNamespace(invitations=FakeCollection(invitation)))

    response = TestClient(server.app).get("/api/public/invitations/hari-bahagia")

    assert response.status_code == 200
    public_content = response.json()["content"]
    assert public_content["digital_envelope"] == {
        "bank": {"enabled": True, "name": "BCA", "account_name": "Aulia", "account_number": "12345"},
    }
    assert "67890" not in response.text
    assert "private-qris" not in response.text


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


def test_dashboard_admins_can_be_added_for_a_current_active_invitation(monkeypatch):
    now = datetime.now(timezone.utc)
    active_until = (now + timedelta(hours=2)).astimezone(timezone(timedelta(hours=7))).isoformat()
    expired_until = (now - timedelta(hours=2)).astimezone(timezone(timedelta(hours=7))).isoformat()
    owner = {"id": "owner-1", "role": "user"}
    users = FakeDashboardUsers([owner])
    monkeypatch.setattr(server, "db", SimpleNamespace(invitations=FakeInvitationAccessCollection([
        {"owner_id": "owner-1", "status": "published", "active_until": expired_until},
        {"owner_id": "owner-1", "status": "active", "active_until": active_until},
        {"owner_id": "owner-2", "status": "published", "active_until": active_until},
    ]), users=users, platform_settings=FakeCollection(copy.deepcopy(server.DEFAULT_BILLING_CONFIG))))
    monkeypatch.setitem(server.app.dependency_overrides, server.get_current_user, lambda: owner)
    client = TestClient(server.app)

    assert asyncio.run(server.has_active_invitation_package("owner-1")) is True
    assert asyncio.run(server.has_active_invitation_package("owner-2")) is True
    listed = client.get("/api/dashboard-admins")
    assert listed.status_code == 200
    assert listed.json()["eligible"] is True
    created = client.post("/api/dashboard-admins", json={
        "full_name": "Admin Acara",
        "email": "admin@example.com",
        "password": "secure-password",
    })
    assert created.status_code == 200
    assert created.json()["email"] == "admin@example.com"
    assert len(users.documents) == 2


def test_affiliate_and_dashboard_admin_can_check_in_and_read_their_assigned_invitation(monkeypatch):
    invitation = {
        "id": "invitation-1",
        "owner_id": "owner-1",
        "affiliate_id": "affiliate-1",
        "title": "Hari Bahagia",
        "slug": "hari-bahagia",
        "status": "published",
        "active_until": "9999-12-31T23:59:59+00:00",
        "content": {},
    }
    ticket = {
        "id": "ticket-1",
        "invitation_id": "invitation-1",
        "name": "Alya",
        "phone": "6281234567890",
        "token": "a" * 40,
    }
    guestbook = FakeGuestbookCollection()
    monkeypatch.setattr(server, "db", SimpleNamespace(
        invitations=FakeInvitationAccessCollection([invitation]),
        invitation_tickets=FakeTicketCollection(),
        guestbook_entries=guestbook,
    ))
    server.db.invitation_tickets.documents.append(ticket)
    affiliate = {"id": "affiliate-1", "role": "affiliate", "active": True}
    dashboard_admin = {"id": "admin-1", "owner_id": "owner-1", "role": "dashboard_admin", "active": True}

    affiliate_invitation = asyncio.run(server.get_dashboard_invitation("invitation-1", affiliate))
    assert affiliate_invitation["affiliate_id"] == "affiliate-1"
    first_check_in = asyncio.run(server.check_in_invitation_ticket(
        "invitation-1",
        server.InvitationTicketCheckIn(ticket_token=ticket["token"]),
        affiliate,
    ))
    duplicate_check_in = asyncio.run(server.check_in_invitation_ticket(
        "invitation-1",
        server.InvitationTicketCheckIn(ticket_token=ticket["token"]),
        dashboard_admin,
    ))

    assert first_check_in["already_checked_in"] is False
    assert first_check_in["entry"]["owner_id"] == "owner-1"
    assert duplicate_check_in["already_checked_in"] is True
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


@pytest.mark.parametrize("plan_id", ["basic", "premium", "business"])
def test_test_account_can_use_any_package_without_payment(monkeypatch, plan_id):
    test_access_until = (datetime.now(timezone.utc) + timedelta(days=300)).isoformat()
    invitation_collection = FakeCollection()
    monkeypatch.setattr(server, "db", SimpleNamespace(
        platform_settings=FakeCollection(copy.deepcopy(server.DEFAULT_BILLING_CONFIG)),
        invitations=invitation_collection,
    ))
    monkeypatch.setitem(server.app.dependency_overrides, server.get_current_user, lambda: {
        "id": "tester-1",
        "is_test_account": True,
        "test_access_until": test_access_until,
    })

    plan = next(item for item in server.DEFAULT_BILLING_CONFIG["plans"] if item["id"] == plan_id)
    payload = {
        "plan_id": plan_id,
        "title": "Undangan QA",
        "content": {},
    }
    if plan["slug_mode"] == "custom":
        payload["slug"] = f"undangan-qa-{plan_id}"
    created = TestClient(server.app).post("/api/invitations", json=payload)

    assert created.status_code == 200
    invitation = created.json()
    assert invitation["plan_id"] == plan_id
    assert invitation["status"] == "active"
    assert invitation["active_until"] == test_access_until

    published = TestClient(server.app).post(f"/api/invitations/{invitation['id']}/publish")
    assert published.status_code == 200
    assert published.json()["status"] == "published"


def test_test_account_access_requires_a_valid_expiry():
    assert server.test_account_access_expired({"is_test_account": True}) is True
    assert server.test_account_access_expired({
        "is_test_account": True,
        "test_access_until": (datetime.now(timezone.utc) - timedelta(seconds=1)).isoformat(),
    }) is True
    assert server.test_account_access_expired({
        "is_test_account": True,
        "test_access_until": (datetime.now(timezone.utc) + timedelta(days=1)).isoformat(),
    }) is False


def test_expired_test_account_cannot_log_in(monkeypatch):
    password = "temporary-test-password"
    expired_user = {
        "id": "tester-1",
        "email": "tester@example.com",
        "full_name": "Tester",
        "password_hash": server.bcrypt.hashpw(password.encode(), server.bcrypt.gensalt()).decode(),
        "is_test_account": True,
        "test_access_until": (datetime.now(timezone.utc) - timedelta(days=1)).isoformat(),
    }
    monkeypatch.setattr(server, "db", SimpleNamespace(users=FakeCollection(expired_user)))
    monkeypatch.setattr(server, "get_jwt_secret", lambda: "test-secret-with-at-least-32-characters")

    response = TestClient(server.app).post("/api/auth/login", json={
        "email": expired_user["email"],
        "password": password,
    })

    assert response.status_code == 403
    assert "berakhir" in response.json()["detail"].lower()


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


def test_public_affiliate_ad_requires_active_business_owner(monkeypatch):
    affiliate = {
        "id": "affiliate-1",
        "owner_id": "business-owner",
        "role": "affiliate",
        "active": True,
        "ad_active": True,
        "ad_title": "Promo undangan",
        "ad_description": "Paket undangan digital",
        "ad_url": "https://example.com/promo",
        "ad_image": "https://example.com/promo.jpg",
        "full_name": "Mitra Undangan",
    }
    owner = {"id": "business-owner", "role": "user"}
    monkeypatch.setattr(server, "db", SimpleNamespace(
        users=FakeAdvertisementUsers(affiliate, owner),
        invitations=FakeBusinessInvitations(),
    ))

    response = TestClient(server.app).get("/api/public/advertisements")

    assert response.status_code == 200
    assert response.json() == [{
        "id": "affiliate-1",
        "title": "Promo undangan",
        "description": "Paket undangan digital",
        "url": "https://example.com/promo",
        "image": "https://example.com/promo.jpg",
        "advertiser": "Mitra Undangan",
    }]


def test_affiliate_ad_url_rejects_non_http_urls():
    with pytest.raises(ValidationError):
        server.AffiliateCreate(
            full_name="Affiliate Test",
            email="affiliate@example.com",
            password="password123",
            basic_quota=1,
            ad_url="javascript:alert(1)",
        )


def test_dashboard_admin_cannot_read_invitation_drafts(monkeypatch):
    monkeypatch.setattr(server, "db", SimpleNamespace(invitations=FakeCollection({
        "id": "invitation-draft",
        "owner_id": "owner-1",
        "status": "draft",
    })))
    monkeypatch.setitem(server.app.dependency_overrides, server.get_current_user, lambda: {
        "id": "admin-1",
        "owner_id": "owner-1",
        "role": "dashboard_admin",
        "active": True,
    })

    response = TestClient(server.app).get("/api/invitations/invitation-draft")

    assert response.status_code == 404


def test_demo_account_cannot_create_more_than_two_invitations(monkeypatch):
    monkeypatch.setattr(server, "db", SimpleNamespace(
        platform_settings=FakeEmptySettings(),
        invitations=FakeInvitationLimit(),
    ))

    with pytest.raises(server.HTTPException) as error:
        asyncio.run(server.create_invitation(
            server.InvitationCreate(plan_id="basic", title="Undangan ketiga", content={}),
            {
                "id": "demo-owner",
                "role": "user",
                "is_demo": True,
                "demo_plan_id": "basic",
                "demo_until": (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat(),
            },
        ))

    assert error.value.status_code == 409
    assert "2 undangan" in error.value.detail


def test_business_affiliate_package_cannot_be_changed_after_selection(monkeypatch):
    owner = {"id": "business-owner", "role": "user"}
    active_business = FakeBusinessInvitations()
    locked_program = {
        "owner_id": owner["id"],
        "combination_id": "premium-3",
        "combination": {"id": "premium-3", "name": "3 Premium", "basic": 0, "premium": 3},
    }
    monkeypatch.setattr(server, "db", SimpleNamespace(
        invitations=active_business,
        platform_settings=FakeEmptySettings(),
        affiliate_programs=FakeLockedAffiliatePrograms(locked_program),
    ))

    with pytest.raises(server.HTTPException) as error:
        asyncio.run(server.select_affiliate_combination(
            server.AffiliateProgramUpdate(combination_id="basic-8"),
            owner,
        ))

    assert error.value.status_code == 409
    assert "tidak dapat diubah" in error.value.detail


def test_demo_account_expiration_is_enforced():
    expired = {
        "role": "user",
        "is_demo": True,
        "demo_until": (datetime.now(timezone.utc) - timedelta(minutes=1)).isoformat(),
    }

    assert asyncio.run(server.demo_account_expired(expired)) is True


def test_demo_account_requires_positive_days_or_hours():
    with pytest.raises(ValidationError):
        server.DemoAccountCreate(
            full_name="Demo User",
            email="demo@example.com",
            password="password123",
            plan_id="business",
            combination_id="premium-3",
            duration_days=0,
            duration_hours=0,
        )


def test_super_admin_creates_demo_with_locked_package_and_custom_expiration(monkeypatch):
    users = FakeWritableCollection()
    programs = FakeWritableCollection()
    monkeypatch.setattr(server, "db", SimpleNamespace(
        platform_settings=FakeEmptySettings(),
        users=users,
        affiliate_programs=programs,
    ))
    payload = server.DemoAccountCreate(
        full_name="Demo Business",
        email="demo-business@example.com",
        password="password123",
        plan_id="business",
        combination_id="basic-8",
        duration_days=2,
        duration_hours=3,
    )
    started_at = datetime.now(timezone.utc)

    account = asyncio.run(server.create_demo_account(payload, {"email": "admin@example.com"}))

    user = users.documents[0]
    program = programs.documents[0]
    remaining = datetime.fromisoformat(account["demo_until"]) - started_at
    assert account["plan_id"] == "business"
    assert timedelta(days=2, hours=3) <= remaining <= timedelta(days=2, hours=3, seconds=1)
    assert user["is_demo"] is True
    assert user["demo_plan_id"] == "business"
    assert program["combination_id"] == "basic-8"
    assert program["combination"]["basic"] == 8
