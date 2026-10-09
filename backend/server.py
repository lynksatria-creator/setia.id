from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone
from decimal import Decimal, InvalidOperation
import logging
import os
from pathlib import Path
import re
import secrets
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
from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator, model_validator
from pymongo.errors import DuplicateKeyError
from urllib.parse import urlparse


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
    provider: Literal["mayar", "manual"]
    enabled: bool = True
    bank_name: str | None = Field(default=None, max_length=60)
    account_name: str | None = Field(default=None, max_length=80)
    account_number: str | None = Field(default=None, max_length=40)
    instructions: str | None = Field(default=None, max_length=500)

class AffiliateCombination(BaseModel):
    id: str = Field(pattern=r"^[a-z0-9-]{2,40}$")
    name: str = Field(min_length=2, max_length=80)
    basic: int = Field(default=0, ge=0, le=1000)
    premium: int = Field(default=0, ge=0, le=1000)

    @model_validator(mode="after")
    def require_positive_quota(self):
        if self.basic + self.premium < 1:
            raise ValueError("Kombinasi affiliate harus memiliki minimal satu kuota.")
        return self

class BillingConfigUpdate(BaseModel):
    plans: list[PlanConfig] = Field(min_length=1, max_length=10)
    payment_methods: list[PaymentMethodConfig] = Field(min_length=1, max_length=12)
    dashboard_admin_limit: int = Field(default=3, ge=0, le=3)
    affiliate_combinations: list[AffiliateCombination] = Field(default_factory=list, max_length=20)

    @model_validator(mode="after")
    def validate_affiliate_combinations(self):
        ids = [item.id for item in self.affiliate_combinations]
        if len(ids) != len(set(ids)):
            raise ValueError("ID kombinasi affiliate harus unik.")
        return self


class DashboardAdminCreate(BaseModel):
    full_name: str = Field(min_length=2, max_length=80)
    email: EmailStr
    password: str = Field(min_length=8, max_length=72)


class AffiliateCreate(DashboardAdminCreate):
    basic_quota: int = Field(default=0, ge=0, le=1000)
    premium_quota: int = Field(default=0, ge=0, le=1000)
    ad_title: str = Field(default="", max_length=100)
    ad_description: str = Field(default="", max_length=300)
    ad_url: str = Field(default="", max_length=500)
    ad_image: str = Field(default="", max_length=1000)

    @model_validator(mode="after")
    def require_affiliate_quota(self):
        if self.basic_quota + self.premium_quota < 1:
            raise ValueError("Affiliate harus mendapat minimal satu kuota Basic atau Premium.")
        return self

    @field_validator("ad_url", "ad_image")
    @classmethod
    def validate_ad_urls(cls, value):
        if value and (urlparse(value).scheme not in {"http", "https"} or not urlparse(value).netloc):
            raise ValueError("URL iklan harus memakai HTTP atau HTTPS.")
        return value


class AffiliateProgramUpdate(BaseModel):
    combination_id: str = Field(pattern=r"^[a-z0-9-]{2,40}$")


class DemoAccountCreate(DashboardAdminCreate):
    plan_id: str = Field(pattern=r"^[a-z0-9-]{2,32}$")
    combination_id: str | None = Field(default=None, pattern=r"^[a-z0-9-]{2,40}$")
    duration_days: int = Field(default=0, ge=0, le=3650)
    duration_hours: int = Field(default=24, ge=0, le=23)

    @model_validator(mode="after")
    def require_positive_duration(self):
        if self.duration_days == 0 and self.duration_hours == 0:
            raise ValueError("Masa demo harus lebih dari nol.")
        return self


class AffiliateUpdate(BaseModel):
    active: bool | None = None
    basic_quota: int | None = Field(default=None, ge=0, le=1000)
    premium_quota: int | None = Field(default=None, ge=0, le=1000)
    ad_title: str | None = Field(default=None, max_length=100)
    ad_description: str | None = Field(default=None, max_length=300)
    ad_url: str | None = Field(default=None, max_length=500)
    ad_image: str | None = Field(default=None, max_length=1000)
    ad_active: bool | None = None

    @field_validator("ad_url", "ad_image")
    @classmethod
    def validate_ad_urls(cls, value):
        if value and (urlparse(value).scheme not in {"http", "https"} or not urlparse(value).netloc):
            raise ValueError("URL iklan harus memakai HTTP atau HTTPS.")
        return value


class OwnerAdCreate(BaseModel):
    title: str = Field(min_length=3, max_length=100)
    description: str = Field(min_length=3, max_length=300)
    url: str = Field(min_length=8, max_length=500)
    image: str = Field(default="", max_length=1000)
    active: bool = True

    @field_validator("url", "image")
    @classmethod
    def validate_ad_urls(cls, value):
        if value and (urlparse(value).scheme not in {"http", "https"} or not urlparse(value).netloc):
            raise ValueError("URL iklan harus memakai HTTP atau HTTPS.")
        return value


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
    mobile: str | None = Field(default=None, min_length=8, max_length=24)


class PaymentProof(BaseModel):
    transfer_reference: str = Field(min_length=3, max_length=100)


class GuestbookEntryCreate(BaseModel):
    name: str = Field(min_length=2, max_length=80)
    message: str = Field(min_length=2, max_length=500)
    attendance: Literal["attending", "not_attending", "maybe"] = "attending"
    guests: int = Field(default=1, ge=1, le=10)


class GuestbookModeration(BaseModel):
    status: Literal["visible", "hidden"]


class InvitationTicketRecipient(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    phone: str = Field(pattern=r"^[0-9]{8,15}$")

    @field_validator("name")
    @classmethod
    def normalize_name(cls, value: str):
        name = value.strip()
        if len(name) < 2:
            raise ValueError("Nama penerima minimal 2 karakter.")
        return name


class InvitationTicketBatch(BaseModel):
    recipients: list[InvitationTicketRecipient] = Field(min_length=1, max_length=1000)


class InvitationTicketCheckIn(BaseModel):
    ticket_token: str = Field(min_length=32, max_length=64)


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
        {"id": "mayar", "name": "Mayar checkout", "provider": "mayar", "enabled": True},
        {"id": "bank-transfer", "name": "Transfer bank", "provider": "manual", "enabled": False, "bank_name": "", "account_name": "", "account_number": "", "instructions": "Pembayaran diverifikasi oleh admin."},
    ],
    "dashboard_admin_limit": 3,
    "affiliate_combinations": [
        {"id": "basic-5-premium-1", "name": "5 Basic + 1 Premium", "basic": 5, "premium": 1},
        {"id": "basic-1-premium-2", "name": "1 Basic + 2 Premium", "basic": 1, "premium": 2},
        {"id": "premium-3", "name": "3 Premium", "basic": 0, "premium": 3},
        {"id": "basic-8", "name": "8 Basic", "basic": 8, "premium": 0},
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
        for method in saved.get("payment_methods", []):
            if method.get("provider") == "midtrans":
                if method.get("id") == "bank-transfer" or any(
                    method.get(field) for field in ("bank_name", "account_name", "account_number")
                ):
                    method["provider"] = "manual"
                else:
                    method["provider"] = "mayar"
                    if method.get("name") in {"GoPay", "QRIS", "GoPay / QRIS"}:
                        method["name"] = "Mayar checkout"
                method.pop("payment_code", None)
        saved.setdefault("dashboard_admin_limit", DEFAULT_BILLING_CONFIG["dashboard_admin_limit"])
        saved.setdefault("affiliate_combinations", DEFAULT_BILLING_CONFIG["affiliate_combinations"])
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


async def require_dashboard_owner(user: dict):
    if user.get("role") in {"dashboard_admin", "affiliate"}:
        raise HTTPException(status_code=403, detail="Fitur ini hanya tersedia untuk pemilik akun.")
    return user


async def get_dashboard_invitation(invitation_id: str, user: dict):
    if user.get("role") == "dashboard_admin":
        if not user.get("active", True):
            raise HTTPException(status_code=403, detail="Akses admin dashboard sudah dinonaktifkan.")
        invitation = await db.invitations.find_one(
            {"id": invitation_id, "owner_id": user.get("owner_id")},
            {"_id": 0},
        )
        if invitation is None or invitation.get("status") not in {"active", "published"}:
            raise HTTPException(status_code=404, detail="Undangan tidak ditemukan.")
        return invitation
    if user.get("role") == "affiliate":
        if not user.get("active", True):
            raise HTTPException(status_code=403, detail="Akses affiliate sudah dinonaktifkan.")
        invitation = await db.invitations.find_one(
            {"id": invitation_id, "affiliate_id": user["id"]},
            {"_id": 0},
        )
        if invitation is None or invitation.get("status") not in {"active", "published"}:
            raise HTTPException(status_code=404, detail="Undangan tidak ditemukan.")
        return invitation
    return await get_owned_invitation(invitation_id, user["id"])


async def require_business_owner(user: dict):
    await require_dashboard_owner(user)
    now = datetime.now(timezone.utc).isoformat()
    if user.get("is_demo") and user.get("demo_plan_id") == "business" and user.get("demo_until", "") > now:
        return True
    invitation = await db.invitations.find_one({
        "owner_id": user["id"],
        "plan_id": "business",
        "status": {"$in": ["active", "published"]},
        "active_until": {"$gt": now},
    }, {"_id": 0, "id": 1})
    return invitation is not None


async def has_active_invitation_package(owner_id: str):
    invitations = await db.invitations.find({
        "owner_id": owner_id,
        "status": {"$in": ["active", "published"]},
    }, {"_id": 0, "active_until": 1}).to_list(length=500)
    now = datetime.now(timezone.utc)
    for invitation in invitations:
        try:
            value = invitation["active_until"]
            active_until = value if isinstance(value, datetime) else datetime.fromisoformat(value.replace("Z", "+00:00"))
        except (AttributeError, KeyError, TypeError, ValueError):
            continue
        if active_until.tzinfo is None:
            active_until = active_until.replace(tzinfo=timezone.utc)
        if active_until > now:
            return True
    return False


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


def mayar_api_base_url():
    return "https://api.mayar.io/hl/v2" if os.environ.get("MAYAR_IS_SANDBOX", "false").lower() == "true" else "https://api.mayar.id/hl/v2"


async def mayar_request(method, path, **kwargs):
    api_key = os.environ.get("MAYAR_API_KEY", "")
    if not api_key:
        raise HTTPException(status_code=503, detail="MAYAR_API_KEY belum dikonfigurasi.")
    try:
        async with httpx.AsyncClient(timeout=20) as client_http:
            response = await client_http.request(
                method,
                f"{mayar_api_base_url()}{path}",
                headers={"Authorization": api_key},
                **kwargs,
            )
        response.raise_for_status()
    except httpx.HTTPStatusError as error:
        logger.warning("Mayar API rejected request with status %s", error.response.status_code)
        raise HTTPException(status_code=502, detail="Mayar menolak permintaan pembayaran. Periksa konfigurasi API Key.") from None
    except httpx.HTTPError:
        raise HTTPException(status_code=502, detail="API Mayar tidak dapat dihubungi.") from None
    try:
        result = response.json()
    except ValueError:
        raise HTTPException(status_code=502, detail="Mayar mengirim respons yang tidak valid.") from None
    if not isinstance(result, dict) or not isinstance(result.get("data"), dict):
        raise HTTPException(status_code=502, detail="Mayar mengirim format respons yang tidak dikenal.")
    if result.get("statusCode") not in {None, 200}:
        logger.warning("Mayar API returned status %s", result["statusCode"])
        raise HTTPException(status_code=502, detail="Mayar tidak berhasil memproses permintaan.")
    return result["data"]


async def create_mayar_invoice(payment, user, mobile):
    now = datetime.now(timezone.utc)
    invoice = await mayar_request(
        "POST",
        "/invoices/create",
        json={
            "name": user["full_name"],
            "email": user["email"],
            "mobile": mobile,
            "description": f"Undangan.id {payment['plan_name']} · {payment['order_id']}",
            "expiredAt": (now + timedelta(hours=24)).isoformat(timespec="milliseconds").replace("+00:00", "Z"),
            "items": [{
                "quantity": 1,
                "rate": payment["amount"],
                "description": f"Paket {payment['plan_name']} - Undangan.id",
            }],
            "extraData": {
                "noCustomer": payment["id"],
                "idProd": payment["plan_id"],
            },
        },
    )
    invoice_id = invoice.get("id")
    redirect_url = invoice.get("link") or invoice.get("paymentUrl")
    if not isinstance(invoice_id, str) or not isinstance(redirect_url, str) or not redirect_url.startswith("https://"):
        raise HTTPException(status_code=502, detail="Mayar tidak mengembalikan ID invoice dan tautan pembayaran yang valid.")
    payment["mayar_invoice_id"] = invoice_id
    if isinstance(invoice.get("transactionId"), str):
        payment["mayar_transaction_id"] = invoice["transactionId"]
    return redirect_url


def public_user(user):
    result = {
        "id": user["id"],
        "full_name": user["full_name"],
        "email": user["email"],
        "role": user.get("role", "user"),
        "active": user.get("active", True),
        "owner_id": user.get("owner_id"),
    }
    if user.get("is_test_account") is True:
        result["is_test_account"] = True
        result["test_access_until"] = user.get("test_access_until")
    if user.get("is_demo"):
        result["is_demo"] = True
        result["demo_until"] = user.get("demo_until")
        result["demo_plan_id"] = user.get("demo_plan_id")
    if user.get("role") == "affiliate":
        result["basic_quota"] = user.get("basic_quota", 0)
        result["premium_quota"] = user.get("premium_quota", 0)
    return result


def test_account_access_expired(user: dict):
    if user.get("is_test_account") is not True:
        return False
    expires_at = user.get("test_access_until")
    if not expires_at:
        return True
    try:
        parsed_expiry = datetime.fromisoformat(expires_at)
    except ValueError:
        return True
    if parsed_expiry.tzinfo is None:
        parsed_expiry = parsed_expiry.replace(tzinfo=timezone.utc)
    return parsed_expiry <= datetime.now(timezone.utc)


async def demo_account_expired(user: dict):
    account = user
    if user.get("role") in {"dashboard_admin", "affiliate"} and user.get("owner_id"):
        owner = await db.users.find_one({"id": user["owner_id"]}, {"_id": 0, "is_demo": 1, "demo_until": 1})
        if owner and owner.get("is_demo"):
            account = owner
    if not account.get("is_demo") or not account.get("demo_until"):
        return False
    expires_at = datetime.fromisoformat(account["demo_until"])
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    return expires_at <= datetime.now(timezone.utc)


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
    if user.get("role") in {"dashboard_admin", "affiliate"} and not user.get("active", True):
        raise HTTPException(status_code=403, detail="Akses akun sudah dinonaktifkan pemilik.")
    if test_account_access_expired(user):
        raise HTTPException(status_code=403, detail="Masa akses akun tester sudah berakhir.")
    if await demo_account_expired(user):
        raise HTTPException(status_code=403, detail="Masa akun demo sudah berakhir.")
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
    return {**config, "gateway_ready": bool(os.environ.get("MAYAR_API_KEY"))}


@api_router.put("/admin/billing/config")
async def update_admin_billing_config(payload: BillingConfigUpdate, _admin=Depends(require_admin)):
    config = payload.model_dump()
    plan_ids = [plan["id"] for plan in config["plans"]]
    method_ids = [method["id"] for method in config["payment_methods"]]
    if len(plan_ids) != len(set(plan_ids)) or len(method_ids) != len(set(method_ids)):
        raise HTTPException(status_code=422, detail="ID paket dan metode pembayaran harus unik.")
    plan_by_id = {plan["id"]: plan for plan in config["plans"]}
    for combination in config["affiliate_combinations"]:
        if "basic" not in plan_by_id or "premium" not in plan_by_id or "business" not in plan_by_id:
            raise HTTPException(status_code=422, detail="Paket Basic, Premium, dan Business wajib tersedia untuk aturan affiliate.")
    await db.platform_settings.update_one(
        {"key": "billing"},
        {"$set": config},
        upsert=True,
    )
    return {**config, "gateway_ready": bool(os.environ.get("MAYAR_API_KEY"))}


@api_router.get("/admin/demo-accounts")
async def list_demo_accounts(_admin=Depends(require_admin)):
    accounts = await db.users.find(
        {"is_demo": True},
        {"_id": 0, "password_hash": 0},
    ).sort("created_at", -1).to_list(length=500)
    now = datetime.now(timezone.utc)
    return [{
        "id": account["id"],
        "full_name": account["full_name"],
        "email": account["email"],
        "plan_id": account["demo_plan_id"],
        "demo_until": account["demo_until"],
        "expired": datetime.fromisoformat(account["demo_until"]) <= now,
        "created_at": account.get("created_at"),
    } for account in accounts]


@api_router.post("/admin/demo-accounts")
async def create_demo_account(payload: DemoAccountCreate, _admin=Depends(require_admin)):
    config = await get_billing_config()
    plan = next((item for item in config["plans"] if item["id"] == payload.plan_id and item.get("enabled", True)), None)
    if plan is None:
        raise HTTPException(status_code=422, detail="Paket demo tidak tersedia.")
    selected_combination = None
    if plan["id"] == "business":
        selected_combination = next(
            (item for item in config["affiliate_combinations"] if item["id"] == payload.combination_id),
            None,
        )
        if selected_combination is None:
            raise HTTPException(status_code=422, detail="Pilih kombinasi kuota affiliate untuk demo Business.")
    elif payload.combination_id:
        raise HTTPException(status_code=422, detail="Kombinasi affiliate hanya tersedia untuk demo Business.")

    email = str(payload.email).lower()
    await db.users.create_index("email", unique=True)
    if await db.users.find_one({"email": email}, {"_id": 1}):
        raise HTTPException(status_code=409, detail="Email sudah terdaftar.")
    now = datetime.now(timezone.utc)
    demo_until = now + timedelta(days=payload.duration_days, hours=payload.duration_hours)
    user = {
        "id": str(uuid.uuid4()),
        "full_name": payload.full_name.strip(),
        "email": email,
        "password_hash": bcrypt.hashpw(payload.password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8"),
        "role": "user",
        "active": True,
        "is_demo": True,
        "demo_plan_id": plan["id"],
        "demo_until": demo_until.isoformat(),
        "created_at": now.isoformat(),
    }
    await db.users.create_index("id", unique=True)
    try:
        await db.users.insert_one(user)
    except DuplicateKeyError:
        raise HTTPException(status_code=409, detail="Email sudah terdaftar.") from None

    if selected_combination:
        await db.affiliate_programs.create_index("owner_id", unique=True)
        await db.affiliate_programs.insert_one({
            "owner_id": user["id"],
            "combination_id": selected_combination["id"],
            "combination": {
                "id": selected_combination["id"],
                "name": selected_combination["name"],
                "basic": selected_combination["basic"],
                "premium": selected_combination["premium"],
            },
            "updated_at": now.isoformat(),
        })
    return {
        "id": user["id"],
        "full_name": user["full_name"],
        "email": user["email"],
        "plan_id": user["demo_plan_id"],
        "demo_until": user["demo_until"],
    }


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
        "role": "user",
        "active": True,
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

    if test_account_access_expired(user):
        raise HTTPException(status_code=403, detail="Masa akses akun tester sudah berakhir.")
    if user.get("role") in {"dashboard_admin", "affiliate"} and not user.get("active", True):
        raise HTTPException(status_code=403, detail="Akses akun sudah dinonaktifkan pemilik.")
    if await demo_account_expired(user):
        raise HTTPException(status_code=403, detail="Masa akun demo sudah berakhir.")

    return {
        "access_token": create_access_token(user["id"]),
        "token_type": "bearer",
        "user": public_user(user),
    }


@api_router.get("/auth/me")
async def get_account(current_user: dict = Depends(get_current_user)):
    return {"user": public_user(current_user)}


def dashboard_account_view(user):
    return {
        "id": user["id"],
        "full_name": user["full_name"],
        "email": user["email"],
        "active": user.get("active", True),
        "created_at": user.get("created_at"),
    }


@api_router.get("/dashboard-admins")
async def list_dashboard_admins(current_user=Depends(get_current_user)):
    if current_user.get("role") in {"dashboard_admin", "affiliate"}:
        raise HTTPException(status_code=403, detail="Hanya pemilik akun yang dapat mengelola admin dashboard.")
    config = await get_billing_config()
    admins = await db.users.find(
        {"owner_id": current_user["id"], "role": "dashboard_admin"},
        {"_id": 0, "password_hash": 0},
    ).to_list(length=3)
    return {"eligible": await has_active_invitation_package(current_user["id"]),
            "max_admins": config["dashboard_admin_limit"], "admins": [dashboard_account_view(item) for item in admins]}


@api_router.post("/dashboard-admins")
async def create_dashboard_admin(payload: DashboardAdminCreate, current_user=Depends(get_current_user)):
    await require_dashboard_owner(current_user)
    config = await get_billing_config()
    if not await has_active_invitation_package(current_user["id"]):
        raise HTTPException(status_code=403, detail="Admin tambahan tersedia setelah paket undangan aktif.")
    await db.users.create_index("email", unique=True)
    current_count = await db.users.count_documents({"owner_id": current_user["id"], "role": "dashboard_admin"})
    if current_count >= config["dashboard_admin_limit"]:
        raise HTTPException(status_code=409, detail="Batas admin dashboard sudah tercapai.")
    email = str(payload.email).lower()
    if await db.users.find_one({"email": email}, {"_id": 1}):
        raise HTTPException(status_code=409, detail="Email sudah terdaftar.")
    user = {
        "id": str(uuid.uuid4()),
        "full_name": payload.full_name.strip(),
        "email": email,
        "password_hash": bcrypt.hashpw(payload.password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8"),
        "role": "dashboard_admin",
        "owner_id": current_user["id"],
        "active": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    try:
        await db.users.insert_one(user)
    except DuplicateKeyError:
        raise HTTPException(status_code=409, detail="Email sudah terdaftar.") from None
    return dashboard_account_view(user)


@api_router.patch("/dashboard-admins/{manager_id}")
async def update_dashboard_admin(manager_id: str, payload: AffiliateUpdate, current_user=Depends(get_current_user)):
    await require_dashboard_owner(current_user)
    if payload.active is None or payload.model_fields_set != {"active"}:
        raise HTTPException(status_code=422, detail="Ubah hanya status aktif admin dashboard.")
    result = await db.users.update_one(
        {"id": manager_id, "owner_id": current_user["id"], "role": "dashboard_admin"},
        {"$set": {"active": payload.active}},
    )
    if not result.matched_count:
        raise HTTPException(status_code=404, detail="Admin dashboard tidak ditemukan.")
    manager = await db.users.find_one({"id": manager_id}, {"_id": 0, "password_hash": 0})
    return dashboard_account_view(manager)


@api_router.get("/affiliate-program")
async def get_affiliate_program(current_user=Depends(get_current_user)):
    if not await require_business_owner(current_user):
        return {"eligible": False, "program": None, "affiliates": []}
    config = await get_billing_config()
    program = await db.affiliate_programs.find_one({"owner_id": current_user["id"]}, {"_id": 0})
    combinations = config["affiliate_combinations"]
    saved_combination = (program or {}).get("combination")
    if saved_combination:
        combinations = [item for item in combinations if item["id"] != saved_combination["id"]]
        combinations = combinations + [saved_combination]
    affiliate_docs = await db.users.find(
        {"owner_id": current_user["id"], "role": "affiliate"},
        {"_id": 0, "password_hash": 0},
    ).to_list(length=500)
    affiliates = []
    for affiliate in affiliate_docs:
        affiliate_invitations = await db.invitations.count_documents({"affiliate_id": affiliate["id"]})
        affiliates.append({
            **dashboard_account_view(affiliate),
            "basic_quota": affiliate.get("basic_quota", 0),
            "premium_quota": affiliate.get("premium_quota", 0),
            "basic_used": await db.invitations.count_documents({"affiliate_id": affiliate["id"], "plan_id": "basic"}),
            "premium_used": await db.invitations.count_documents({"affiliate_id": affiliate["id"], "plan_id": "premium"}),
            "ad_title": affiliate.get("ad_title", ""),
            "ad_description": affiliate.get("ad_description", ""),
            "ad_url": affiliate.get("ad_url", ""),
            "ad_image": affiliate.get("ad_image", ""),
            "ad_active": affiliate.get("ad_active", False),
            "invitation_count": affiliate_invitations,
        })
    return {"eligible": True, "program": program, "combinations": combinations, "affiliates": affiliates}


@api_router.put("/affiliate-program")
async def select_affiliate_combination(payload: AffiliateProgramUpdate, current_user=Depends(get_current_user)):
    if not await require_business_owner(current_user):
        raise HTTPException(status_code=403, detail="Program affiliate hanya tersedia untuk pemilik paket Business yang aktif.")
    config = await get_billing_config()
    combination = next((item for item in config["affiliate_combinations"] if item["id"] == payload.combination_id), None)
    if combination is None:
        raise HTTPException(status_code=422, detail="Kombinasi kuota affiliate tidak tersedia.")
    saved_program = await db.affiliate_programs.find_one({"owner_id": current_user["id"]}, {"_id": 0})
    if saved_program:
        if saved_program.get("combination_id") != combination["id"]:
            raise HTTPException(status_code=409, detail="Kombinasi affiliate sudah dikunci dan tidak dapat diubah.")
        if not saved_program.get("combination"):
            saved_program["combination"] = {
                "id": combination["id"],
                "name": combination["name"],
                "basic": combination["basic"],
                "premium": combination["premium"],
            }
            await db.affiliate_programs.update_one(
                {"owner_id": current_user["id"]},
                {"$set": {"combination": saved_program["combination"]}},
            )
        return saved_program
    program = {
        "owner_id": current_user["id"],
        "combination_id": combination["id"],
        "combination": {
            "id": combination["id"],
            "name": combination["name"],
            "basic": combination["basic"],
            "premium": combination["premium"],
        },
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.affiliate_programs.create_index("owner_id", unique=True)
    try:
        await db.affiliate_programs.insert_one(program)
    except DuplicateKeyError:
        saved_program = await db.affiliate_programs.find_one({"owner_id": current_user["id"]}, {"_id": 0})
        if saved_program and saved_program.get("combination_id") == combination["id"]:
            return saved_program
        raise HTTPException(status_code=409, detail="Kombinasi affiliate sudah dikunci dan tidak dapat diubah.") from None
    return program


@api_router.post("/affiliates")
async def create_affiliate(payload: AffiliateCreate, current_user=Depends(get_current_user)):
    if not await require_business_owner(current_user):
        raise HTTPException(status_code=403, detail="Affiliate hanya tersedia untuk pemilik paket Business yang aktif.")
    config = await get_billing_config()
    program = await db.affiliate_programs.find_one({"owner_id": current_user["id"]}, {"_id": 0})
    combination = (program or {}).get("combination") or next(
        (item for item in config["affiliate_combinations"] if program and item["id"] == program.get("combination_id")),
        None,
    )
    if combination is None:
        raise HTTPException(status_code=409, detail="Pilih kombinasi kuota affiliate terlebih dahulu.")
    affiliates = await db.users.find(
        {"owner_id": current_user["id"], "role": "affiliate"},
        {"_id": 0, "basic_quota": 1, "premium_quota": 1},
    ).to_list(length=500)
    if sum(item.get("basic_quota", 0) for item in affiliates) + payload.basic_quota > combination["basic"]:
        raise HTTPException(status_code=409, detail="Kuota Basic affiliate melebihi batas kombinasi Business.")
    if sum(item.get("premium_quota", 0) for item in affiliates) + payload.premium_quota > combination["premium"]:
        raise HTTPException(status_code=409, detail="Kuota Premium affiliate melebihi batas kombinasi Business.")
    email = str(payload.email).lower()
    await db.users.create_index("email", unique=True)
    if await db.users.find_one({"email": email}, {"_id": 1}):
        raise HTTPException(status_code=409, detail="Email sudah terdaftar.")
    affiliate = {
        "id": str(uuid.uuid4()),
        "full_name": payload.full_name.strip(),
        "email": email,
        "password_hash": bcrypt.hashpw(payload.password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8"),
        "role": "affiliate",
        "owner_id": current_user["id"],
        "active": True,
        "basic_quota": payload.basic_quota,
        "premium_quota": payload.premium_quota,
        "ad_title": payload.ad_title.strip(),
        "ad_description": payload.ad_description.strip(),
        "ad_url": payload.ad_url.strip(),
        "ad_image": payload.ad_image.strip(),
        "ad_active": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.users.create_index("id", unique=True)
    try:
        await db.users.insert_one(affiliate)
    except DuplicateKeyError:
        raise HTTPException(status_code=409, detail="Email sudah terdaftar.") from None
    return dashboard_account_view(affiliate) | {
        "basic_quota": affiliate["basic_quota"],
        "premium_quota": affiliate["premium_quota"],
        "ad_active": False,
    }


@api_router.patch("/affiliates/{affiliate_id}")
async def update_affiliate(affiliate_id: str, payload: AffiliateUpdate, current_user=Depends(get_current_user)):
    if not await require_business_owner(current_user):
        raise HTTPException(status_code=403, detail="Hanya pemilik paket Business yang dapat mengelola affiliate.")
    updates = payload.model_dump(exclude_unset=True)
    affiliate = await db.users.find_one(
        {"id": affiliate_id, "owner_id": current_user["id"], "role": "affiliate"},
        {"_id": 0, "password_hash": 0},
    )
    if affiliate is None:
        raise HTTPException(status_code=404, detail="Affiliate tidak ditemukan.")
    config = await get_billing_config()
    program = await db.affiliate_programs.find_one({"owner_id": current_user["id"]}, {"_id": 0})
    combination = (program or {}).get("combination") or next(
        (item for item in config["affiliate_combinations"] if program and item["id"] == program.get("combination_id")),
        None,
    )
    if combination is None:
        raise HTTPException(status_code=409, detail="Pilih kombinasi kuota affiliate terlebih dahulu.")
    affiliates = await db.users.find(
        {"owner_id": current_user["id"], "role": "affiliate", "id": {"$ne": affiliate_id}},
        {"_id": 0, "basic_quota": 1, "premium_quota": 1},
    ).to_list(length=500)
    basic_quota = updates.get("basic_quota", affiliate.get("basic_quota", 0))
    premium_quota = updates.get("premium_quota", affiliate.get("premium_quota", 0))
    if sum(item.get("basic_quota", 0) for item in affiliates) + basic_quota > combination["basic"]:
        raise HTTPException(status_code=409, detail="Kuota Basic affiliate melebihi batas kombinasi Business.")
    if sum(item.get("premium_quota", 0) for item in affiliates) + premium_quota > combination["premium"]:
        raise HTTPException(status_code=409, detail="Kuota Premium affiliate melebihi batas kombinasi Business.")
    if basic_quota < await db.invitations.count_documents({"affiliate_id": affiliate_id, "plan_id": "basic"}) or premium_quota < await db.invitations.count_documents({"affiliate_id": affiliate_id, "plan_id": "premium"}):
        raise HTTPException(status_code=409, detail="Kuota tidak boleh lebih rendah dari jumlah undangan yang sudah dibuat.")
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.users.update_one({"id": affiliate_id}, {"$set": updates})
    updated = await db.users.find_one({"id": affiliate_id}, {"_id": 0, "password_hash": 0})
    return dashboard_account_view(updated) | {key: updated.get(key) for key in ("basic_quota", "premium_quota", "ad_title", "ad_description", "ad_url", "ad_image", "ad_active")}


@api_router.get("/public/advertisements")
async def list_public_advertisements():
    ads = await db.users.find(
        {"role": "affiliate", "active": True, "ad_active": True, "ad_title": {"$ne": ""}, "ad_url": {"$ne": ""}},
        {"_id": 0, "id": 1, "owner_id": 1, "full_name": 1, "ad_title": 1, "ad_description": 1, "ad_url": 1, "ad_image": 1},
    ).to_list(length=24)
    results = []
    owner_eligibility = {}
    for item in ads:
        owner_id = item.get("owner_id")
        if owner_id not in owner_eligibility:
            owner = await db.users.find_one({"id": owner_id}, {"_id": 0, "password_hash": 0}) if owner_id else None
            owner_eligibility[owner_id] = bool(owner and await require_business_owner(owner))
        if not owner_eligibility[owner_id]:
            continue
        url = urlparse(item["ad_url"])
        image = urlparse(item.get("ad_image", ""))
        if url.scheme not in {"http", "https"} or not url.netloc:
            continue
        if item.get("ad_image") and (image.scheme not in {"http", "https"} or not image.netloc):
            continue
        results.append({
            "id": item["id"],
            "title": item["ad_title"],
            "description": item.get("ad_description", ""),
            "url": item["ad_url"],
            "image": item.get("ad_image", ""),
            "advertiser": item["full_name"],
        })
    return results


@api_router.post("/invitations")
async def create_invitation(payload: InvitationCreate, current_user=Depends(get_current_user)):
    config = await get_billing_config()
    plan = next((item for item in config["plans"] if item["id"] == payload.plan_id and item.get("enabled", True)), None)
    if plan is None:
        raise HTTPException(status_code=422, detail="Paket tidak tersedia.")
    owner_id = current_user["id"]
    affiliate_id = None
    is_affiliate = current_user.get("role") == "affiliate"
    demo_owner = current_user if current_user.get("is_demo") else None
    if current_user.get("role") == "dashboard_admin":
        raise HTTPException(status_code=403, detail="Admin dashboard hanya dapat melihat buku tamu undangan.")
    if is_affiliate:
        owner_id = current_user.get("owner_id")
        owner = await db.users.find_one({"id": owner_id}, {"_id": 0, "password_hash": 0}) if owner_id else None
        if owner is None or not await require_business_owner(owner):
            raise HTTPException(status_code=403, detail="Paket Business pemilik affiliate tidak aktif.")
        if owner.get("is_demo"):
            demo_owner = owner
        if payload.plan_id not in {"basic", "premium"}:
            raise HTTPException(status_code=403, detail="Affiliate hanya dapat membuat undangan Basic atau Premium.")
        quota_field = f"{payload.plan_id}_quota"
        used_count = await db.invitations.count_documents({"affiliate_id": current_user["id"], "plan_id": payload.plan_id})
        if used_count >= current_user.get(quota_field, 0):
            raise HTTPException(status_code=409, detail=f"Kuota {plan['name']} affiliate sudah habis.")
        affiliate_id = current_user["id"]
    if demo_owner:
        if not is_affiliate and payload.plan_id != demo_owner.get("demo_plan_id"):
            raise HTTPException(status_code=403, detail="Akun demo hanya dapat membuat undangan sesuai paket demo yang dipilih.")
        if await db.invitations.count_documents({"owner_id": demo_owner["id"]}) >= 2:
            raise HTTPException(status_code=409, detail="Akun demo hanya dapat membuat maksimal 2 undangan.")

    has_test_access = current_user.get("is_test_account") is True

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
        "owner_id": owner_id,
        "sales_owner_id": owner_id,
        "created_by": current_user["id"],
        "affiliate_id": affiliate_id,
        "plan_id": plan["id"],
        "title": payload.title.strip(),
        "slug": slug,
        "content": payload.content,
        "status": "active" if has_test_access or demo_owner else "draft",
        "payment_id": None,
        "active_until": demo_owner.get("demo_until") if demo_owner else current_user.get("test_access_until") if has_test_access else None,
        "is_demo": bool(demo_owner),
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
    if current_user.get("role") == "affiliate":
        return await db.invitations.find({"affiliate_id": current_user["id"]}, {"_id": 0}).to_list(length=200)
    if current_user.get("role") == "dashboard_admin":
        return await db.invitations.find(
            {"owner_id": current_user.get("owner_id"), "status": {"$in": ["active", "published"]}},
            {"_id": 0},
        ).to_list(length=200)
    return await db.invitations.find({"owner_id": current_user["id"]}, {"_id": 0}).to_list(length=200)


@api_router.get("/invitations/{invitation_id}")
async def get_my_invitation(invitation_id: str, current_user=Depends(get_current_user)):
    return await get_dashboard_invitation(invitation_id, current_user)


@api_router.patch("/invitations/{invitation_id}")
async def update_my_invitation(invitation_id: str, payload: InvitationUpdate, current_user=Depends(get_current_user)):
    if current_user.get("role") in {"dashboard_admin", "affiliate"}:
        raise HTTPException(status_code=403, detail="Perubahan undangan hanya dapat dilakukan pemilik paket.")
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
    if current_user.get("role") in {"dashboard_admin", "affiliate"}:
        raise HTTPException(status_code=403, detail="Publish undangan hanya dapat dilakukan pemilik paket.")
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


def public_digital_envelope(content):
    envelope = content.get("digital_envelope")
    if not isinstance(envelope, dict):
        return {}

    public_envelope = {}
    bank = envelope.get("bank")
    if isinstance(bank, dict) and bank.get("enabled"):
        name = str(bank.get("name") or "").strip()
        account_name = str(bank.get("account_name") or "").strip()
        account_number = str(bank.get("account_number") or "").strip()
        if name and account_name and account_number:
            public_envelope["bank"] = {
                "enabled": True,
                "name": name,
                "account_name": account_name,
                "account_number": account_number,
            }

    e_wallet = envelope.get("e_wallet")
    if isinstance(e_wallet, dict) and e_wallet.get("enabled"):
        provider = str(e_wallet.get("provider") or "").strip()
        account_name = str(e_wallet.get("account_name") or "").strip()
        account_number = str(e_wallet.get("account_number") or "").strip()
        if provider and account_name and account_number:
            public_envelope["e_wallet"] = {
                "enabled": True,
                "provider": provider,
                "account_name": account_name,
                "account_number": account_number,
            }

    qris = envelope.get("qris")
    if isinstance(qris, dict) and qris.get("enabled"):
        image_url = str(qris.get("image_url") or "").strip()
        if image_url:
            public_envelope["qris"] = {
                "enabled": True,
                "image_url": image_url,
                "instructions": str(qris.get("instructions") or "").strip(),
            }
    return public_envelope


@api_router.get("/public/invitations/{slug}")
async def get_public_invitation(slug: str):
    invitation = await db.invitations.find_one({"slug": slug, "status": "published"}, {"_id": 0})
    if invitation is None:
        raise HTTPException(status_code=404, detail="Undangan tidak tersedia.")
    if datetime.fromisoformat(invitation["active_until"]) <= datetime.now(timezone.utc):
        await db.invitations.update_one({"id": invitation["id"]}, {"$set": {"status": "expired"}})
        raise HTTPException(status_code=410, detail="Masa aktif undangan sudah berakhir.")
    content = dict(invitation["content"])
    public_envelope = public_digital_envelope(content)
    if public_envelope:
        content["digital_envelope"] = public_envelope
    else:
        content.pop("digital_envelope", None)
    return {"title": invitation["title"], "slug": invitation["slug"], "content": content}


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


def public_invitation_ticket(ticket, invitation):
    content = invitation.get("content", {})
    return {
        "name": ticket["name"],
        "invitation_title": invitation["title"],
        "slug": invitation["slug"],
        "event_date": content.get("event_date"),
        "event_time": content.get("event_time"),
        "venue": content.get("venue"),
        "checked_in_at": ticket.get("checked_in_at"),
    }


@api_router.get("/public/invitation-tickets/{ticket_token}")
async def get_public_invitation_ticket(ticket_token: str):
    ticket = await db.invitation_tickets.find_one({"token": ticket_token}, {"_id": 0})
    if ticket is None:
        raise HTTPException(status_code=404, detail="Tiket undangan tidak ditemukan.")
    invitation = await db.invitations.find_one(
        {"id": ticket["invitation_id"]},
        {"_id": 0, "id": 1, "title": 1, "slug": 1, "content": 1},
    )
    if invitation is None:
        raise HTTPException(status_code=404, detail="Undangan untuk tiket ini tidak ditemukan.")
    return public_invitation_ticket(ticket, invitation)


@api_router.post("/invitations/{invitation_id}/tickets")
async def create_invitation_tickets(
    invitation_id: str,
    payload: InvitationTicketBatch,
    current_user=Depends(get_current_user),
):
    if current_user.get("role") == "dashboard_admin":
        raise HTTPException(status_code=403, detail="Admin tambahan tidak dapat membuat atau mengelola tiket.")
    invitation = await get_dashboard_invitation(invitation_id, current_user)
    if invitation.get("status") != "published" or datetime.fromisoformat(invitation["active_until"]) <= datetime.now(timezone.utc):
        raise HTTPException(status_code=409, detail="Publish undangan yang masih aktif sebelum membuat tiket barcode.")
    if invitation.get("plan_id") == "basic" and len(payload.recipients) > 1:
        raise HTTPException(status_code=403, detail="Paket Basic hanya dapat membuat satu tiket penerima per permintaan.")

    tickets_collection = db.invitation_tickets
    await tickets_collection.create_index([("token", 1)], unique=True)
    await tickets_collection.create_index(
        [("invitation_id", 1), ("phone", 1), ("name", 1)],
        unique=True,
    )
    tickets = []
    for recipient in payload.recipients:
        identity = {
            "invitation_id": invitation_id,
            "phone": recipient.phone,
            "name": recipient.name.strip(),
        }
        ticket = await tickets_collection.find_one(identity, {"_id": 0})
        if ticket is None:
            ticket = {
                "id": str(uuid.uuid4()),
                **identity,
                "owner_id": invitation["owner_id"],
                "token": secrets.token_urlsafe(32),
                "created_at": datetime.now(timezone.utc).isoformat(),
            }
            try:
                await tickets_collection.insert_one(ticket)
            except DuplicateKeyError:
                ticket = await tickets_collection.find_one(identity, {"_id": 0})
                if ticket is None:
                    raise
        tickets.append({
            "id": ticket["id"],
            "name": ticket["name"],
            "phone": ticket["phone"],
            "token": ticket["token"],
            "checked_in_at": ticket.get("checked_in_at"),
        })
    return {"tickets": tickets}


async def ensure_ticket_guestbook_entry(ticket, invitation_id: str, owner_id: str):
    entry = await db.guestbook_entries.find_one({"ticket_id": ticket["id"]}, {"_id": 0})
    if entry is not None:
        return entry
    checked_in_at = ticket["checked_in_at"]
    entry = {
        "id": ticket["id"],
        "ticket_id": ticket["id"],
        "invitation_id": invitation_id,
        "owner_id": owner_id,
        "name": ticket["name"],
        "message": "Check-in kehadiran melalui barcode undangan.",
        "attendance": "attending",
        "guests": 1,
        "status": "hidden",
        "source": "barcode_check_in",
        "created_at": checked_in_at,
        "checked_in_at": checked_in_at,
    }
    try:
        await db.guestbook_entries.insert_one(entry)
    except DuplicateKeyError:
        entry = await db.guestbook_entries.find_one({"ticket_id": ticket["id"]}, {"_id": 0})
    return entry


@api_router.post("/invitations/{invitation_id}/check-in")
async def check_in_invitation_ticket(
    invitation_id: str,
    payload: InvitationTicketCheckIn,
    current_user=Depends(get_current_user),
):
    invitation = await get_dashboard_invitation(invitation_id, current_user)
    ticket = await db.invitation_tickets.find_one(
        {"invitation_id": invitation_id, "token": payload.ticket_token},
        {"_id": 0},
    )
    if ticket is None:
        raise HTTPException(status_code=404, detail="Barcode tidak cocok dengan undangan ini.")

    await db.guestbook_entries.create_index([("ticket_id", 1)], unique=True, sparse=True)
    if ticket.get("checked_in_at"):
        entry = await ensure_ticket_guestbook_entry(ticket, invitation_id, invitation["owner_id"])
        return {"already_checked_in": True, "entry": entry}

    checked_in_at = datetime.now(timezone.utc).isoformat()
    result = await db.invitation_tickets.update_one(
        {"id": ticket["id"], "checked_in_at": {"$exists": False}},
        {"$set": {"checked_in_at": checked_in_at}},
    )
    if not result.modified_count:
        ticket = await db.invitation_tickets.find_one({"id": ticket["id"]}, {"_id": 0})
        if ticket is None:
            raise HTTPException(status_code=404, detail="Tiket undangan tidak ditemukan.")
        entry = await ensure_ticket_guestbook_entry(ticket, invitation_id, invitation["owner_id"])
        return {"already_checked_in": True, "entry": entry}

    ticket["checked_in_at"] = checked_in_at
    entry = await ensure_ticket_guestbook_entry(ticket, invitation_id, invitation["owner_id"])
    return {"already_checked_in": False, "entry": entry}


@api_router.get("/invitations/{invitation_id}/guestbook")
async def list_my_guestbook(invitation_id: str, current_user=Depends(get_current_user)):
    await get_dashboard_invitation(invitation_id, current_user)
    return await db.guestbook_entries.find(
        {"invitation_id": invitation_id},
        {"_id": 0},
    ).sort("created_at", -1).to_list(length=500)


@api_router.patch("/invitations/{invitation_id}/guestbook/{entry_id}")
async def moderate_guestbook(invitation_id: str, entry_id: str, payload: GuestbookModeration, current_user=Depends(get_current_user)):
    if current_user.get("role") in {"dashboard_admin", "affiliate"}:
        raise HTTPException(status_code=403, detail="Admin tambahan hanya dapat melihat buku tamu.")
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
    if current_user.get("role") in {"dashboard_admin", "affiliate"}:
        raise HTTPException(status_code=403, detail="Admin tambahan hanya dapat melihat buku tamu.")
    await get_owned_invitation(invitation_id, current_user["id"])
    result = await db.guestbook_entries.delete_one({"id": entry_id, "invitation_id": invitation_id})
    if not result.deleted_count:
        raise HTTPException(status_code=404, detail="Kiriman tamu tidak ditemukan.")
    return {"status": "deleted"}


@api_router.post("/invitations/{invitation_id}/payments")
async def create_invitation_payment(invitation_id: str, payload: PaymentCreate, current_user=Depends(get_current_user)):
    if current_user.get("is_demo"):
        raise HTTPException(status_code=403, detail="Akun demo tidak dapat membuat pembayaran.")
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
        "sales_owner_id": invitation.get("sales_owner_id", current_user["id"]),
        "affiliate_id": invitation.get("affiliate_id"),
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
        mobile = re.sub(r"[\s()-]", "", payload.mobile or "")
        if mobile.startswith("0"):
            mobile = f"+62{mobile[1:]}"
        elif mobile.startswith("8"):
            mobile = f"+62{mobile}"
        elif mobile.startswith("62"):
            mobile = f"+{mobile}"
        digits = re.sub(r"\D", "", mobile)
        if not 8 <= len(digits) <= 15:
            raise HTTPException(status_code=422, detail="Masukkan nomor ponsel yang valid untuk pembayaran Mayar.")
        redirect_url = await create_mayar_invoice(payment, current_user, mobile)
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


@api_router.post("/payments/mayar/webhook")
async def mayar_webhook(payload: dict):
    if not os.environ.get("MAYAR_API_KEY"):
        raise HTTPException(status_code=503, detail="Gateway Mayar belum dikonfigurasi.")
    if payload.get("event") != "payment.received":
        return {"status": "ignored"}
    data = payload.get("data")
    if not isinstance(data, dict):
        raise HTTPException(status_code=400, detail="Notifikasi Mayar tidak lengkap.")

    identifiers = {
        str(data[key])
        for key in ("id", "transactionId", "paymentLinkTransactionId", "productId", "paymentLinkId")
        if data.get(key)
    }
    extra_data = data.get("extraData")
    if isinstance(extra_data, dict) and extra_data.get("noCustomer"):
        identifiers.add(str(extra_data["noCustomer"]))
    if not identifiers:
        raise HTTPException(status_code=400, detail="ID transaksi Mayar tidak ditemukan.")

    payment = await db.payment_orders.find_one(
        {
            "provider": "mayar",
            "$or": [
                {"id": {"$in": list(identifiers)}},
                {"order_id": {"$in": list(identifiers)}},
                {"mayar_invoice_id": {"$in": list(identifiers)}},
                {"mayar_transaction_id": {"$in": list(identifiers)}},
            ],
        },
        {"_id": 0},
    )
    if payment is None:
        raise HTTPException(status_code=404, detail="Order Mayar tidak ditemukan.")

    invoice_id = payment.get("mayar_invoice_id")
    if not invoice_id:
        raise HTTPException(status_code=409, detail="Order belum memiliki ID invoice Mayar.")
    invoice = await mayar_request("GET", f"/invoices/{invoice_id}")
    try:
        invoice_amount = Decimal(str(invoice["amount"]))
    except (KeyError, InvalidOperation, TypeError):
        raise HTTPException(status_code=502, detail="Detail invoice Mayar tidak lengkap.") from None
    if invoice.get("id") != invoice_id or invoice_amount != Decimal(payment["amount"]):
        raise HTTPException(status_code=400, detail="Invoice Mayar tidak sesuai dengan order.")

    if str(invoice.get("status", "")).lower() == "paid":
        await set_payment_status(payment, "paid", "paid")
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
    allow_methods=["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)
