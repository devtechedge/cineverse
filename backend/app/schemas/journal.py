from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class JournalEntryCreate(BaseModel):
    timestamp_seconds: float = Field(..., ge=0)
    content: dict[str, Any] = Field(default_factory=dict)
    content_text: str = Field("", max_length=50_000)


class JournalEntryUpdate(BaseModel):
    timestamp_seconds: float | None = Field(None, ge=0)
    content: dict[str, Any] | None = None
    content_text: str | None = Field(None, max_length=50_000)


class JournalEntryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    video_id: int
    user_id: int
    timestamp_seconds: float
    content: dict[str, Any]
    content_text: str
    created_at: datetime
    updated_at: datetime


class JournalSearchHit(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    video_id: int
    timestamp_seconds: float
    snippet: str
    created_at: datetime
