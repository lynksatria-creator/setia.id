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
    def __init__(self, payload):
        self.payload = payload

    def raise_for_status(self):
        return None

    def json(self):
        return self.payload


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
        payload = {"transaction_status": "pending"} if method == "GET" else {
            "token": "snap-token",
            "redirect_url": "https://app.sandbox.midtrans.com/snap/v2/vtweb/snap-token",
        }
        return FakeHttpResponse(payload)


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


class FakeRegistrationOtpCollection:
    def __init__(self):
        self.documents = {}

    async def create_index(self, *_args, **_kwargs):
        return None

    async def find_one(self, query, _projection=None):
        document = self.documents.get(query["email"])
        return copy.deepcopy(document)

    async def replace_one(self, query, document, upsert=False):
        assert upsert is True
        self.documents[query["email"]] = copy.deepcopy(document)

    async def find_one_and_update(self, query, update, return_document):
        assert return_document == server.ReturnDocument.AFTER
        document = self.documents.get(query["email"])
        if document is None or document["attempts"] >= query["attempts"]["$lt"]:
            return None
        document["attempts"] += update["$inc"]["attempts"]
        return copy.deepcopy(document)

    async def delete_one(self, query):
        self.documents.pop(query["email"], None)


class FakeUsersCollection:
    def __init__(self):
        self.documents = {}

    async def create_index(self, *_args, **_kwargs):
        return None

    async def find_one(self, query, _projection=None):
        return copy.deepcopy(self.documents.get(query["email"]))

    async def insert_one(self, document):
        if document["email"] in self.documents:
            raise DuplicateKeyError("duplicate email")
        self.documents[document["email"]] = copy.deepcopy(document)


class FakePackageCapacityLocks:
    def __init__(self):
        self.document = None

    async def find_one_and_update(self, query, update, upsert, return_document):
        now = datetime.now(timezone.utc).isoformat()
        if self.document and self.document.get("expires_at", "") > now:
            raise DuplicateKeyError("package capacity lock is held")
        assert upsert is True
        assert return_document == server.ReturnDocument.AFTER
        self.document = {"_id": query["_id"], **copy.deepcopy(update["$set"])}
        return copy.deepcopy(self.document)

    async def update_one(self, query, update):
        if self.document and all(self.document.get(key) == value for key, value in query.items()):
            for key in update["$unset"]:
                self.document.pop(key, None)
        return None


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

    def find(self, query, _projection=None):
        return FakeTestimonialCursor([
            document for document in self.documents
            if all(document.get(key) == value for key, value in query.items())
        ])

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


class FakeTestimonialCursor:
    def __init__(self, documents):
        self.documents = copy.deepcopy(documents)

    def sort(self, field, direction):
        self.documents.sort(key=lambda item: item.get(field, ""), reverse=direction < 0)
        return self

    async def to_list(self, length):
        return self.documents[:length]


class FakeTestimonialCollection:
    def __init__(self):
        self.documents = []

    def find(self, query, _projection=None):
        documents = []
        for item in self.documents:
            if query.get("site") and item.get("site") != query["site"]:
                continue
            status_filter = query.get("status")
            if isinstance(status_filter, dict) and item.get("status") not in status_filter.get("$in", []):
                continue
            if isinstance(status_filter, str) and item.get("status") != status_filter:
                continue
            documents.append(item)
        return FakeTestimonialCursor(documents)

    async def insert_one(self, document):
        self.documents.append(copy.deepcopy(document))

    async def find_one(self, query, _projection=None):
        return next((copy.deepcopy(item) for item in self.documents if all(item.get(key) == value for key, value in query.items())), None)

    async def update_one(self, query, update):
        item = next((item for item in self.documents if all(item.get(key) == value for key, value in query.items())), None)
        if item is None or all(item.get(key) == value for key, value in update["$set"].items()):
            return SimpleNamespace(modified_count=0)
        item.update(update["$set"])
        return SimpleNamespace(modified_count=1)


def test_saved_midtrans_checkout_config_remains_midtrans(monkeypatch):
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

    assert migrated["payment_methods"][0]["provider"] == "midtrans"
    assert migrated["payment_methods"][0]["name"] == "Midtrans checkout"
    assert "payment_code" not in migrated["payment_methods"][0]
    assert migrated["payment_methods"][1]["provider"] == "manual"


def test_saved_mayar_checkout_config_migrates_to_midtrans(monkeypatch):
    config = copy.deepcopy(server.DEFAULT_BILLING_CONFIG)
    config["payment_methods"][0] = {
        "id": "mayar",
        "name": "Mayar checkout",
        "provider": "mayar",
        "enabled": True,
    }
    monkeypatch.setattr(server, "db", SimpleNamespace(platform_settings=FakeCollection(config)))

    migrated = asyncio.run(server.get_billing_config())

    assert migrated["payment_methods"][0]["provider"] == "midtrans"
    assert migrated["payment_methods"][0]["name"] == "Midtrans checkout"
    assert migrated["schema_version"] == 4


def test_legacy_billing_config_gets_package_and_reseller_entitlements(monkeypatch):
    config = copy.deepcopy(server.DEFAULT_BILLING_CONFIG)
    config.pop("schema_version")
    premium = next(plan for plan in config["plans"] if plan["id"] == "premium")
    premium["max_invitations"] = 3
    premium["features"][0] = "3 undangan aktif"
    for plan in config["plans"]:
        for field in ("bulk_upload_enabled", "max_recipients", "reseller_enabled", "max_resellers"):
            plan.pop(field, None)
    monkeypatch.setattr(server, "db", SimpleNamespace(platform_settings=FakeCollection(config)))

    migrated = asyncio.run(server.get_billing_config())

    plans = {plan["id"]: plan for plan in migrated["plans"]}
    assert migrated["schema_version"] == 4
    assert plans["basic"]["max_invitations"] == 1
    assert plans["basic"]["bulk_upload_enabled"] is False
    assert plans["basic"]["max_recipients"] == 1
    assert plans["premium"]["max_invitations"] == 5
    assert plans["premium"]["features"][0] == "5 undangan aktif"
    assert plans["premium"]["bulk_upload_enabled"] is True
    assert plans["business"]["reseller_enabled"] is True
    assert plans["business"]["max_reseller_customers"] == 1000
    assert plans["business"]["reseller_commission_percent"] == 10


def test_package_capacity_lock_serializes_concurrent_order_attempts(monkeypatch):
    locks = FakePackageCapacityLocks()
    monkeypatch.setattr(server, "db", SimpleNamespace(package_capacity_locks=locks))

    lock_id, token = asyncio.run(server.acquire_package_capacity_lock("owner-1", "premium"))
    with pytest.raises(server.HTTPException) as error:
        asyncio.run(server.acquire_package_capacity_lock("owner-1", "premium"))
    assert error.value.status_code == 409

    asyncio.run(server.release_package_capacity_lock(lock_id, token))
    next_lock_id, next_token = asyncio.run(server.acquire_package_capacity_lock("owner-1", "premium"))
    assert next_lock_id == lock_id
    assert next_token != token


class FakeCursor:
    def __init__(self, documents):
        self.documents = copy.deepcopy(documents)

    def sort(self, key, direction):
        self.documents.sort(key=lambda document: document.get(key, ""), reverse=direction < 0)
        return self

    async def to_list(self, length):
        return self.documents[:length]


class FakeAffiliateAdminUsers:
    def __init__(self, documents):
        self.documents = copy.deepcopy(documents)

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

    async def update_one(self, query, update):
        for document in self.documents:
            if all(document.get(key) == value for key, value in query.items()):
                document.update(copy.deepcopy(update["$set"]))
                return


class FakeAffiliateAdminInvitations:
    def __init__(self, documents):
        self.documents = copy.deepcopy(documents)

    async def count_documents(self, query):
        return sum(
            all(document.get(key) == value for key, value in query.items())
            for document in self.documents
        )


class FakeInvitationAccessCollection:
    def __init__(self, documents):
        self.documents = copy.deepcopy(documents)

    @staticmethod
    def _matches(document, query):
        for key, value in query.items():
            actual = document.get(key)
            if isinstance(value, dict) and "$in" in value:
                if actual not in value["$in"]:
                    return False
            elif isinstance(value, dict) and "$gt" in value:
                if actual is None or actual <= value["$gt"]:
                    return False
            elif actual != value:
                return False
        return True

    async def find_one(self, query, _projection=None):
        for document in self.documents:
            if self._matches(document, query):
                return copy.deepcopy(document)
        return None

    def find(self, query, _projection=None):
        documents = [
            document for document in self.documents
            if self._matches(document, query)
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

    def find(self, query, _projection=None):
        matches = all(
            self.invitation.get(key) in value["$in"] if isinstance(value, dict) and "$in" in value
            else self.invitation.get(key, "") > value["$gt"] if isinstance(value, dict) and "$gt" in value
            else self.invitation.get(key) == value
            for key, value in query.items()
        )
        return FakeCursor([self.invitation] if matches else [])


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


class FakeConsultationCollection:
    def __init__(self):
        self.documents = []

    def find(self, _query, _projection=None):
        return FakeCursor(self.documents)

    async def insert_one(self, document):
        self.documents.append(copy.deepcopy(document))

    async def find_one(self, query, _projection=None):
        return next((copy.deepcopy(item) for item in self.documents if item.get("id") == query.get("id")), None)

    async def update_one(self, query, update):
        item = next((entry for entry in self.documents if entry.get("id") == query.get("id")), None)
        if item is None:
            return SimpleNamespace(modified_count=0)
        changed = any(item.get(key) != value for key, value in update["$set"].items())
        item.update(update["$set"])
        return SimpleNamespace(modified_count=int(changed))


def test_health_endpoint_is_public():
    response = TestClient(server.app).get("/api/")

    assert response.status_code == 200
    assert response.json()["message"] == "Nuansa Invite API is running"


def test_seo_config_is_per_site_public_and_admin_managed(monkeypatch):
    monkeypatch.setenv("JWT_SECRET", "test-secret-that-is-at-least-32-characters-long")

    class SettingsCollection:
        def __init__(self):
            self.documents = {}

        async def find_one(self, query, _projection=None):
            return copy.deepcopy(self.documents.get(query["key"]))

        async def update_one(self, query, update, upsert=False):
            assert upsert is True
            self.documents[query["key"]] = copy.deepcopy(update["$set"])

    settings = SettingsCollection()
    audit_logs = FakeCollection()
    monkeypatch.setattr(server, "db", SimpleNamespace(platform_settings=settings, audit_logs=audit_logs))
    client = TestClient(server.app)

    assert client.get("/api/public/seo/gibrig").json() == {"site": "gibrig", "seo": None}
    assert client.put("/api/admin/seo/gibrig", json={}).status_code == 401

    token = server.create_access_token("admin@example.com", role="admin")
    headers = {"Authorization": f"Bearer {token}"}
    config = {
        "title": "Gibrig Entertainment | Musik Live Garut",
        "description": "Hiburan musik live untuk pernikahan dan acara keluarga di Garut bersama Gibrig Entertainment.",
        "keywords": "musik live Garut, hiburan wedding, Gibrig Entertainment",
        "canonicalUrl": "https://portal.id/gibrig",
        "ogImage": "https://portal.id/gibrig-share.jpg",
        "noIndex": False,
    }
    saved = client.put("/api/admin/seo/gibrig", headers=headers, json=config)

    assert saved.status_code == 200
    assert saved.json() == {"site": "gibrig", "seo": config}
    assert client.get("/api/public/seo/gibrig").json() == {"site": "gibrig", "seo": config}
    assert client.get("/api/public/seo/nunuy").json() == {"site": "nunuy", "seo": None}
    assert audit_logs.document["action"] == "seo.config.updated"


def test_portal_ads_config_is_saved_and_limited_to_super_admin(monkeypatch):
    monkeypatch.setenv("JWT_SECRET", "test-secret-that-is-at-least-32-characters-long")

    class SettingsCollection:
        def __init__(self):
            self.documents = {}

        async def find_one(self, query, _projection=None):
            return copy.deepcopy(self.documents.get(query["key"]))

        async def update_one(self, query, update, upsert=False):
            assert upsert is True
            self.documents[query["key"]] = copy.deepcopy(update["$set"])

    settings = SettingsCollection()
    audit_logs = FakeCollection()
    monkeypatch.setattr(server, "db", SimpleNamespace(platform_settings=settings, audit_logs=audit_logs))
    client = TestClient(server.app)
    config = {
        "page": {"title": "Iklan Partner", "description": "Pilihan partner Aurora.", "layout": "featured"},
        "top": {
            "enabled": True,
            "label": "PARTNER PILIHAN",
            "title": "Studio Momen",
            "description": "Dekorasi dan dokumentasi untuk hari istimewa.",
            "image": "https://example.com/banner.jpg",
            "href": "https://studio.example",
            "format": "banner",
            "animation": "rise",
            "duration": 12,
            "imageWidth": 65,
            "imageHeight": 420,
        },
        "midFeed": {"enabled": False},
        "sidebar": {"enabled": False},
        "floatingBottom": {"enabled": False},
    }

    assert client.get("/api/public/portal-ads").json() == {"ads": None}
    assert client.put("/api/admin/portal-ads", json=config).status_code == 401
    site_admin = server.create_access_token("gibrig@example.com", role="admin", scope="gibrig")
    assert client.put(
        "/api/admin/portal-ads",
        headers={"Authorization": f"Bearer {site_admin}"},
        json=config,
    ).status_code == 403

    token = server.create_access_token("admin@example.com", role="admin", scope="all")
    headers = {"Authorization": f"Bearer {token}"}
    saved = client.put("/api/admin/portal-ads", headers=headers, json=config)

    assert saved.status_code == 200
    assert saved.json()["ads"]["top"].get("duration") == 12
    assert saved.json()["ads"]["top"]["imageWidth"] == 65
    assert saved.json()["ads"]["top"]["imageHeight"] == 420
    assert saved.json()["ads"]["top"]["description"] == "Dekorasi dan dokumentasi untuk hari istimewa."
    assert client.get("/api/public/portal-ads").json() == saved.json()
    assert audit_logs.document["action"] == "portal.ads.updated"


def test_seo_config_rejects_non_https_canonical_urls(monkeypatch):
    monkeypatch.setenv("JWT_SECRET", "test-secret-that-is-at-least-32-characters-long")
    token = server.create_access_token("admin@example.com", role="admin")
    response = TestClient(server.app).put(
        "/api/admin/seo/portal",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "title": "Portal SEO title",
            "description": "Deskripsi SEO cukup lengkap.",
            "canonicalUrl": "http://portal.id/",
        },
    )

    assert response.status_code == 422


def test_site_contact_config_is_shared_and_scope_protected(monkeypatch):
    monkeypatch.setenv("JWT_SECRET", "test-secret-that-is-at-least-32-characters-long")

    class SettingsCollection:
        def __init__(self):
            self.documents = {}

        async def find_one(self, query, _projection=None):
            return copy.deepcopy(self.documents.get(query["key"]))

        async def update_one(self, query, update, upsert=False):
            assert upsert is True
            self.documents[query["key"]] = copy.deepcopy(update["$set"])

    settings = SettingsCollection()
    monkeypatch.setattr(server, "db", SimpleNamespace(platform_settings=settings))
    client = TestClient(server.app)
    config = {
        "phone": "+62 811-2233-4455",
        "whatsappNumber": "+62 811-9988-7766",
        "whatsappMessage": "Halo Nunuy",
    }

    for site in ("portal", "gibrig", "nunuy", "invitation"):
        assert client.get(f"/api/public/site-contact/{site}").json() == {"site": site, "contact": None}
        assert client.put(f"/api/admin/site-contact/{site}", json=config).status_code == 401
        scope = "all" if site == "portal" else site
        token = server.create_access_token(f"{site}@example.com", role="admin", scope=scope)
        headers = {"Authorization": f"Bearer {token}"}
        saved = client.put(f"/api/admin/site-contact/{site}", headers=headers, json=config)

        assert saved.status_code == 200
        assert saved.json() == {"site": site, "contact": config}
        assert client.get(f"/api/public/site-contact/{site}").json() == {"site": site, "contact": config}

    gibrig_token = server.create_access_token("gibrig@example.com", role="admin", scope="gibrig")
    assert client.put(
        "/api/admin/site-contact/nunuy",
        headers={"Authorization": f"Bearer {gibrig_token}"},
        json=config,
    ).status_code == 403


def test_public_testimonial_requires_admin_approval_and_can_be_hidden(monkeypatch):
    monkeypatch.setenv("JWT_SECRET", "test-secret-that-is-at-least-32-characters-long")
    testimonials = FakeTestimonialCollection()
    monkeypatch.setattr(server, "db", SimpleNamespace(testimonials=testimonials))
    client = TestClient(server.app)
    payload = {
        "site": "nunuy",
        "name": "Alya dan Bima",
        "event": "Pernikahan · Bandung",
        "message": "Tim membantu hari pernikahan kami berjalan lancar.",
        "rating": 5,
    }

    submitted = client.post("/api/public/testimonials", json=payload)
    assert submitted.status_code == 200
    assert submitted.json()["status"] == "pending"
    assert client.get("/api/public/testimonials/nunuy").json() == []

    assert client.get("/api/admin/testimonials?site=nunuy").status_code == 401
    admin_token = server.create_access_token("admin@example.com", role="admin")
    headers = {"Authorization": f"Bearer {admin_token}"}
    queued = client.get("/api/admin/testimonials?site=nunuy", headers=headers)
    assert queued.status_code == 200
    assert len(queued.json()) == 1
    testimonial_id = queued.json()[0]["id"]

    approved = client.patch(
        f"/api/admin/testimonials/{testimonial_id}",
        headers=headers,
        json={"status": "visible"},
    )
    assert approved.status_code == 200
    public_items = client.get("/api/public/testimonials/nunuy").json()
    assert len(public_items) == 1
    assert public_items[0]["name"] == payload["name"]

    hidden = client.patch(
        f"/api/admin/testimonials/{testimonial_id}",
        headers=headers,
        json={"status": "hidden"},
    )
    assert hidden.status_code == 200
    assert client.get("/api/public/testimonials/nunuy").json() == []


def test_public_testimonial_validates_site_and_content(monkeypatch):
    monkeypatch.setattr(server, "db", SimpleNamespace(testimonials=FakeTestimonialCollection()))
    response = TestClient(server.app).post("/api/public/testimonials", json={
        "site": "unknown",
        "name": "A",
        "event": "x",
        "message": "short",
        "rating": 8,
    })

    assert response.status_code == 422


def test_website_rating_stays_pending_until_published(monkeypatch):
    monkeypatch.setenv("JWT_SECRET", "test-secret-that-is-at-least-32-characters-long")
    testimonials = FakeTestimonialCollection()
    monkeypatch.setattr(server, "db", SimpleNamespace(testimonials=testimonials))
    client = TestClient(server.app)

    submitted = client.post("/api/public/testimonials", json={
        "kind": "rating",
        "site": "portal",
        "message": "Informasi partner mudah ditemukan.",
        "rating": 4,
    })

    assert submitted.status_code == 200
    assert submitted.json()["status"] == "pending"
    assert client.get("/api/public/testimonials/portal").json() == []

    admin_token = server.create_access_token("admin@example.com", role="admin")
    headers = {"Authorization": f"******"}
    rating = testimonials.documents[0]
    assert rating["kind"] == "rating"
    assert rating["rating"] == 4
    assert rating["message"] == "Informasi partner mudah ditemukan."
    rating["status"] = "visible"
    public_rating = client.get("/api/public/testimonials/portal").json()
    assert client.get("/api/public/testimonials/nunuy").json() == []
    assert len(public_rating) == 1
    assert public_rating[0]["kind"] == "rating"
    assert public_rating[0]["rating"] == 4
    assert rating["site"] == "portal"
    assert public_rating[0]["message"] == "Informasi partner mudah ditemukan."


def test_nunuy_consultation_is_saved_and_managed_only_by_admin(monkeypatch):
    monkeypatch.setenv("JWT_SECRET", "test-secret-that-is-at-least-32-characters-long")
    consultations = FakeConsultationCollection()
    monkeypatch.setattr(server, "db", SimpleNamespace(nunuy_consultations=consultations))
    client = TestClient(server.app)

    response = client.post("/api/public/nunuy-consultations", json={
        "couple": "Alya & Bima",
        "phone": "+62 812-3456-7890",
        "email": "alya@example.com",
        "wedding_date": "2027-06-12",
        "location": "Bandung",
        "guests": 180,
        "service": "Wedding Organizer",
        "package": "Gold",
        "notes": "Tema lilac",
    })

    assert response.status_code == 200
    assert response.json()["status"] == "new"
    assert client.get("/api/admin/nunuy-consultations").status_code == 401

    token = server.create_access_token("admin@example.com", role="admin")
    headers = {"Authorization": f"Bearer {token}"}
    queued = client.get("/api/admin/nunuy-consultations", headers=headers)
    assert queued.status_code == 200
    assert queued.json()[0]["couple"] == "Alya & Bima"
    assert queued.json()[0]["wedding_date"] == "2027-06-12"

    consultation_id = response.json()["id"]
    updated = client.patch(
        f"/api/admin/nunuy-consultations/{consultation_id}",
        headers=headers,
        json={"status": "contacted"},
    )
    assert updated.status_code == 200
    assert updated.json()["status"] == "contacted"
    assert consultations.documents[0]["status"] == "contacted"


def test_nunuy_consultation_validates_public_contact_data(monkeypatch):
    monkeypatch.setattr(server, "db", SimpleNamespace(nunuy_consultations=FakeConsultationCollection()))
    response = TestClient(server.app).post("/api/public/nunuy-consultations", json={
        "couple": "A",
        "phone": "not a phone",
        "email": "not-an-email",
    })
    assert response.status_code == 422


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


@pytest.mark.parametrize("password", ["password123", "PASSWORD123", "Passwordabc", "Pass1"])
def test_registration_rejects_password_without_required_character_types(password):
    with pytest.raises(ValidationError):
        server.UserRegistration.model_validate({
            "full_name": "Test User",
            "email": "test@example.com",
            "password": password,
        })


@pytest.mark.parametrize("password", ["Password123", "Password123!"])
def test_registration_accepts_password_with_or_without_symbol(password):
    registration = server.UserRegistration.model_validate({
        "full_name": "Test User",
        "email": "test@example.com",
        "password": password,
    })

    assert registration.password == password


def test_admin_settings_reject_anonymous_requests():
    response = TestClient(server.app).get("/api/admin/billing/config")

    assert response.status_code == 401


def test_registration_requires_jwt_secret(monkeypatch):
    monkeypatch.delenv("JWT_SECRET", raising=False)
    response = TestClient(server.app).post(
        "/api/auth/register",
        json={"full_name": "Test User", "email": "test@example.com", "password": "Password123"},
    )

    assert response.status_code == 503
    assert "JWT_SECRET" in response.json()["detail"]


def test_registration_requires_configured_mailtarget(monkeypatch):
    monkeypatch.setenv("JWT_SECRET", "test-secret-that-is-at-least-32-characters-long")
    monkeypatch.delenv("MAILTARGET_API_KEY", raising=False)
    monkeypatch.delenv("MAILTARGET_FROM_EMAIL", raising=False)
    monkeypatch.delenv("SMTP_FROM_EMAIL", raising=False)
    monkeypatch.setattr(server, "db", SimpleNamespace(
        users=FakeUsersCollection(),
        registration_otps=FakeRegistrationOtpCollection(),
    ))

    response = TestClient(server.app).post("/api/auth/register", json={
        "full_name": "Test User",
        "email": "test@example.com",
        "password": "Password123",
    })

    assert response.status_code == 503
    assert "MAILTARGET_API_KEY" in response.json()["detail"]


def test_registration_otp_is_sent_through_mailtarget(monkeypatch):
    monkeypatch.setenv("MAILTARGET_API_KEY", "test-mailtarget-key")
    monkeypatch.setenv("MAILTARGET_FROM_EMAIL", "hello@example.com")
    captured = {}

    class MailtargetResponse:
        def raise_for_status(self):
            return None

    class MailtargetClient:
        def __init__(self, **_kwargs):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, *_args):
            return None

        async def post(self, url, **kwargs):
            captured.update(url=url, **kwargs)
            return MailtargetResponse()

    monkeypatch.setattr(server.httpx, "AsyncClient", MailtargetClient)

    asyncio.run(server.send_registration_code_email("recipient@example.com", "Test User", "123456"))

    assert captured["url"] == "https://transmission.mailtarget.co/v1/layang/transmissions"
    assert captured["headers"]["Authorization"] == "Bearer test-mailtarget-key"
    assert captured["json"]["from"]["email"] == "hello@example.com"
    assert captured["json"]["to"] == [{"email": "recipient@example.com", "name": "Test User"}]
    assert "123456" in captured["json"]["bodyText"]


def test_registration_verifies_email_otp_before_creating_session(monkeypatch):
    monkeypatch.setenv("JWT_SECRET", "test-secret-that-is-at-least-32-characters-long")
    users = FakeUsersCollection()
    registration_otps = FakeRegistrationOtpCollection()
    monkeypatch.setattr(server, "db", SimpleNamespace(users=users, registration_otps=registration_otps))
    sent_codes = []
    generated_codes = iter([123456, 654321])
    monkeypatch.setattr(server.secrets, "randbelow", lambda _limit: next(generated_codes))

    async def capture_registration_email(email, full_name, code):
        sent_codes.append((email, full_name, code))

    monkeypatch.setattr(server, "send_registration_code_email", capture_registration_email)
    client = TestClient(server.app)

    requested = client.post("/api/auth/register", json={
        "full_name": "Test User",
        "email": "Test@Example.com",
        "password": "Password123",
    })
    assert requested.status_code == 200
    assert "OTP" in requested.json()["message"]
    assert users.documents == {}
    assert sent_codes[0][:2] == ("test@example.com", "Test User")
    assert sent_codes[0][2].isdigit() and len(sent_codes[0][2]) == 6
    pending = registration_otps.documents["test@example.com"]
    assert pending["code_hash"] != sent_codes[0][2]
    assert pending["expires_at"] > datetime.now(timezone.utc)
    throttled_resend = client.post("/api/auth/register/resend", json={"email": "test@example.com"})
    assert throttled_resend.status_code == 429

    wrong_code = client.post("/api/auth/register/verify", json={
        "email": "test@example.com",
        "code": "000000" if sent_codes[0][2] != "000000" else "000001",
    })
    assert wrong_code.status_code == 400
    assert registration_otps.documents["test@example.com"]["attempts"] == 1
    assert "access_token" not in wrong_code.json()

    registration_otps.documents["test@example.com"]["last_sent_at"] -= timedelta(seconds=61)
    resent = client.post("/api/auth/register/resend", json={"email": "test@example.com"})
    assert resent.status_code == 200
    assert len(sent_codes) == 2
    assert sent_codes[1][2] != sent_codes[0][2]

    verified = client.post("/api/auth/register/verify", json={
        "email": "test@example.com",
        "code": sent_codes[1][2],
    })
    assert verified.status_code == 200
    assert verified.json()["user"]["email"] == "test@example.com"
    assert users.documents["test@example.com"]["email_verified"] is True
    assert registration_otps.documents == {}

    replayed = client.post("/api/auth/register/verify", json={
        "email": "test@example.com",
        "code": sent_codes[1][2],
    })
    assert replayed.status_code == 400


def test_registration_rejects_expired_email_otp(monkeypatch):
    monkeypatch.setenv("JWT_SECRET", "test-secret-that-is-at-least-32-characters-long")
    users = FakeUsersCollection()
    pending = FakeRegistrationOtpCollection()
    pending.documents["test@example.com"] = {
        "email": "test@example.com",
        "full_name": "Test User",
        "password_hash": "hashed-password",
        "code_hash": server.hmac.new(
            b"test-secret-that-is-at-least-32-characters-long",
            b"123456",
            server.hashlib.sha256,
        ).hexdigest(),
        "attempts": 0,
        "last_sent_at": datetime.now(timezone.utc) - timedelta(minutes=11),
        "expires_at": datetime.now(timezone.utc) - timedelta(minutes=1),
    }
    monkeypatch.setattr(server, "db", SimpleNamespace(users=users, registration_otps=pending))

    response = TestClient(server.app).post("/api/auth/register/verify", json={
        "email": "test@example.com",
        "code": "123456",
    })

    assert response.status_code == 400
    assert "kedaluwarsa" in response.json()["detail"]
    assert users.documents == {}
    assert pending.documents == {}


def test_registration_limits_otp_attempts(monkeypatch):
    monkeypatch.setenv("JWT_SECRET", "test-secret-that-is-at-least-32-characters-long")
    users = FakeUsersCollection()
    pending = FakeRegistrationOtpCollection()
    pending.documents["test@example.com"] = {
        "email": "test@example.com",
        "full_name": "Test User",
        "password_hash": "hashed-password",
        "code_hash": server.hmac.new(
            b"test-secret-that-is-at-least-32-characters-long",
            b"123456",
            server.hashlib.sha256,
        ).hexdigest(),
        "attempts": 0,
        "last_sent_at": datetime.now(timezone.utc),
        "expires_at": datetime.now(timezone.utc) + timedelta(minutes=10),
    }
    monkeypatch.setattr(server, "db", SimpleNamespace(users=users, registration_otps=pending))
    client = TestClient(server.app)

    for _ in range(5):
        response = client.post("/api/auth/register/verify", json={
            "email": "test@example.com",
            "code": "000000",
        })
        assert response.status_code == 400
    blocked = client.post("/api/auth/register/verify", json={
        "email": "test@example.com",
        "code": "000000",
    })

    assert blocked.status_code == 429
    assert pending.documents == {}
    assert users.documents == {}


def test_admin_login_requires_server_configuration(monkeypatch):
    monkeypatch.setenv("JWT_SECRET", "test-secret-that-is-at-least-32-characters-long")
    monkeypatch.delenv("ADMIN_EMAIL", raising=False)
    monkeypatch.delenv("ADMIN_PASSWORD_HASH", raising=False)
    monkeypatch.delenv("SITE_ADMIN_CREDENTIALS_JSON", raising=False)
    response = TestClient(server.app).post(
        "/api/admin/login",
        json={"email": "admin@example.com", "password": "not-a-real-password"},
    )

    assert response.status_code == 503
    assert "ADMIN_EMAIL" in response.json()["detail"]


def test_site_admin_login_is_limited_to_its_configured_site(monkeypatch):
    secret = "test-secret-that-is-at-least-32-characters-long"
    monkeypatch.setenv("JWT_SECRET", secret)
    monkeypatch.setenv("ADMIN_EMAIL", "super@example.com")
    monkeypatch.setenv("ADMIN_PASSWORD_HASH", server.bcrypt.hashpw(b"SuperPassword123", server.bcrypt.gensalt()).decode())
    nunuy_hash = server.bcrypt.hashpw(b"NunuyPassword123", server.bcrypt.gensalt()).decode()
    monkeypatch.setenv("SITE_ADMIN_CREDENTIALS_JSON", server.json.dumps({
        "nunuy": {"email": "nunuy@example.com", "password_hash": nunuy_hash},
    }))
    monkeypatch.setattr(server, "db", SimpleNamespace(platform_settings=FakeEmptySettings()))
    client = TestClient(server.app)

    login = client.post("/api/admin/login", json={"email": "nunuy@example.com", "password": "NunuyPassword123"})
    assert login.status_code == 200
    token = login.json()["access_token"]
    claims = server.jwt.decode(token, secret, algorithms=["HS256"])
    assert claims["scope"] == "nunuy"
    headers = {"Authorization": f"Bearer {token}"}

    assert client.get("/api/admin/seo/nunuy", headers=headers).status_code == 200
    assert client.get("/api/admin/seo/gibrig", headers=headers).status_code == 403
    assert client.get("/api/admin/billing/config", headers=headers).status_code == 403


def midtrans_notification(order_id, status_code, gross_amount, server_key):
    source = f"{order_id}{status_code}{gross_amount}{server_key}"
    return {
        "order_id": order_id,
        "status_code": status_code,
        "gross_amount": gross_amount,
        "signature_key": hashlib.sha512(source.encode()).hexdigest(),
    }


def test_midtrans_webhook_rejects_when_gateway_is_unconfigured(monkeypatch):
    monkeypatch.delenv("MIDTRANS_SERVER_KEY", raising=False)
    response = TestClient(server.app).post("/api/payments/midtrans/webhook", json={})

    assert response.status_code == 503
    assert "Midtrans" in response.json()["detail"]


def test_midtrans_webhook_verifies_transaction_before_activating_invitation(monkeypatch):
    payment = {
        "id": "payment-1",
        "order_id": "UND-TESTORDER123456789",
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
    server_key = "test-midtrans-server-key"
    monkeypatch.setenv("MIDTRANS_SERVER_KEY", server_key)

    async def verified_transaction(method, path, **_kwargs):
        assert method == "GET"
        assert path == f"/v2/{payment['order_id']}/status"
        return {
            "order_id": payment["order_id"],
            "gross_amount": "249000.00",
            "currency": "IDR",
            "transaction_status": "settlement",
            "status_code": "200",
            "transaction_id": "transaction-1",
        }

    monkeypatch.setattr(server, "midtrans_request", verified_transaction)

    client = TestClient(server.app)
    notification = midtrans_notification(payment["order_id"], "200", "249000.00", server_key)
    response = client.post("/api/payments/midtrans/webhook", json=notification)
    assert response.status_code == 200
    assert payment_collection.document["status"] == "paid"
    assert invitation_collection.document["status"] == "active"
    duplicate = client.post("/api/payments/midtrans/webhook", json=notification)
    assert duplicate.status_code == 200
    assert payment_collection.document["status"] == "paid"


def test_midtrans_webhook_rejects_invalid_signature(monkeypatch):
    monkeypatch.setenv("MIDTRANS_SERVER_KEY", "test-midtrans-server-key")
    response = TestClient(server.app).post("/api/payments/midtrans/webhook", json={
        "order_id": "UND-UNKNOWN",
        "status_code": "200",
        "gross_amount": "249000.00",
        "signature_key": "invalid",
    })

    assert response.status_code == 401


def test_payment_activation_copies_the_payment_entitlement_snapshot(monkeypatch):
    entitlements = {
        "bulk_upload_enabled": True,
        "max_recipients": 250,
        "reseller_enabled": True,
        "max_resellers": 12,
        "max_invitations": 5,
    }
    invitations = FakeCollection({"id": "invitation-1", "active_until": None})
    monkeypatch.setattr(server, "db", SimpleNamespace(invitations=invitations))
    asyncio.run(server.activate_invitation({
        "id": "payment-1",
        "invitation_id": "invitation-1",
        "plan_id": "premium",
        "duration_days": 30,
        "package_entitlements": entitlements,
    }))

    assert invitations.document["package_entitlements"] == entitlements
    assert invitations.document["plan_id"] == "premium"
    assert invitations.document["status"] == "active"


def test_draft_payment_uses_package_selected_at_activation(monkeypatch):
    config = copy.deepcopy(server.DEFAULT_BILLING_CONFIG)
    transfer = next(method for method in config["payment_methods"] if method["id"] == "bank-transfer")
    transfer.update(enabled=True, account_number="123456", bank_name="Bank", account_name="Owner")

    class PaymentCollection:
        def __init__(self):
            self.document = None

        async def find_one(self, *_args, **_kwargs):
            return copy.deepcopy(self.document)

        async def count_documents(self, _query):
            return 0

        async def insert_one(self, document):
            self.document = copy.deepcopy(document)

    class InvitationCollection:
        async def count_documents(self, _query):
            return 0

        async def update_one(self, *_args, **_kwargs):
            return None

    payments = PaymentCollection()
    monkeypatch.setattr(server, "db", SimpleNamespace(
        platform_settings=FakeCollection(config),
        payment_orders=payments,
        invitations=InvitationCollection(),
    ))

    asyncio.run(server.create_invitation_payment_locked(
        "invitation-1",
        server.PaymentCreate(payment_method_id="bank-transfer", plan_id="premium"),
        {"id": "owner-1"},
        {"id": "invitation-1", "plan_id": "basic", "status": "draft"},
    ))

    assert payments.document["plan_id"] == "premium"
    assert payments.document["amount"] == 249000
    assert payments.document["duration_days"] == 365


def test_reseller_access_uses_entitlements_on_active_plan_snapshots(monkeypatch):
    owner = {"id": "owner-1", "role": "user"}
    future = (datetime.now(timezone.utc) + timedelta(days=1)).isoformat()
    invitations = FakeInvitationAccessCollection([{
        "id": "invitation-1",
        "owner_id": owner["id"],
        "plan_id": "premium",
        "status": "active",
        "active_until": future,
        "package_entitlements": {"reseller_enabled": True, "max_resellers": 7},
    }])
    monkeypatch.setattr(server, "db", SimpleNamespace(invitations=invitations))
    result = asyncio.run(server.active_reseller_entitlements(owner))

    assert result == [{"reseller_enabled": True, "max_resellers": 7}]


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

    recipients = client.get("/api/invitations/invitation-1/tickets", headers=headers)
    assert recipients.status_code == 200
    assert recipients.json()["tickets"] == [{
        "id": ticket["id"],
        "name": "Alya",
        "phone": "6281234567890",
        "checked_in_at": None,
        "created_at": tickets.documents[0]["created_at"],
    }]

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
    checked_in_recipients = client.get("/api/invitations/invitation-1/tickets", headers=headers)
    assert checked_in_recipients.status_code == 200
    assert checked_in_recipients.json()["tickets"][0]["checked_in_at"] == check_in.json()["entry"]["checked_in_at"]


@pytest.mark.parametrize(
    ("plan_id", "entitlements", "recipient_count", "expected_status", "message"),
    [
        ("basic", {"bulk_upload_enabled": False, "max_recipients": 1}, 2, 403, "upload massal"),
        ("basic", {"bulk_upload_enabled": True, "max_recipients": 10}, 2, 403, "upload massal"),
        ("premium", {"bulk_upload_enabled": True, "max_recipients": 2}, 3, 409, "maksimal 2 penerima"),
    ],
)
def test_ticket_issuance_enforces_plan_bulk_availability_and_recipient_limits(
    monkeypatch, plan_id, entitlements, recipient_count, expected_status, message,
):
    monkeypatch.setenv("JWT_SECRET", "test-secret-that-is-at-least-32-characters-long")
    owner = {"id": "owner-1", "full_name": "Event Owner", "email": "owner@example.com"}
    invitation = {
        "id": "invitation-1",
        "owner_id": "owner-1",
        "plan_id": plan_id,
        "package_entitlements": entitlements,
        "status": "published",
        "active_until": "9999-12-31T23:59:59+00:00",
    }
    monkeypatch.setattr(server, "db", SimpleNamespace(
        users=FakeCollection(owner),
        invitations=FakeCollection(invitation),
        invitation_tickets=FakeTicketCollection(),
    ))
    monkeypatch.setitem(server.app.dependency_overrides, server.get_current_user, lambda: owner)
    recipients = [{"name": f"Tamu {index}", "phone": f"62812345678{index:02d}"} for index in range(recipient_count)]

    response = TestClient(server.app).post(
        "/api/invitations/invitation-1/tickets",
        json={"recipients": recipients},
    )

    assert response.status_code == expected_status
    assert message in response.json()["detail"]


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


def test_midtrans_webhook_does_not_activate_when_transaction_amount_mismatches(monkeypatch):
    payment_collection = FakeCollection({
        "id": "payment-1",
        "order_id": "UND-TEST",
        "invitation_id": "invitation-1",
        "provider": "midtrans",
        "status": "pending",
        "amount": 249000,
        "duration_days": 365,
    })
    invitation_collection = FakeCollection({"id": "invitation-1", "active_until": None})
    monkeypatch.setattr(server, "db", SimpleNamespace(
        payment_orders=payment_collection,
        invitations=invitation_collection,
    ))
    server_key = "test-midtrans-server-key"
    monkeypatch.setenv("MIDTRANS_SERVER_KEY", server_key)

    async def mismatched_transaction(_method, _path, **_kwargs):
        return {
            "order_id": "UND-TEST",
            "gross_amount": "1000.00",
            "currency": "IDR",
            "transaction_status": "settlement",
            "status_code": "200",
        }

    monkeypatch.setattr(server, "midtrans_request", mismatched_transaction)
    notification = midtrans_notification("UND-TEST", "200", "249000.00", server_key)
    response = TestClient(server.app).post(
        "/api/payments/midtrans/webhook",
        json=notification,
    )

    assert response.status_code == 400
    assert payment_collection.document["status"] == "pending"
    assert invitation_collection.document["active_until"] is None


def test_midtrans_snap_creation_sends_transaction_and_stores_token(monkeypatch):
    captured = {}

    async def fake_request(method, path, **kwargs):
        captured.update({"method": method, "path": path, **kwargs})
        return {
            "token": "snap-token",
            "redirect_url": "https://app.sandbox.midtrans.com/snap/v2/vtweb/snap-token",
        }

    monkeypatch.setattr(server, "midtrans_request", fake_request)
    payment = {
        "id": "payment-1",
        "order_id": "UND-TEST",
        "plan_id": "basic",
        "plan_name": "Basic",
        "amount": 99000,
    }
    user = {"full_name": "Test User", "email": "test@example.com"}

    redirect_url = asyncio.run(server.create_midtrans_transaction(payment, user, "+628123456789"))

    assert redirect_url == "https://app.sandbox.midtrans.com/snap/v2/vtweb/snap-token"
    assert captured["method"] == "POST"
    assert captured["path"] == "/snap/v1/transactions"
    assert captured["json"]["transaction_details"] == {"order_id": "UND-TEST", "gross_amount": 99000}
    assert captured["json"]["customer_details"]["first_name"] == "Test"
    assert captured["json"]["customer_details"]["last_name"] == "User"
    assert captured["json"]["customer_details"]["phone"] == "+628123456789"
    assert captured["json"]["item_details"][0]["price"] == 99000
    assert payment["midtrans_token"] == "snap-token"


def test_midtrans_requests_use_configured_environment_and_server_key(monkeypatch):
    FakeHttpClient.calls.clear()
    monkeypatch.setattr(server.httpx, "AsyncClient", FakeHttpClient)
    monkeypatch.setenv("MIDTRANS_SERVER_KEY", "test-midtrans-server-key")
    monkeypatch.setenv("MIDTRANS_IS_SANDBOX", "true")

    result = asyncio.run(server.midtrans_request("GET", "/v2/UND-TEST/status"))

    assert result["transaction_status"] == "pending"
    method, url, kwargs = FakeHttpClient.calls[0]
    assert method == "GET"
    assert url == "https://api.sandbox.midtrans.com/v2/UND-TEST/status"
    assert kwargs["auth"] == ("test-midtrans-server-key", "")
    assert kwargs["headers"]["Accept"] == "application/json"


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


@pytest.mark.parametrize("plan_id", ["basic", "premium", "business"])
def test_invitation_links_are_generated_when_owner_does_not_choose_a_slug(monkeypatch, plan_id):
    invitation_collection = FakeCollection()
    monkeypatch.setattr(server, "db", SimpleNamespace(
        platform_settings=FakeCollection(copy.deepcopy(server.DEFAULT_BILLING_CONFIG)),
        invitations=invitation_collection,
    ))
    monkeypatch.setitem(server.app.dependency_overrides, server.get_current_user, lambda: {
        "id": "owner-1",
        "role": "user",
    })

    response = TestClient(server.app).post("/api/invitations", json={
        "plan_id": plan_id,
        "title": "Hari Bahagia",
        "content": {},
    })

    assert response.status_code == 200
    assert response.json()["slug"].startswith("hari-bahagia-")


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
        server.AffiliateAdUpdate(
            full_name="Affiliate Test",
            email="affiliate@example.com",
            password="password123",
            basic_quota=1,
            ad_url="javascript:alert(1)",
        )
    assert "ad_url" not in server.AffiliateCreate.model_fields
    assert "ad_active" not in server.AffiliateUpdate.model_fields


def test_super_admin_can_review_and_deactivate_affiliate_without_deleting_history(monkeypatch):
    affiliate = {
        "id": "affiliate-1",
        "full_name": "Affiliate Test",
        "email": "affiliate@example.com",
        "role": "affiliate",
        "owner_id": "owner-1",
        "active": True,
        "basic_quota": 2,
        "premium_quota": 1,
        "ad_title": "Promo",
        "ad_url": "https://example.com",
        "ad_active": True,
        "created_at": "2025-01-01T00:00:00+00:00",
    }
    owner = {"id": "owner-1", "full_name": "Pemilik Undangan", "email": "owner@example.com"}
    invitations = [{"affiliate_id": "affiliate-1", "plan_id": "basic"}]
    users = FakeAffiliateAdminUsers([affiliate, owner])
    monkeypatch.setattr(server, "db", SimpleNamespace(
        users=users,
        invitations=FakeAffiliateAdminInvitations(invitations),
    ))
    monkeypatch.setitem(server.app.dependency_overrides, server.require_admin, lambda: {"email": "admin@example.com"})
    client = TestClient(server.app)

    listed = client.get("/api/admin/affiliate-accounts")
    deactivated = client.patch("/api/admin/affiliate-accounts/affiliate-1", json={"active": False})

    assert listed.status_code == 200
    assert listed.json()[0]["owner_email"] == "owner@example.com"
    assert listed.json()[0]["invitation_count"] == 1
    assert deactivated.status_code == 200
    assert users.documents[0]["active"] is False
    assert users.documents[0]["ad_active"] is False
    assert users.documents[0]["owner_id"] == "owner-1"
    assert invitations == [{"affiliate_id": "affiliate-1", "plan_id": "basic"}]


def test_affiliate_ad_and_moderation_routes_require_super_admin():
    client = TestClient(server.app)

    listed = client.get("/api/admin/affiliate-accounts")
    updated = client.patch("/api/admin/affiliate-accounts/affiliate-1", json={"ad_active": True})

    assert listed.status_code == 401
    assert updated.status_code == 401


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
