"""Clip creation + share-token endpoints."""
from __future__ import annotations

import secrets
from datetime import datetime, timedelta, timezone
from pathlib import Path

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request, status
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.deps import get_current_user, get_db
from app.core.logging import get_logger
from app.models.clip import Clip
from app.models.share import ShareToken
from app.models.user import User
from app.models.video import Video, VideoStatus
from app.schemas.clip import (
    ClipCreate,
    ClipResponse,
    SharedResourceResponse,
    ShareTokenResponse,
)
from app.schemas.common import SuccessResponse
from app.services.ffmpeg_service import FFmpegError, trim_clip

router = APIRouter(tags=["clips"])
log = get_logger(__name__)


def _is_expired(expires_at: datetime | None) -> bool:
    if expires_at is None:
        return False
    # Some DBs return naive datetimes; coerce to UTC for comparison.
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    return expires_at < datetime.now(timezone.utc)


def _clip_response(clip: Clip) -> ClipResponse:
    return ClipResponse(
        id=clip.id,
        video_id=clip.video_id,
        user_id=clip.user_id,
        title=clip.title,
        start_time=clip.start_time,
        end_time=clip.end_time,
        clip_url=(f"{settings.API_V1_PREFIX}/clips/{clip.id}/stream" if clip.clip_path else None),
        created_at=clip.created_at,
    )


async def _create_clip_file(clip_id: int, src_path: Path) -> None:
    from app.core.db import SessionLocal

    try:
        async with SessionLocal() as db:
            clip = await db.get(Clip, clip_id)
            if clip is None:
                return
            out_path = settings.storage_clips_dir / f"{clip_id}.mp4"
            await trim_clip(src_path, clip.start_time, clip.end_time, out_path)
            clip.clip_path = str(out_path)
            await db.commit()
        log.info("clip.created", clip_id=clip_id, path=str(out_path))
    except (FFmpegError, FileNotFoundError) as exc:
        log.error("clip.create.failed", clip_id=clip_id, error=str(exc))


@router.post(
    "/videos/{video_id}/clips",
    response_model=SuccessResponse[ClipResponse],
    status_code=status.HTTP_201_CREATED,
)
async def create_clip(
    video_id: int,
    payload: ClipCreate,
    background: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SuccessResponse[ClipResponse]:
    video = await db.get(Video, video_id)
    if (
        video is None
        or video.user_id != current_user.id
        or video.deleted_at is not None
        or video.status != VideoStatus.READY
    ):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Video not available")
    if video.duration and payload.end_time > video.duration + 0.5:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="end_time exceeds video duration",
        )
    clip = Clip(
        video_id=video.id,
        user_id=current_user.id,
        title=payload.title,
        start_time=payload.start_time,
        end_time=payload.end_time,
    )
    db.add(clip)
    await db.flush()
    if video.original_path:
        background.add_task(_create_clip_file, clip.id, Path(video.original_path))
    return SuccessResponse(data=_clip_response(clip))


@router.get("/clips/{clip_id}", response_model=SuccessResponse[ClipResponse])
async def get_clip(
    clip_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SuccessResponse[ClipResponse]:
    clip = await db.get(Clip, clip_id)
    if clip is None or clip.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Clip not found")
    return SuccessResponse(data=_clip_response(clip))


@router.get("/clips/{clip_id}/stream")
async def stream_clip(
    request: Request,
    clip_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> StreamingResponse:
    clip = await db.get(Clip, clip_id)
    if clip is None or clip.user_id != current_user.id or not clip.clip_path:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Clip not ready")
    from app.api.videos import _range_response
    return _range_response(Path(clip.clip_path), request, media_type="video/mp4")


@router.post("/clips/{clip_id}/share", response_model=SuccessResponse[ShareTokenResponse])
async def share_clip(
    clip_id: int,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SuccessResponse[ShareTokenResponse]:
    clip = await db.get(Clip, clip_id)
    if clip is None or clip.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Clip not found")

    token = secrets.token_urlsafe(32)
    expires = datetime.now(timezone.utc) + timedelta(days=settings.SHARE_TOKEN_TTL_DAYS)
    share = ShareToken(token=token, clip_id=clip.id, expires_at=expires)
    db.add(share)
    await db.flush()
    public_url = f"{request.base_url}".rstrip("/") + f"{settings.API_V1_PREFIX}/share/{token}"
    return SuccessResponse(
        data=ShareTokenResponse(token=token, url=public_url, expires_at=expires, view_count=0)
    )


@router.post("/videos/{video_id}/share", response_model=SuccessResponse[ShareTokenResponse])
async def share_video(
    video_id: int,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SuccessResponse[ShareTokenResponse]:
    video = await db.get(Video, video_id)
    if video is None or video.user_id != current_user.id or video.deleted_at is not None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Video not found")
    token = secrets.token_urlsafe(32)
    expires = datetime.now(timezone.utc) + timedelta(days=settings.SHARE_TOKEN_TTL_DAYS)
    share = ShareToken(token=token, video_id=video.id, expires_at=expires)
    db.add(share)
    await db.flush()
    public_url = f"{request.base_url}".rstrip("/") + f"{settings.API_V1_PREFIX}/share/{token}"
    return SuccessResponse(
        data=ShareTokenResponse(token=token, url=public_url, expires_at=expires, view_count=0)
    )


@router.get("/share/{token}", response_model=SuccessResponse[SharedResourceResponse])
async def access_share(
    token: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> SuccessResponse[SharedResourceResponse]:
    result = await db.execute(select(ShareToken).where(ShareToken.token == token))
    share = result.scalar_one_or_none()
    if share is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invalid share token")
    if _is_expired(share.expires_at):
        raise HTTPException(status_code=status.HTTP_410_GONE, detail="Share token expired")

    share.view_count += 1

    if share.clip_id:
        clip = await db.get(Clip, share.clip_id)
        if clip is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Clip missing")
        duration = clip.end_time - clip.start_time
        stream_url = f"{settings.API_V1_PREFIX}/share/{token}/stream"
        await db.flush()
        return SuccessResponse(
            data=SharedResourceResponse(
                kind="clip",
                title=clip.title,
                stream_url=stream_url,
                duration=duration,
                view_count=share.view_count,
            )
        )

    if share.video_id:
        video = await db.get(Video, share.video_id)
        if video is None or video.deleted_at is not None or video.status != VideoStatus.READY:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Video missing")
        stream_url = f"{settings.API_V1_PREFIX}/share/{token}/stream"
        await db.flush()
        return SuccessResponse(
            data=SharedResourceResponse(
                kind="video",
                title=video.title,
                stream_url=stream_url,
                duration=video.duration,
                view_count=share.view_count,
            )
        )

    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Share has no resource")


@router.get("/share/{token}/stream")
async def stream_shared(
    request: Request,
    token: str,
    db: AsyncSession = Depends(get_db),
) -> StreamingResponse:
    result = await db.execute(select(ShareToken).where(ShareToken.token == token))
    share = result.scalar_one_or_none()
    if share is None or (_is_expired(share.expires_at)):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invalid share token")
    from app.api.videos import _range_response
    if share.clip_id:
        clip = await db.get(Clip, share.clip_id)
        if clip is None or not clip.clip_path:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
        return _range_response(Path(clip.clip_path), request, media_type="video/mp4")
    if share.video_id:
        video = await db.get(Video, share.video_id)
        if video is None or not video.original_path:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
        return _range_response(Path(video.original_path), request, media_type="video/mp4")
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No resource")
