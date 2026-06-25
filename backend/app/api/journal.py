"""Journal entry CRUD + full-text search."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user, get_db
from app.core.logging import get_logger
from app.models.journal import JournalEntry
from app.models.user import User
from app.models.video import Video
from app.schemas.common import SuccessResponse
from app.schemas.journal import (
    JournalEntryCreate,
    JournalEntryResponse,
    JournalEntryUpdate,
    JournalSearchHit,
)

router = APIRouter(tags=["journal"])
log = get_logger(__name__)


async def _own_video_or_404(db: AsyncSession, user: User, video_id: int) -> Video:
    video = await db.get(Video, video_id)
    if video is None or video.user_id != user.id or video.deleted_at is not None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Video not found")
    return video


@router.post(
    "/videos/{video_id}/journal",
    response_model=SuccessResponse[JournalEntryResponse],
    status_code=status.HTTP_201_CREATED,
)
async def create_entry(
    video_id: int,
    payload: JournalEntryCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SuccessResponse[JournalEntryResponse]:
    await _own_video_or_404(db, current_user, video_id)
    entry = JournalEntry(
        video_id=video_id,
        user_id=current_user.id,
        timestamp_seconds=payload.timestamp_seconds,
        content=payload.content,
        content_text=payload.content_text,
    )
    db.add(entry)
    await db.flush()
    return SuccessResponse(data=JournalEntryResponse.model_validate(entry))


@router.get(
    "/videos/{video_id}/journal",
    response_model=SuccessResponse[list[JournalEntryResponse]],
)
async def list_entries(
    video_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SuccessResponse[list[JournalEntryResponse]]:
    await _own_video_or_404(db, current_user, video_id)
    result = await db.execute(
        select(JournalEntry)
        .where(JournalEntry.video_id == video_id, JournalEntry.user_id == current_user.id)
        .order_by(JournalEntry.timestamp_seconds.asc())
    )
    rows = result.scalars().all()
    return SuccessResponse(data=[JournalEntryResponse.model_validate(r) for r in rows])


@router.put("/journal/{entry_id}", response_model=SuccessResponse[JournalEntryResponse])
async def update_entry(
    entry_id: int,
    payload: JournalEntryUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SuccessResponse[JournalEntryResponse]:
    entry = await db.get(JournalEntry, entry_id)
    if entry is None or entry.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Entry not found")
    if payload.timestamp_seconds is not None:
        entry.timestamp_seconds = payload.timestamp_seconds
    if payload.content is not None:
        entry.content = payload.content
    if payload.content_text is not None:
        entry.content_text = payload.content_text
    await db.flush()
    await db.refresh(entry)
    return SuccessResponse(data=JournalEntryResponse.model_validate(entry))


@router.delete("/journal/{entry_id}", response_model=SuccessResponse[dict])
async def delete_entry(
    entry_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SuccessResponse[dict]:
    entry = await db.get(JournalEntry, entry_id)
    if entry is None or entry.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Entry not found")
    await db.delete(entry)
    return SuccessResponse(data={"deleted": True, "id": entry_id})


@router.get("/journal/search", response_model=SuccessResponse[list[JournalSearchHit]])
async def search_entries(
    q: str = Query(..., min_length=1, max_length=255),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SuccessResponse[list[JournalSearchHit]]:
    # Use PostgreSQL FTS with ts_headline for snippet generation.
    # Fall back to ILIKE if FTS unsupported (SQLite in tests).
    dialect = db.bind.dialect.name if db.bind else "postgresql"
    if dialect == "postgresql":
        sql = text(
            """
            SELECT id, video_id, timestamp_seconds, created_at,
                   ts_headline('english', content_text, plainto_tsquery('english', :q),
                              'MaxFragments=1, MaxWords=20, MinWords=5') AS snippet
            FROM journal_entries
            WHERE user_id = :uid
              AND to_tsvector('english', content_text) @@ plainto_tsquery('english', :q)
            ORDER BY ts_rank_cd(to_tsvector('english', content_text),
                                plainto_tsquery('english', :q)) DESC,
                     created_at DESC
            LIMIT :limit
            """
        )
        rows = (await db.execute(sql, {"q": q, "uid": current_user.id, "limit": limit})).mappings().all()
        hits = [
            JournalSearchHit(
                id=r["id"],
                video_id=r["video_id"],
                timestamp_seconds=float(r["timestamp_seconds"]),
                snippet=r["snippet"] or "",
                created_at=r["created_at"],
            )
            for r in rows
        ]
    else:
        result = await db.execute(
            select(JournalEntry)
            .where(
                JournalEntry.user_id == current_user.id,
                JournalEntry.content_text.ilike(f"%{q}%"),
            )
            .order_by(JournalEntry.created_at.desc())
            .limit(limit)
        )
        hits = [
            JournalSearchHit(
                id=e.id,
                video_id=e.video_id,
                timestamp_seconds=e.timestamp_seconds,
                snippet=(e.content_text[:160] + "…") if len(e.content_text) > 160 else e.content_text,
                created_at=e.created_at,
            )
            for e in result.scalars().all()
        ]

    return SuccessResponse(data=hits)
