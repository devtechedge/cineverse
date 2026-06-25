from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import Float, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.share import ShareToken
    from app.models.user import User
    from app.models.video import Video


class Clip(Base, TimestampMixin):
    __tablename__ = "clips"

    id: Mapped[int] = mapped_column(primary_key=True)
    video_id: Mapped[int] = mapped_column(
        ForeignKey("videos.id", ondelete="CASCADE"), index=True, nullable=False
    )
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    start_time: Mapped[float] = mapped_column(Float, nullable=False)
    end_time: Mapped[float] = mapped_column(Float, nullable=False)
    clip_path: Mapped[str | None] = mapped_column(String(1024))

    video: Mapped["Video"] = relationship(back_populates="clips")
    user: Mapped["User"] = relationship(back_populates="clips")
    share_tokens: Mapped[list["ShareToken"]] = relationship(
        back_populates="clip", cascade="all, delete-orphan"
    )
