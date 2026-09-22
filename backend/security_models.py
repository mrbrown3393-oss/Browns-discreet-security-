from typing import Literal
from pydantic import BaseModel, Field, field_validator


class Workspace(BaseModel):
    name: str = Field(default="My workspace", min_length=1, max_length=100)
    sector: Literal["personal", "private", "government"] = "personal"

    @field_validator("name")
    @classmethod
    def clean_name(cls, value):
        if not value.strip():
            raise ValueError("Name cannot be blank")
        return value.strip()


class DeviceInput(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    platform: Literal["Windows", "macOS", "Linux", "iOS", "Android", "Other"] = "Windows"
    owner: str = Field(default="", max_length=100)
    mfa: bool = False
    encrypted: bool = False
    updated: bool = False
    access: Literal["allowed", "review", "denied"] = "review"

    @field_validator("name")
    @classmethod
    def clean_name(cls, value):
        if not value.strip():
            raise ValueError("Name cannot be blank")
        return value.strip()


class Device(DeviceInput):
    id: str
    created_at: str
    updated_at: str


class AlertInput(BaseModel):
    title: str = Field(min_length=1, max_length=160)
    description: str = Field(default="", max_length=2000)
    severity: Literal["low", "medium", "high", "critical"] = "medium"

    @field_validator("title")
    @classmethod
    def clean_title(cls, value):
        if not value.strip():
            raise ValueError("Title cannot be blank")
        return value.strip()


class Alert(AlertInput):
    id: str
    source: Literal["manual", "control_check"]
    status: Literal["open", "resolved"]
    device_id: str | None = None
    created_at: str
    updated_at: str


class AlertStatus(BaseModel):
    status: Literal["open", "resolved"]


class Finding(BaseModel):
    title: str
    detail: str
    priority: Literal["low", "medium", "high", "critical"]


class Snapshot(BaseModel):
    score: int | None
    device_count: int
    open_alerts: int
    critical_alerts: int
    mfa_count: int
    encrypted_count: int
    updated_count: int
    reviewed_count: int
    findings: list[Finding]
    checked_at: str


class Dashboard(BaseModel):
    workspace: Workspace
    posture: Snapshot
    recent_alerts: list[Alert]


class Report(BaseModel):
    id: str
    title: str
    workspace: Workspace
    posture: Snapshot
    created_at: str
    methodology: str


class ChatInput(BaseModel):
    message: str = Field(min_length=1, max_length=4000)


class ChatMessage(BaseModel):
    id: str
    role: Literal["user", "assistant"]
    text: str
    created_at: str