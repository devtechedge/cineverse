from __future__ import annotations

from typing import TYPE_CHECKING, Any

from sqlalchemy import Float, ForeignKey, Index, JSON, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

# JSONB on Postgres; JSON elsewhere (e.g. SQLite for tests).
JsonType = JSON().with_variant(JSONB(), "postgresql")

from app.core.db import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.video import Video


class JournalEntry(Base, TimestampMixin):
    __tablename__ = "journal_entries"
    __table_args__ = (
        Index("ix_journal_video_ts", "video_id", "timestamp_seconds"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    video_id: Mapped[int] = mapped_column(
        ForeignKey("videos.id", ondelete="CASCADE"), index=True, nullable=False
    )
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    timestamp_seconds: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    # Rich content payload (TipTap JSON doc)
    content: Mapped[dict[str, Any]] = mapped_column(JsonType, nullable=False, default=dict)
    # Plaintext mirror for full-text search (kept in sync application-side).
    content_text: Mapped[str] = mapped_column(Text, nullable=False, default="")

    video: Mapped["Video"] = relationship(back_populates="journal_entries")
    user: Mapped["User"] = relationship(back_populates="journal_entries")
