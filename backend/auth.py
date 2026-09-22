"""Account identity for mobile subscriptions; billing remains owned by RevenueCat."""
import hashlib
import secrets
import uuid
from datetime import datetime, timedelta, timezone

import bcrypt
import httpx
from fastapi import APIRouter, HTTPException, Request, Response
from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator
from pymongo.errors import DuplicateKeyError
from starlette.concurrency import run_in_threadpool

router = APIRouter(prefix="/api/auth", tags=["auth"])
COOKIE = "zerotrust_session"


class User(BaseModel):
    id: str
    email: EmailStr
    name: str
    support_staff: bool = False

    @field_validator("support_staff", mode="before")
    @classmethod
    def strict_staff_role(cls, value):
        return value is True


class Session(BaseModel):
    session_token: str
    user: User


class Credentials(BaseModel):
    email: EmailStr
    password: str = Field(min_length=10, max_length=128)


class Registration(Credentials):
    name: str = Field(min_length=1, max_length=80)


class GoogleSession(BaseModel):
    model_config = ConfigDict(extra="forbid")
    session_id: str = Field(min_length=1, max_length=512)


def digest(value: str) -> str:
    return hashlib.sha256(value.encode()).hexdigest()


async def initialize_auth(db):
    await db.users.create_index("email", unique=True)
    await db.users.create_index("id", unique=True)
    await db.user_sessions.create_index("token_hash", unique=True)
    await db.user_sessions.create_index("user_id")
    await db.user_sessions.create_index("expires_at", expireAfterSeconds=0)
    await db.auth_attempts.create_index("expires_at", expireAfterSeconds=0)


async def limit_attempts(request: Request):
    now = datetime.now(timezone.utc)
    ip = request.client.host if request.client else "unknown"
    key = f"{digest(ip)}:{int(now.timestamp()) // 60}"
    result = await request.app.state.db.auth_attempts.find_one_and_update(
        {"_id": key},
        {"$inc": {"count": 1}, "$setOnInsert": {"expires_at": now + timedelta(minutes=2)}},
        upsert=True, return_document=True, projection={"_id": 0},
    )
    if result["count"] > 30:
        raise HTTPException(429, "Too many attempts. Please wait a minute.")


def request_token(request: Request):
    header = request.headers.get("Authorization", "")
    return header[7:] if header.startswith("Bearer ") else request.cookies.get(COOKIE)


async def get_user(request: Request) -> User:
    token = request_token(request)
    if not token:
        raise HTTPException(401, "Please sign in.")
    db = request.app.state.db
    session = await db.user_sessions.find_one(
        {"token_hash": digest(token), "expires_at": {"$gt": datetime.now(timezone.utc)}},
        {"_id": 0},
    )
    if not session:
        raise HTTPException(401, "Your session expired. Please sign in again.")
    user = await db.users.find_one({"id": session["user_id"]}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(401, "Account not found.")
    return User(**user)


async def create_session(request: Request, response: Response, user: dict):
    token = secrets.token_urlsafe(48)
    now = datetime.now(timezone.utc)
    await request.app.state.db.user_sessions.insert_one({
        "token_hash": digest(token), "user_id": user["id"],
        "created_at": now, "expires_at": now + timedelta(days=7),
    })
    # Web preview uses an HttpOnly cookie, native apps use SecureStore + Bearer.
    response.set_cookie(COOKIE, token, max_age=604800, httponly=True,
                        secure=True, samesite="lax", path="/api")
    response.headers["Cache-Control"] = "no-store"
    return Session(session_token=token, user=User(**user))


@router.post("/register", response_model=Session, status_code=201)
async def register(body: Registration, request: Request, response: Response):
    await limit_attempts(request)
    name = body.name.strip()
    if not name:
        raise HTTPException(422, "Please enter your name.")
    hashed = await run_in_threadpool(bcrypt.hashpw, digest(body.password).encode(), bcrypt.gensalt(12))
    user = {"id": f"user_{uuid.uuid4().hex}", "email": str(body.email).lower(),
            "name": name, "password_hash": hashed.decode(), "provider": "email", "support_staff": False,
            "created_at": datetime.now(timezone.utc)}
    try:
        await request.app.state.db.users.insert_one(dict(user))
    except DuplicateKeyError:
        raise HTTPException(409, "An account with this email already exists. Please sign in.")
    return await create_session(request, response, user)


@router.post("/login", response_model=Session)
async def login(body: Credentials, request: Request, response: Response):
    await limit_attempts(request)
    user = await request.app.state.db.users.find_one({"email": str(body.email).lower()}, {"_id": 0})
    # A fixed valid hash gives unknown accounts the same bcrypt cost.
    fallback = b"$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxAFrB.YpGbV0GpYl7NbZmleExa"
    password_hash = user.get("password_hash", "").encode() if user else b""
    valid = await run_in_threadpool(bcrypt.checkpw, digest(body.password).encode(), password_hash or fallback)
    if not user or not password_hash or not valid:
        raise HTTPException(401, "Email or password is incorrect.")
    return await create_session(request, response, user)


@router.post("/session", response_model=Session)
async def google_session(body: GoogleSession, request: Request, response: Response):
    await limit_attempts(request)
    try:
        async with httpx.AsyncClient(timeout=20) as client:
            result = await client.get(
                "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
                headers={"X-Session-ID": body.session_id},
            )
    except httpx.RequestError:
        raise HTTPException(503, "Google sign-in is unavailable. Please try again.")
    if result.status_code != 200:
        raise HTTPException(401, "Google sign-in expired. Please start again.")
    data = result.json()
    email = str(data.get("email", "")).lower()
    if not email or not data.get("session_token"):
        raise HTTPException(401, "Google could not verify your account.")
    db = request.app.state.db
    existing = await db.users.find_one({"email": email}, {"_id": 0})
    # Do not automatically merge a password account based on email alone.
    if existing and existing.get("provider") != "google":
        raise HTTPException(409, "Use email and password for this account. Google linking is not enabled yet.")
    await db.users.update_one({"email": email}, {"$setOnInsert": {
        "id": f"user_{uuid.uuid4().hex}", "email": email, "provider": "google", "support_staff": False,
        "created_at": datetime.now(timezone.utc),
    }, "$set": {"name": data.get("name") or email.split("@")[0]}}, upsert=True)
    user = await db.users.find_one({"email": email}, {"_id": 0, "password_hash": 0})
    return await create_session(request, response, user)


@router.get("/me", response_model=User)
async def me(request: Request, response: Response):
    response.headers["Cache-Control"] = "no-store"
    return await get_user(request)


@router.post("/logout")
async def logout(request: Request, response: Response):
    token = request_token(request)
    if token:
        await request.app.state.db.user_sessions.delete_one({"token_hash": digest(token)})
    response.delete_cookie(COOKIE, path="/api", secure=True, httponly=True, samesite="lax")
    return {"ok": True}