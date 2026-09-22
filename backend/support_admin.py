"""Environment-driven support-owner seed; never upgrades or resets existing users."""
import hashlib
import os
import uuid
from datetime import datetime, timezone
import bcrypt
from dotenv import load_dotenv
from pydantic import TypeAdapter, EmailStr
from pymongo.errors import DuplicateKeyError
from starlette.concurrency import run_in_threadpool

load_dotenv()


async def seed_support_admin(db):
    email = os.getenv("SUPPORT_ADMIN_EMAIL", "").strip().lower()
    password = os.getenv("SUPPORT_ADMIN_PASSWORD", "")
    if not email and not password:
        return
    if not email or len(password) < 20:
        raise RuntimeError("Support administrator seed configuration is incomplete.")
    TypeAdapter(EmailStr).validate_python(email)
    existing = await db.users.find_one({"email": email}, {"_id": 0, "support_staff": 1})
    if existing:
        if existing.get("support_staff") is not True:
            raise RuntimeError("Refusing to promote an existing non-staff account.")
        return
    # Keep exactly the existing login's SHA256-hexdigest -> bcrypt scheme.
    hashed = await run_in_threadpool(bcrypt.hashpw, hashlib.sha256(password.encode()).hexdigest().encode(), bcrypt.gensalt(12))
    try:
        await db.users.insert_one({"id": f"user_{uuid.uuid4().hex}", "name": "Support owner", "email": email,
            "password_hash": hashed.decode(), "provider": "email", "support_staff": True, "created_at": datetime.now(timezone.utc)})
    except DuplicateKeyError:
        existing = await db.users.find_one({"email": email}, {"_id": 0, "support_staff": 1})
        if not existing or existing.get("support_staff") is not True:
            raise RuntimeError("Support administrator seed conflict; no account was promoted.")