from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.clip import Clip
    from app.models.video import Video


class ShareToken(Base, TimestampMixin):
    __tablename__ = "share_tokens"

    id: Mapped[int] = mapped_column(primary_key=True)
    token: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    clip_id: Mapped[int | None] = mapped_column(
        ForeignKey("clips.id", ondelete="CASCADE"), index=True
    )
    video_id: Mapped[int | None] = mapped_column(
        ForeignKey("videos.id", ondelete="CASCADE"), index=True
    )
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    view_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    clip: Mapped["Clip | None"] = relationship(back_populates="share_tokens")
    video: Mapped["Video | None"] = relationship()
