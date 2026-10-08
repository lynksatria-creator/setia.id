"""Create a disposable user account for local QA only."""

import asyncio
import os
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path
from urllib.parse import urlparse

import bcrypt
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient


TEST_ACCOUNT = {
    "full_name": "Tester Undangan",
    "email": "tester@undangan.id",
    "password": "Tester12345!",
}
TEST_ACCOUNT_ACCESS_DAYS = 365

load_dotenv(Path(__file__).with_name(".env"))


async def main():
    mongo_url = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
    db_name = os.environ.get("DB_NAME", "undangan_id")
    mongo_host = urlparse(mongo_url).hostname
    if mongo_host not in {"localhost", "127.0.0.1", "::1"}:
        raise SystemExit("Refusing to seed tester credentials into a non-local MongoDB instance.")

    client = AsyncIOMotorClient(mongo_url)
    try:
        await client.admin.command("ping")
        users = client[db_name].users
        existing = await users.find_one({"email": TEST_ACCOUNT["email"]}, {"_id": 1, "test_access_until": 1, "test_access_granted_at": 1})
        now = datetime.now(timezone.utc)
        active_until = existing.get("test_access_until") if existing else None
        try:
            parsed_until = datetime.fromisoformat(active_until) if active_until else None
        except ValueError:
            parsed_until = None
        if parsed_until is None or parsed_until.year >= 9999:
            active_until = (now + timedelta(days=TEST_ACCOUNT_ACCESS_DAYS)).isoformat()

        password_hash = bcrypt.hashpw(TEST_ACCOUNT["password"].encode(), bcrypt.gensalt()).decode()
        await users.update_one(
            {"email": TEST_ACCOUNT["email"]},
            {
                "$set": {
                    "full_name": TEST_ACCOUNT["full_name"],
                    "password_hash": password_hash,
                    "is_test_account": True,
                    "test_access_granted_at": (existing or {}).get("test_access_granted_at") or now.isoformat(),
                    "test_access_until": active_until,
                    "updated_at": now.isoformat(),
                },
                "$setOnInsert": {
                    "id": str(uuid.uuid4()),
                    "email": TEST_ACCOUNT["email"],
                    "created_at": now.isoformat(),
                },
            },
            upsert=True,
        )
        tester = await users.find_one({"email": TEST_ACCOUNT["email"]}, {"_id": 0, "id": 1})
        if tester is None:
            raise RuntimeError("Tester account was not found after the upsert.")
        invitations = await client[db_name].invitations.update_many(
            {"owner_id": tester["id"]},
            {
                "$set": {
                    "status": "active",
                    "active_until": active_until,
                    "updated_at": now.isoformat(),
                }
            },
        )
        action = "updated" if existing else "created"
        print(f"Test account {action}: {TEST_ACCOUNT['email']}")
        print(f"Access: Basic, Premium, and Business packages through {active_until} (local QA only).")
        print(f"Existing invitations activated: {invitations.modified_count}")
    finally:
        client.close()


if __name__ == "__main__":
    asyncio.run(main())