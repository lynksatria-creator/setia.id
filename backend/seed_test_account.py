"""Create a disposable user account for local or staging QA."""

import asyncio
import os
import uuid
from datetime import datetime, timezone

import bcrypt
from motor.motor_asyncio import AsyncIOMotorClient


TEST_ACCOUNT = {
    "full_name": "Tester Undangan",
    "email": "tester@undangan.id",
    "password": "Tester12345!",
}


async def main():
    mongo_url = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
    db_name = os.environ.get("DB_NAME", "undangan_id")
    client = AsyncIOMotorClient(mongo_url)
    try:
        users = client[db_name].users
        existing = await users.find_one({"email": TEST_ACCOUNT["email"]}, {"_id": 1})
        password_hash = bcrypt.hashpw(TEST_ACCOUNT["password"].encode(), bcrypt.gensalt()).decode()
        await users.update_one(
            {"email": TEST_ACCOUNT["email"]},
            {
                "$set": {
                    "full_name": TEST_ACCOUNT["full_name"],
                    "password_hash": password_hash,
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                },
                "$setOnInsert": {
                    "id": str(uuid.uuid4()),
                    "email": TEST_ACCOUNT["email"],
                    "created_at": datetime.now(timezone.utc).isoformat(),
                },
            },
            upsert=True,
        )
        action = "updated" if existing else "created"
        print(f"Test account {action}: {TEST_ACCOUNT['email']}")
        print(f"Password: {TEST_ACCOUNT['password']}")
    finally:
        client.close()


if __name__ == "__main__":
    asyncio.run(main())