from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, model_validator


class ClipCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    start_time: float = Field(..., ge=0)
    end_time: float = Field(..., gt=0)

    @model_validator(mode="after")
    def _validate_range(self) -> "ClipCreate":
        if self.end_time <= self.start_time:
            raise ValueError("end_time must be greater than start_time")
        if self.end_time - self.start_time > 600:
            raise ValueError("clip cannot exceed 600 seconds")
        return self


class ClipResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    video_id: int
    user_id: int
    title: str
    start_time: float
    end_time: float
    clip_url: str | None = None
    created_at: datetime


class ShareTokenResponse(BaseModel):
    token: str
    url: str
    expires_at: datetime | None
    view_count: int


class SharedResourceResponse(BaseModel):
    kind: str  # "video" | "clip"
    title: str
    stream_url: str
    duration: float | None = None
    view_count: int
