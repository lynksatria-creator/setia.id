from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone
from decimal import Decimal, InvalidOperation
import hashlib
import hmac
import logging
import os
from pathlib import Path
import re
import uuid
from typing import Literal

import bcrypt
import httpx
import jwt
from dotenv import load_dotenv
from fastapi import APIRouter, Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, ConfigDict, EmailStr, Field, model_validator
from pymongo.errors import DuplicateKeyError


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

mongo_url = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
db_name = os.environ.get("DB_NAME", "undangan_id")
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]


@asynccontextmanager
async def lifespan(_app: FastAPI):
    yield
    client.close()


app = FastAPI(title="Undangan.id API", version="0.1.0", lifespan=lifespan)
api_router = APIRouter(prefix="/api")


class StatusCheck(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class StatusCheckCreate(BaseModel):
    client_name: str


class UserRegistration(BaseModel):
    full_name: str = Field(min_length=2, max_length=80)
    email: EmailStr
    password: str = Field(min_length=8, max_length=72)


class UserLogin(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=72)


class AdminLogin(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=256)


class PlanConfig(BaseModel):
    id: str = Field(pattern=r"^[a-z0-9-]{2,32}$")
    name: str = Field(min_length=2, max_length=60)
    price: int = Field(gt=0, le=100_000_000)
    duration_days: int = Field(gt=0, le=3650)
    max_invitations: int = Field(gt=0, le=1000)
    slug_mode: Literal["generated", "custom"]
    enabled: bool = True
    features: list[str] = Field(default_factory=list, max_length=12)


class PaymentMethodConfig(BaseModel):
    id: str = Field(pattern=r"^[a-z0-9-]{2,32}$")
    name: str = Field(min_length=2, max_length=60)
    provider: Literal["midtrans", "manual"]
    payment_code: Literal["gopay", "qris", "bank_transfer"] | None = None
    enabled: bool = True
    bank_name: str | None = Field(default=None, max_length=60)
    account_name: str | None = Field(default=None, max_length=80)
    account_number: str | None = Field(default=None, max_length=40)
    instructions: str | None = Field(default=None, max_length=500)

    @model_validator(mode="after")
    def require_midtrans_code(self):
        if self.provider == "midtrans" and self.payment_code is None:
            raise ValueError("Metode Midtrans harus memilih payment_code.")
        return self


class BillingConfigUpdate(BaseModel):
    plans: list[PlanConfig] = Field(min_length=1, max_length=10)
    payment_methods: list[PaymentMethodConfig] = Field(min_length=1, max_length=12)


class InvitationCreate(BaseModel):
    plan_id: str
    title: str = Field(min_length=2, max_length=120)
    content: dict
    slug: str | None = Field(default=None, max_length=64)


class InvitationUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=2, max_length=120)
    content: dict | None = None
    slug: str | None = Field(default=None, max_length=64)


class PaymentCreate(BaseModel):
    payment_method_id: str


class PaymentProof(BaseModel):
    transfer_reference: str = Field(min_length=3, max_length=100)


class GuestbookEntryCreate(BaseModel):
    name: str = Field(min_length=2, max_length=80)
    message: str = Field(min_length=2, max_length=500)
    attendance: Literal["attending", "not_attending", "maybe"] = "attending"
    guests: int = Field(default=1, ge=1, le=10)


class GuestbookModeration(BaseModel):
    status: Literal["visible", "hidden"]


class AdminActivationUpdate(BaseModel):
    status: Literal["draft", "active", "published", "expired"]
    active_until: datetime | None = None


class AdminInvitationUpdate(InvitationUpdate):
    plan_id: str | None = None


bearer_scheme = HTTPBearer(auto_error=False)

DEFAULT_BILLING_CONFIG = {
    "plans": [
        {"id": "basic", "name": "Basic", "price": 99000, "duration_days": 30, "max_invitations": 1, "slug_mode": "generated", "enabled": True, "features": ["1 undangan aktif", "Template dasar", "Link undangan otomatis"]},
        {"id": "premium", "name": "Premium", "price": 249000, "duration_days": 365, "max_invitations": 3, "slug_mode": "custom", "enabled": True, "features": ["3 undangan aktif", "Custom link", "RSVP dan buku tamu"]},
        {"id": "business", "name": "Business", "price": 599000, "duration_days": 365, "max_invitations": 100, "slug_mode": "custom", "enabled": True, "features": ["100 undangan aktif", "Custom link", "Statistik lengkap"]},
    ],
    "payment_methods": [
        {"id": "gopay-qris", "name": "GoPay / QRIS", "provider": "midtrans", "payment_code": "gopay", "enabled": True},
        {"id": "bank-transfer", "name": "Transfer bank", "provider": "manual", "enabled": False, "bank_name": "", "account_name": "", "account_number": "", "instructions": "Pembayaran diverifikasi oleh admin."},
    ],
}


def get_jwt_secret():
    secret = os.environ.get("JWT_SECRET", "")
    if len(secret) < 32:
        raise HTTPException(status_code=503, detail="JWT_SECRET belum dikonfigurasi.")
    return secret


def create_access_token(user_id: str, role: str = "user"):
    expires_at = datetime.now(timezone.utc) + timedelta(hours=12)
    return jwt.encode({"sub": user_id, "role": role, "exp": expires_at}, get_jwt_secret(), algorithm="HS256")


async def get_billing_config():
    saved = await db.platform_settings.find_one({"key": "billing"}, {"_id": 0, "key": 0})
    if saved:
        for plan in saved.get("plans", []):
            default_plan = next((item for item in DEFAULT_BILLING_CONFIG["plans"] if item["id"] == plan["id"]), None)
            plan.setdefault("max_invitations", default_plan["max_invitations"] if default_plan else 1)
        return saved
    await db.platform_settings.update_one(
        {"key": "billing"},
        {"$setOnInsert": {**DEFAULT_BILLING_CONFIG, "key": "billing"}},
        upsert=True,
    )
    return DEFAULT_BILLING_CONFIG


async def require_admin(credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme)):
    if credentials is None:
        raise HTTPException(status_code=401, detail="Admin harus login.")
    try:
        payload = jwt.decode(credentials.credentials, get_jwt_secret(), algorithms=["HS256"])
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Sesi admin tidak valid.") from None
    if payload.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Akses admin diperlukan.")
    return {"email": payload["sub"]}


def slugify(value: str):
    slug = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return slug[:64].strip("-")


async def get_owned_invitation(invitation_id: str, owner_id: str):
    invitation = await db.invitations.find_one(
        {"id": invitation_id, "owner_id": owner_id},
        {"_id": 0},
    )
    if invitation is None:
        raise HTTPException(status_code=404, detail="Undangan tidak ditemukan.")
    return invitation


async def activate_invitation(payment):
    now = datetime.now(timezone.utc)
    invitation = await db.invitations.find_one({"id": payment["invitation_id"]}, {"_id": 0, "active_until": 1})
    current_expiry = invitation.get("active_until") if invitation else None
    if current_expiry:
        parsed_expiry = datetime.fromisoformat(current_expiry)
        if parsed_expiry > now:
            now = parsed_expiry
    expires_at = now + timedelta(days=payment["duration_days"])
    await db.invitations.update_one(
        {"id": payment["invitation_id"]},
        {"$set": {
            "status": "active",
            "payment_id": payment["id"],
            "activated_at": now.isoformat(),
            "active_until": expires_at.isoformat(),
            "updated_at": now.isoformat(),
        }},
    )


async def set_payment_status(payment, status: str, provider_status: str | None = None):
    was_paid = payment.get("status") == "paid"
    if was_paid and status != "paid":
        return
    await db.payment_orders.update_one(
        {"id": payment["id"]},
        {"$set": {
            "status": status,
            "provider_status": provider_status,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }},
    )
    if status == "paid" and not was_paid:
        await activate_invitation(payment)


def public_payment(payment):
    return {
        "id": payment["id"],
        "order_id": payment["order_id"],
        "status": payment["status"],
        "amount": payment["amount"],
        "payment_method": payment["payment_method"],
        "redirect_url": payment.get("redirect_url"),
        "manual_details": payment.get("manual_details"),
        "expires_at": payment["expires_at"],
        "transfer_reference": payment.get("transfer_reference"),
    }


async def create_midtrans_snap(payment, user, enabled_payments):
    server_key = os.environ.get("MIDTRANS_SERVER_KEY", "")
    if not server_key:
        raise HTTPException(status_code=503, detail="MIDTRANS_SERVER_KEY belum dikonfigurasi.")

    production = os.environ.get("MIDTRANS_IS_PRODUCTION", "false").lower() == "true"
    host = "https://app.midtrans.com" if production else "https://app.sandbox.midtrans.com"
    app_url = os.environ.get("PUBLIC_APP_URL", "http://localhost:3000").rstrip("/")
    payload = {
        "transaction_details": {
            "order_id": payment["order_id"],
            "gross_amount": payment["amount"],
        },
        "customer_details": {
            "first_name": user["full_name"],
            "email": user["email"],
        },
        "item_details": [{
            "id": payment["plan_id"],
            "price": payment["amount"],
            "quantity": 1,
            "name": payment["plan_name"][:50],
        }],
        "enabled_payments": enabled_payments,
        "callbacks": {"finish": f"{app_url}/undangan-dashboard?payment={payment['id']}"},
    }

    try:
        async with httpx.AsyncClient(timeout=20) as client_http:
            response = await client_http.post(
                f"{host}/snap/v1/transactions",
                json=payload,
                auth=(server_key, ""),
            )
        response.raise_for_status()
    except httpx.HTTPStatusError as error:
        logger.warning("Midtrans rejected order %s with status %s", payment["order_id"], error.response.status_code)
        raise HTTPException(status_code=502, detail="Gateway menolak pembayaran. Periksa konfigurasi merchant.") from None
    except httpx.HTTPError:
        raise HTTPException(status_code=502, detail="Gateway pembayaran tidak dapat dihubungi.") from None

    result = response.json()
    if not result.get("redirect_url"):
        raise HTTPException(status_code=502, detail="Gateway tidak mengembalikan halaman pembayaran.")
    return result["redirect_url"]


def public_user(user):
    return {"id": user["id"], "full_name": user["full_name"], "email": user["email"]}


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme)):
    if credentials is None:
        raise HTTPException(status_code=401, detail="Silakan masuk untuk melanjutkan.")

    try:
        payload = jwt.decode(credentials.credentials, get_jwt_secret(), algorithms=["HS256"])
        user_id = payload["sub"]
    except (jwt.InvalidTokenError, KeyError):
        raise HTTPException(status_code=401, detail="Sesi tidak valid atau sudah kedaluwarsa.") from None

    user = await db.users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})
    if user is None:
        raise HTTPException(status_code=401, detail="Akun tidak ditemukan.")
    return user


@api_router.get("/")
async def root():
    return {"message": "Undangan.id API is running"}


@api_router.post("/admin/login")
async def admin_login(payload: AdminLogin):
    get_jwt_secret()
    admin_email = os.environ.get("ADMIN_EMAIL", "").lower()
    password_hash = os.environ.get("ADMIN_PASSWORD_HASH", "")
    if not admin_email or not password_hash:
        raise HTTPException(status_code=503, detail="ADMIN_EMAIL dan ADMIN_PASSWORD_HASH belum dikonfigurasi.")

    try:
        valid_password = bcrypt.checkpw(payload.password.encode("utf-8"), password_hash.encode("utf-8"))
    except ValueError:
        valid_password = False
    if payload.email.lower() != admin_email or not valid_password:
        raise HTTPException(status_code=401, detail="Email atau kata sandi admin salah.")

    return {
        "access_token": create_access_token(admin_email, role="admin"),
        "token_type": "bearer",
        "user": {"email": admin_email, "role": "admin"},
    }


@api_router.get("/billing/config")
async def get_public_billing_config():
    config = await get_billing_config()
    return {
        "plans": [plan for plan in config["plans"] if plan.get("enabled", True)],
        "payment_methods": [method for method in config["payment_methods"] if method.get("enabled", True)],
    }


@api_router.get("/admin/billing/config")
async def get_admin_billing_config(_admin=Depends(require_admin)):
    config = await get_billing_config()
    return {**config, "gateway_ready": bool(os.environ.get("MIDTRANS_SERVER_KEY"))}


@api_router.put("/admin/billing/config")
async def update_admin_billing_config(payload: BillingConfigUpdate, _admin=Depends(require_admin)):
    config = payload.model_dump()
    plan_ids = [plan["id"] for plan in config["plans"]]
    method_ids = [method["id"] for method in config["payment_methods"]]
    if len(plan_ids) != len(set(plan_ids)) or len(method_ids) != len(set(method_ids)):
        raise HTTPException(status_code=422, detail="ID paket dan metode pembayaran harus unik.")
    await db.platform_settings.update_one(
        {"key": "billing"},
        {"$set": config},
        upsert=True,
    )
    return {**config, "gateway_ready": bool(os.environ.get("MIDTRANS_SERVER_KEY"))}


@api_router.post("/auth/register")
async def register_user(payload: UserRegistration):
    get_jwt_secret()
    email = str(payload.email).lower()
    await db.users.create_index("email", unique=True)
    if await db.users.find_one({"email": email}, {"_id": 1}):
        raise HTTPException(status_code=409, detail="Email sudah terdaftar.")

    user = {
        "id": str(uuid.uuid4()),
        "full_name": payload.full_name.strip(),
        "email": email,
        "password_hash": bcrypt.hashpw(payload.password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8"),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    try:
        await db.users.insert_one(user)
    except DuplicateKeyError:
        raise HTTPException(status_code=409, detail="Email sudah terdaftar.") from None

    return {
        "access_token": create_access_token(user["id"]),
        "token_type": "bearer",
        "user": public_user(user),
    }


@api_router.post("/auth/login")
async def login_user(payload: UserLogin):
    get_jwt_secret()
    email = str(payload.email).lower()
    user = await db.users.find_one({"email": email})
    if user is None or not bcrypt.checkpw(payload.password.encode("utf-8"), user["password_hash"].encode("utf-8")):
        raise HTTPException(status_code=401, detail="Email atau kata sandi salah.")

    return {
        "access_token": create_access_token(user["id"]),
        "token_type": "bearer",
        "user": public_user(user),
    }


@api_router.get("/auth/me")
async def get_account(current_user: dict = Depends(get_current_user)):
    return {"user": public_user(current_user)}


@api_router.post("/invitations")
async def create_invitation(payload: InvitationCreate, current_user=Depends(get_current_user)):
    config = await get_billing_config()
    plan = next((item for item in config["plans"] if item["id"] == payload.plan_id and item.get("enabled", True)), None)
    if plan is None:
        raise HTTPException(status_code=422, detail="Paket tidak tersedia.")

    if plan["slug_mode"] == "custom" and not payload.slug:
        raise HTTPException(status_code=422, detail="Paket ini memerlukan link undangan pilihan Anda.")
    if plan["slug_mode"] == "generated" and payload.slug:
        raise HTTPException(status_code=403, detail="Paket ini menggunakan link otomatis.")

    slug = slugify(payload.slug or f"{payload.title}-{uuid.uuid4().hex[:7]}")
    if len(slug) < 3:
        raise HTTPException(status_code=422, detail="Link undangan minimal 3 karakter.")
    await db.invitations.create_index("slug", unique=True)
    now = datetime.now(timezone.utc).isoformat()
    invitation = {
        "id": str(uuid.uuid4()),
        "owner_id": current_user["id"],
        "plan_id": plan["id"],
        "title": payload.title.strip(),
        "slug": slug,
        "content": payload.content,
        "status": "draft",
        "payment_id": None,
        "created_at": now,
        "updated_at": now,
    }
    try:
        await db.invitations.insert_one(invitation)
    except DuplicateKeyError:
        raise HTTPException(status_code=409, detail="Link tersebut sudah digunakan.") from None
    invitation.pop("_id", None)
    return invitation


@api_router.get("/invitations")
async def list_my_invitations(current_user=Depends(get_current_user)):
    return await db.invitations.find({"owner_id": current_user["id"]}, {"_id": 0}).to_list(length=200)


@api_router.get("/invitations/{invitation_id}")
async def get_my_invitation(invitation_id: str, current_user=Depends(get_current_user)):
    return await get_owned_invitation(invitation_id, current_user["id"])


@api_router.patch("/invitations/{invitation_id}")
async def update_my_invitation(invitation_id: str, payload: InvitationUpdate, current_user=Depends(get_current_user)):
    invitation = await get_owned_invitation(invitation_id, current_user["id"])
    updates = payload.model_dump(exclude_unset=True)
    plan_config = await get_billing_config()
    plan = next(item for item in plan_config["plans"] if item["id"] == invitation["plan_id"])

    if "slug" in updates:
        if plan["slug_mode"] != "custom":
            raise HTTPException(status_code=403, detail="Perubahan link tidak tersedia pada paket ini.")
        updates["slug"] = slugify(updates["slug"] or "")
        if len(updates["slug"]) < 3:
            raise HTTPException(status_code=422, detail="Link undangan minimal 3 karakter.")

    updates = {key: value for key, value in updates.items() if value is not None}
    if updates:
        updates["updated_at"] = datetime.now(timezone.utc).isoformat()
        try:
            await db.invitations.update_one({"id": invitation_id}, {"$set": updates})
        except DuplicateKeyError:
            raise HTTPException(status_code=409, detail="Link tersebut sudah digunakan.") from None
    return await get_owned_invitation(invitation_id, current_user["id"])


@api_router.post("/invitations/{invitation_id}/publish")
async def publish_invitation(invitation_id: str, current_user=Depends(get_current_user)):
    invitation = await get_owned_invitation(invitation_id, current_user["id"])
    if invitation.get("status") not in {"active", "published"} or not invitation.get("active_until"):
        raise HTTPException(status_code=402, detail="Selesaikan pembayaran sebelum publish.")
    expires_at = datetime.fromisoformat(invitation["active_until"])
    if expires_at <= datetime.now(timezone.utc):
        await db.invitations.update_one({"id": invitation_id}, {"$set": {"status": "expired"}})
        raise HTTPException(status_code=402, detail="Masa aktif paket berakhir. Perpanjang paket untuk publish.")

    await db.invitations.update_one(
        {"id": invitation_id},
        {"$set": {"status": "published", "published_at": datetime.now(timezone.utc).isoformat()}},
    )
    return {"status": "published", "url": f"/i/{invitation['slug']}", "active_until": invitation["active_until"]}


@api_router.get("/public/invitations/{slug}")
async def get_public_invitation(slug: str):
    invitation = await db.invitations.find_one({"slug": slug, "status": "published"}, {"_id": 0})
    if invitation is None:
        raise HTTPException(status_code=404, detail="Undangan tidak tersedia.")
    if datetime.fromisoformat(invitation["active_until"]) <= datetime.now(timezone.utc):
        await db.invitations.update_one({"id": invitation["id"]}, {"$set": {"status": "expired"}})
        raise HTTPException(status_code=410, detail="Masa aktif undangan sudah berakhir.")
    return {"title": invitation["title"], "slug": invitation["slug"], "content": invitation["content"]}


async def get_published_invitation(slug: str):
    invitation = await db.invitations.find_one({"slug": slug, "status": "published"}, {"_id": 0})
    if invitation is None:
        raise HTTPException(status_code=404, detail="Undangan tidak tersedia.")
    if datetime.fromisoformat(invitation["active_until"]) <= datetime.now(timezone.utc):
        raise HTTPException(status_code=410, detail="Masa aktif undangan sudah berakhir.")
    return invitation


def public_guestbook_entry(entry):
    return {
        "id": entry["id"],
        "name": entry["name"],
        "message": entry["message"],
        "attendance": entry["attendance"],
        "guests": entry["guests"],
        "created_at": entry["created_at"],
    }


@api_router.get("/public/invitations/{slug}/guestbook")
async def list_public_guestbook(slug: str):
    invitation = await get_published_invitation(slug)
    entries = await db.guestbook_entries.find(
        {"invitation_id": invitation["id"], "status": "visible"},
        {"_id": 0},
    ).sort("created_at", -1).to_list(length=200)
    return [public_guestbook_entry(entry) for entry in entries]


@api_router.post("/public/invitations/{slug}/guestbook")
async def create_public_guestbook(slug: str, payload: GuestbookEntryCreate):
    invitation = await get_published_invitation(slug)
    entry = {
        "id": str(uuid.uuid4()),
        "invitation_id": invitation["id"],
        "owner_id": invitation["owner_id"],
        **payload.model_dump(),
        "status": "visible",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.guestbook_entries.insert_one(entry)
    return public_guestbook_entry(entry)


@api_router.get("/invitations/{invitation_id}/guestbook")
async def list_my_guestbook(invitation_id: str, current_user=Depends(get_current_user)):
    await get_owned_invitation(invitation_id, current_user["id"])
    return await db.guestbook_entries.find(
        {"invitation_id": invitation_id},
        {"_id": 0},
    ).sort("created_at", -1).to_list(length=500)


@api_router.patch("/invitations/{invitation_id}/guestbook/{entry_id}")
async def moderate_guestbook(invitation_id: str, entry_id: str, payload: GuestbookModeration, current_user=Depends(get_current_user)):
    await get_owned_invitation(invitation_id, current_user["id"])
    result = await db.guestbook_entries.update_one(
        {"id": entry_id, "invitation_id": invitation_id},
        {"$set": {"status": payload.status}},
    )
    if not result.matched_count:
        raise HTTPException(status_code=404, detail="Kiriman tamu tidak ditemukan.")
    return {"status": payload.status}


@api_router.delete("/invitations/{invitation_id}/guestbook/{entry_id}")
async def delete_guestbook(invitation_id: str, entry_id: str, current_user=Depends(get_current_user)):
    await get_owned_invitation(invitation_id, current_user["id"])
    result = await db.guestbook_entries.delete_one({"id": entry_id, "invitation_id": invitation_id})
    if not result.deleted_count:
        raise HTTPException(status_code=404, detail="Kiriman tamu tidak ditemukan.")
    return {"status": "deleted"}


@api_router.post("/invitations/{invitation_id}/payments")
async def create_invitation_payment(invitation_id: str, payload: PaymentCreate, current_user=Depends(get_current_user)):
    invitation = await get_owned_invitation(invitation_id, current_user["id"])
    config = await get_billing_config()
    plan = next((item for item in config["plans"] if item["id"] == invitation["plan_id"] and item.get("enabled", True)), None)
    method = next((item for item in config["payment_methods"] if item["id"] == payload.payment_method_id and item.get("enabled", True)), None)
    if plan is None or method is None:
        raise HTTPException(status_code=422, detail="Paket atau metode pembayaran tidak tersedia.")
    if method["provider"] == "manual" and not method.get("account_number"):
        raise HTTPException(status_code=503, detail="Detail metode transfer belum diatur oleh admin.")

    now = datetime.now(timezone.utc)
    existing_payment = await db.payment_orders.find_one({
        "owner_id": current_user["id"],
        "invitation_id": invitation_id,
        "status": "pending",
        "expires_at": {"$gt": now.isoformat()},
    }, {"_id": 0})
    if existing_payment:
        if existing_payment["payment_method"] == method["name"]:
            return public_payment(existing_payment)
        raise HTTPException(status_code=409, detail="Selesaikan atau tunggu kedaluwarsa pembayaran yang sedang berlangsung.")

    current_expiry = invitation.get("active_until")
    currently_active = invitation.get("status") in {"active", "published"} and current_expiry and datetime.fromisoformat(current_expiry) > now
    if not currently_active:
        active_count = await db.invitations.count_documents({
            "owner_id": current_user["id"],
            "plan_id": plan["id"],
            "status": {"$in": ["active", "published"]},
            "active_until": {"$gt": now.isoformat()},
            "id": {"$ne": invitation_id},
        })
        pending_count = await db.payment_orders.count_documents({
            "owner_id": current_user["id"],
            "plan_id": plan["id"],
            "status": "pending",
            "expires_at": {"$gt": now.isoformat()},
            "invitation_id": {"$ne": invitation_id},
        })
        if active_count + pending_count >= plan.get("max_invitations", 1):
            raise HTTPException(status_code=409, detail="Kuota undangan aktif paket ini sudah terpakai.")

    payment = {
        "id": str(uuid.uuid4()),
        "order_id": f"UND-{uuid.uuid4().hex[:20].upper()}",
        "owner_id": current_user["id"],
        "invitation_id": invitation_id,
        "plan_id": plan["id"],
        "plan_name": plan["name"],
        "duration_days": plan["duration_days"],
        "amount": plan["price"],
        "payment_method": method["name"],
        "provider": method["provider"],
        "status": "pending",
        "created_at": now.isoformat(),
        "expires_at": (now + timedelta(hours=24)).isoformat(),
    }

    if method["provider"] == "manual":
        payment["manual_details"] = {
            "bank_name": method.get("bank_name"),
            "account_name": method.get("account_name"),
            "account_number": method.get("account_number"),
            "instructions": method.get("instructions"),
        }
    else:
        redirect_url = await create_midtrans_snap(payment, current_user, [method["payment_code"]])
        payment["redirect_url"] = redirect_url
    await db.payment_orders.insert_one(payment)
    await db.invitations.update_one(
        {"id": invitation_id},
        {"$set": {"pending_payment_id": payment["id"], "updated_at": now.isoformat()}},
    )
    return public_payment(payment)


@api_router.get("/payments/{payment_id}")
async def get_payment(payment_id: str, current_user=Depends(get_current_user)):
    payment = await db.payment_orders.find_one({"id": payment_id, "owner_id": current_user["id"]}, {"_id": 0})
    if payment is None:
        raise HTTPException(status_code=404, detail="Pembayaran tidak ditemukan.")
    return public_payment(payment)


@api_router.post("/payments/{payment_id}/proof")
async def submit_transfer_reference(payment_id: str, payload: PaymentProof, current_user=Depends(get_current_user)):
    payment = await db.payment_orders.find_one(
        {"id": payment_id, "owner_id": current_user["id"], "provider": "manual", "status": "pending"},
        {"_id": 0},
    )
    if payment is None:
        raise HTTPException(status_code=404, detail="Pembayaran manual yang menunggu verifikasi tidak ditemukan.")
    if datetime.fromisoformat(payment["expires_at"]) <= datetime.now(timezone.utc):
        await set_payment_status(payment, "failed", "expired")
        raise HTTPException(status_code=409, detail="Batas waktu transfer telah berakhir. Buat order pembayaran baru.")
    await db.payment_orders.update_one(
        {"id": payment_id},
        {"$set": {"transfer_reference": payload.transfer_reference.strip(), "updated_at": datetime.now(timezone.utc).isoformat()}},
    )
    return {"status": "pending", "message": "Referensi transfer terkirim untuk diverifikasi admin."}


@api_router.post("/payments/midtrans/notification")
async def midtrans_notification(payload: dict):
    server_key = os.environ.get("MIDTRANS_SERVER_KEY", "")
    if not server_key:
        raise HTTPException(status_code=503, detail="Gateway pembayaran belum dikonfigurasi.")
    try:
        order_id = payload["order_id"]
        status_code = payload["status_code"]
        gross_amount = payload["gross_amount"]
        supplied_signature = payload["signature_key"]
        amount_matches = Decimal(gross_amount) > 0
    except (KeyError, InvalidOperation, TypeError):
        raise HTTPException(status_code=400, detail="Notifikasi pembayaran tidak lengkap.") from None

    expected_signature = hashlib.sha512(f"{order_id}{status_code}{gross_amount}{server_key}".encode("utf-8")).hexdigest()
    if not hmac.compare_digest(expected_signature, str(supplied_signature)):
        raise HTTPException(status_code=401, detail="Signature pembayaran tidak valid.")

    payment = await db.payment_orders.find_one({"order_id": order_id, "provider": "midtrans"}, {"_id": 0})
    if payment is None:
        raise HTTPException(status_code=404, detail="Order pembayaran tidak ditemukan.")
    try:
        amount_matches = amount_matches and Decimal(gross_amount) == Decimal(payment["amount"])
    except (InvalidOperation, TypeError):
        amount_matches = False
    if not amount_matches:
        raise HTTPException(status_code=400, detail="Nominal notifikasi tidak sesuai order.")

    provider_status = payload.get("transaction_status", "pending")
    fraud_status = payload.get("fraud_status")
    if provider_status == "settlement" or (provider_status == "capture" and fraud_status in {None, "accept"}):
        status = "paid"
    elif provider_status in {"deny", "cancel", "expire"}:
        status = "failed"
    else:
        status = "pending"
    await set_payment_status(payment, status, provider_status)
    return {"status": "ok"}


@api_router.get("/admin/invitations")
async def list_all_invitations(_admin=Depends(require_admin)):
    return await db.invitations.find({}, {"_id": 0}).sort("created_at", -1).to_list(length=1000)


@api_router.patch("/admin/invitations/{invitation_id}")
async def admin_update_invitation(invitation_id: str, payload: AdminInvitationUpdate, _admin=Depends(require_admin)):
    invitation = await db.invitations.find_one({"id": invitation_id}, {"_id": 0})
    if invitation is None:
        raise HTTPException(status_code=404, detail="Undangan tidak ditemukan.")
    updates = payload.model_dump(exclude_unset=True)
    if "slug" in updates:
        updates["slug"] = slugify(updates["slug"] or "")
        if len(updates["slug"]) < 3:
            raise HTTPException(status_code=422, detail="Link undangan minimal 3 karakter.")
    updates = {key: value for key, value in updates.items() if value is not None}
    if updates:
        updates["updated_at"] = datetime.now(timezone.utc).isoformat()
        try:
            await db.invitations.update_one({"id": invitation_id}, {"$set": updates})
        except DuplicateKeyError:
            raise HTTPException(status_code=409, detail="Link tersebut sudah digunakan.") from None
    return await db.invitations.find_one({"id": invitation_id}, {"_id": 0})


@api_router.patch("/admin/invitations/{invitation_id}/activation")
async def admin_update_activation(invitation_id: str, payload: AdminActivationUpdate, _admin=Depends(require_admin)):
    invitation = await db.invitations.find_one({"id": invitation_id}, {"_id": 0})
    if invitation is None:
        raise HTTPException(status_code=404, detail="Undangan tidak ditemukan.")
    active_until = payload.active_until
    if payload.status in {"active", "published"} and (active_until is None or active_until <= datetime.now(timezone.utc)):
        raise HTTPException(status_code=422, detail="Tanggal masa aktif harus berada di masa depan.")
    updates = {"status": payload.status, "updated_at": datetime.now(timezone.utc).isoformat()}
    if active_until is not None:
        updates["active_until"] = active_until.astimezone(timezone.utc).isoformat()
    await db.invitations.update_one({"id": invitation_id}, {"$set": updates})
    return await db.invitations.find_one({"id": invitation_id}, {"_id": 0})


@api_router.get("/admin/payments")
async def list_admin_payments(_admin=Depends(require_admin)):
    payments = await db.payment_orders.find({}, {"_id": 0}).sort("created_at", -1).to_list(length=1000)
    return [public_payment(payment) | {
        "owner_id": payment["owner_id"],
        "invitation_id": payment["invitation_id"],
        "order_id": payment["order_id"],
        "provider": payment["provider"],
        "transfer_reference": payment.get("transfer_reference"),
    } for payment in payments]


@api_router.post("/admin/payments/{payment_id}/approve")
async def approve_manual_payment(payment_id: str, _admin=Depends(require_admin)):
    payment = await db.payment_orders.find_one({"id": payment_id, "provider": "manual"}, {"_id": 0})
    if payment is None or payment.get("status") != "pending":
        raise HTTPException(status_code=404, detail="Pembayaran manual pending tidak ditemukan.")
    if datetime.fromisoformat(payment["expires_at"]) <= datetime.now(timezone.utc):
        await set_payment_status(payment, "failed", "expired")
        raise HTTPException(status_code=409, detail="Pembayaran sudah kedaluwarsa dan tidak dapat disetujui.")
    if not payment.get("transfer_reference"):
        raise HTTPException(status_code=422, detail="Minta referensi transfer sebelum menyetujui pembayaran.")
    await set_payment_status(payment, "paid", "admin_approved")
    return {"status": "paid"}


@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(payload: StatusCheckCreate):
    status = StatusCheck(**payload.model_dump())
    document = status.model_dump()
    document["timestamp"] = document["timestamp"].isoformat()
    await db.status_checks.insert_one(document)
    return status


@api_router.get("/status", response_model=list[StatusCheck])
async def get_status_checks():
    checks = await db.status_checks.find({}, {"_id": 0}).to_list(length=1000)
    for check in checks:
        if isinstance(check["timestamp"], str):
            check["timestamp"] = datetime.fromisoformat(check["timestamp"])
    return checks


app.include_router(api_router)

allowed_origins = [
    origin.strip()
    for origin in os.environ.get("CORS_ORIGINS", "http://localhost:3000").split(",")
    if origin.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=allowed_origins,
    allow_origin_regex=os.environ.get("CORS_ORIGIN_REGEX") or None,
    allow_methods=["GET", "POST", "PATCH", "PUT"],
    allow_headers=["Authorization", "Content-Type"],
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)
