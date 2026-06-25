from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.video import VideoStatus


class VideoUploadInit(BaseModel):
    filename: str = Field(..., min_length=1, max_length=512)
    size_bytes: int = Field(..., ge=1)
    title: str = Field(..., min_length=1, max_length=255)
    description: str | None = Field(None, max_length=10_000)
    tags: list[str] = Field(default_factory=list, max_length=32)

    @field_validator("tags")
    @classmethod
    def _trim_tags(cls, v: list[str]) -> list[str]:
        cleaned = [t.strip().lower() for t in v if t and t.strip()]
        # dedupe preserving order
        seen: set[str] = set()
        out: list[str] = []
        for t in cleaned:
            if t not in seen and len(t) <= 64:
                seen.add(t)
                out.append(t)
        return out


class VideoUploadInitResponse(BaseModel):
    upload_id: str
    chunk_size: int
    expires_in: int


class VideoUploadFinalizeResponse(BaseModel):
    video_id: int
    status: VideoStatus


class VideoTagOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    tag_name: str


class VideoResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    user_id: int
    title: str
    description: str | None
    status: VideoStatus
    duration: float | None
    resolution: str | None
    thumbnail_url: str | None = None
    stream_url: str | None = None
    tags: list[str] = Field(default_factory=list)
    created_at: datetime


class VideoUpdate(BaseModel):
    title: str | None = Field(None, min_length=1, max_length=255)
    description: str | None = Field(None, max_length=10_000)
    tags: list[str] | None = Field(None, max_length=32)


class VideoListParams(BaseModel):
    search: str | None = Field(None, max_length=255)
    tag: str | None = Field(None, max_length=64)
    has_journal: bool | None = None
    status: VideoStatus | None = None
    page: int = Field(1, ge=1)
    page_size: int = Field(24, ge=1, le=100)
    sort: Literal["created_desc", "created_asc", "title_asc"] = "created_desc"


class UploadProgress(BaseModel):
    upload_id: str
    stage: Literal["uploading", "assembling", "processing", "ready", "failed"]
    pct: float = Field(..., ge=0, le=100)
    bytes_received: int = 0
    message: str | None = None
