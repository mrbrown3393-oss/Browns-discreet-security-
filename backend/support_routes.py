import uuid
from datetime import datetime, timedelta, timezone
from typing import Literal
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field, field_validator
from auth import get_user
from security_data import now

router = APIRouter(prefix="/api/support", tags=["support"])
Category = Literal["Account", "Billing", "Devices", "AI assistant", "Reports", "Other"]
Status = Literal["open", "in_progress", "resolved"]


class TicketCreate(BaseModel):
    subject: str = Field(min_length=3, max_length=160)
    category: Category = "Other"
    message: str = Field(min_length=10, max_length=4000)

    @field_validator("subject", "message")
    @classmethod
    def nonblank(cls, value):
        if not value.strip():
            raise ValueError("Please enter a description.")
        return value.strip()


class ReplyInput(BaseModel):
    message: str = Field(min_length=1, max_length=4000)

    @field_validator("message")
    @classmethod
    def nonblank(cls, value):
        if not value.strip():
            raise ValueError("Please enter a message.")
        return value.strip()


class StatusInput(BaseModel):
    status: Status


class TicketMessage(BaseModel):
    id: str
    author: Literal["customer", "support"]
    text: str
    created_at: str


class Ticket(BaseModel):
    id: str
    reference: str
    subject: str
    category: Category
    status: Status
    contact_email: str
    created_at: str
    updated_at: str
    messages: list[TicketMessage]


async def initialize_support(db):
    await db.support_tickets.create_index("id", unique=True)
    await db.support_tickets.create_index([("user_id", 1), ("updated_at", -1)])
    await db.support_tickets.create_index([("status", 1), ("updated_at", -1)])


async def limit_support(db, user_id):
    current = datetime.now(timezone.utc)
    value = await db.auth_attempts.find_one_and_update({"_id": f"support:{user_id}:{int(current.timestamp()) // 600}"},
        {"$inc": {"count": 1}, "$setOnInsert": {"expires_at": current + timedelta(minutes=15)}}, upsert=True, return_document=True, projection={"_id": 0})
    if value["count"] > 40:
        raise HTTPException(429, "Please wait a few minutes before submitting more support updates.")


async def ticket_for(request, ticket_id):
    user = await get_user(request)
    filters = {"id": ticket_id}
    if not user.support_staff:
        filters["user_id"] = user.id
    ticket = await request.app.state.db.support_tickets.find_one(filters, {"_id": 0})
    if not ticket:
        raise HTTPException(404, "Support ticket not found.")
    return user, ticket


@router.get("/tickets", response_model=list[Ticket])
async def my_tickets(request: Request):
    user = await get_user(request)
    return await request.app.state.db.support_tickets.find({"user_id": user.id}, {"_id": 0, "user_id": 0}).sort("updated_at", -1).limit(100).to_list(100)


@router.get("/inbox", response_model=list[Ticket])
async def staff_inbox(request: Request):
    user = await get_user(request)
    if not user.support_staff:
        raise HTTPException(403, "Support staff access is required.")
    return await request.app.state.db.support_tickets.find({}, {"_id": 0, "user_id": 0}).sort("updated_at", -1).limit(200).to_list(200)


@router.post("/tickets", response_model=Ticket, status_code=201)
async def create_ticket(body: TicketCreate, request: Request):
    user = await get_user(request)
    db = request.app.state.db
    await limit_support(db, user.id)
    if await db.support_tickets.count_documents({"user_id": user.id, "status": {"$ne": "resolved"}}) >= 30:
        raise HTTPException(429, "You have 30 active requests. Please continue an existing conversation.")
    ticket_id = uuid.uuid4().hex
    ticket = Ticket(id=ticket_id, reference=f"ZT-{ticket_id[:8].upper()}", subject=body.subject,
        category=body.category, status="open", contact_email=str(user.email), created_at=now(), updated_at=now(),
        messages=[TicketMessage(id=uuid.uuid4().hex, author="customer", text=body.message, created_at=now())])
    await db.support_tickets.insert_one({**ticket.model_dump(), "user_id": user.id})
    return ticket


@router.get("/tickets/{ticket_id}", response_model=Ticket)
async def ticket_detail(ticket_id: str, request: Request):
    _, ticket = await ticket_for(request, ticket_id)
    return Ticket(**ticket)


@router.post("/tickets/{ticket_id}/reply", response_model=Ticket)
async def reply(ticket_id: str, body: ReplyInput, request: Request):
    user, ticket = await ticket_for(request, ticket_id)
    db = request.app.state.db
    await limit_support(db, user.id)
    message = TicketMessage(id=uuid.uuid4().hex, author="support" if user.support_staff else "customer", text=body.message, created_at=now())
    updated = await db.support_tickets.find_one_and_update({"id": ticket_id, "messages.199": {"$exists": False}},
        {"$push": {"messages": message.model_dump()}, "$set": {"status": "in_progress" if user.support_staff else "open", "updated_at": now()}},
        return_document=True, projection={"_id": 0, "user_id": 0})
    if not updated:
        raise HTTPException(409, "This conversation is full. Please start a new request with this ticket reference.")
    return Ticket(**updated)


@router.post("/tickets/{ticket_id}/status", response_model=Ticket)
async def change_status(ticket_id: str, body: StatusInput, request: Request):
    user, _ = await ticket_for(request, ticket_id)
    if not user.support_staff and body.status == "in_progress":
        raise HTTPException(403, "Only support staff can mark a ticket in progress.")
    await limit_support(request.app.state.db, user.id)
    updated = await request.app.state.db.support_tickets.find_one_and_update({"id": ticket_id},
        {"$set": {"status": body.status, "updated_at": now()}}, return_document=True, projection={"_id": 0, "user_id": 0})
    if not updated:
        raise HTTPException(404, "Support ticket not found.")
    return Ticket(**updated)