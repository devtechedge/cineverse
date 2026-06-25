from __future__ import annotations

import enum
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import (
    DateTime,
    Enum as SAEnum,
    Float,
    ForeignKey,
    Index,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.clip import Clip
    from app.models.journal import JournalEntry
    from app.models.user import User


class VideoStatus(str, enum.Enum):
    UPLOADING = "uploading"
    PROCESSING = "processing"
    READY = "ready"
    FAILED = "failed"


class Video(Base, TimestampMixin):
    __tablename__ = "videos"
    __table_args__ = (
        Index("ix_videos_user_created", "user_id", "created_at"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    original_path: Mapped[str | None] = mapped_column(String(1024))
    hls_master_path: Mapped[str | None] = mapped_column(String(1024))
    thumbnail_path: Mapped[str | None] = mapped_column(String(1024))
    status: Mapped[VideoStatus] = mapped_column(
        SAEnum(VideoStatus, name="video_status"),
        default=VideoStatus.UPLOADING,
        nullable=False,
        index=True,
    )
    duration: Mapped[float | None] = mapped_column(Float)
    resolution: Mapped[str | None] = mapped_column(String(32))
    size_bytes: Mapped[int | None] = mapped_column()
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), index=True)

    user: Mapped["User"] = relationship(back_populates="videos")
    journal_entries: Mapped[list["JournalEntry"]] = relationship(
        back_populates="video", cascade="all, delete-orphan", order_by="JournalEntry.timestamp_seconds"
    )
    tags: Mapped[list["VideoTag"]] = relationship(
        back_populates="video", cascade="all, delete-orphan", lazy="selectin"
    )
    clips: Mapped[list["Clip"]] = relationship(
        back_populates="video", cascade="all, delete-orphan"
    )


class VideoTag(Base):
    __tablename__ = "video_tags"
    __table_args__ = (
        Index("ix_video_tags_tag_name", "tag_name"),
        Index("ix_video_tags_video_id", "video_id"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    video_id: Mapped[int] = mapped_column(
        ForeignKey("videos.id", ondelete="CASCADE"), nullable=False
    )
    tag_name: Mapped[str] = mapped_column(String(64), nullable=False)

    video: Mapped["Video"] = relationship(back_populates="tags")
