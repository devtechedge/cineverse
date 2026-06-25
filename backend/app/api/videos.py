"""Video upload, listing, streaming and deletion."""
from __future__ import annotations

import asyncio
import secrets
import time
from datetime import datetime, timezone
from math import ceil
from pathlib import Path
from typing import Annotated

from fastapi import (
    APIRouter,
    BackgroundTasks,
    Depends,
    File,
    Form,
    HTTPException,
    Query,
    Request,
    UploadFile,
    WebSocket,
    WebSocketDisconnect,
    status,
)
from fastapi.responses import StreamingResponse
from sqlalchemy import and_, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
import redis.asyncio as redis_async

from app.core.config import settings
from app.core.deps import get_current_user, get_db, get_redis
from app.core.logging import get_logger
from app.core.metrics import (
    active_websocket_connections,
    video_processing_duration_seconds,
    video_uploads_total,
)
from app.models.journal import JournalEntry
from app.models.user import User
from app.models.video import Video, VideoStatus, VideoTag
from app.schemas.common import PaginatedResponse, PaginationMeta, SuccessResponse
from app.schemas.video import (
    UploadProgress,
    VideoListParams,
    VideoResponse,
    VideoUpdate,
    VideoUploadFinalizeResponse,
    VideoUploadInit,
    VideoUploadInitResponse,
)
from app.services.ffmpeg_service import (
    FFmpegError,
    extract_thumbnail,
    probe,
    transcode_hls,
)
from app.services.storage import LocalStorage, get_storage
from app.services.websocket_manager import manager

router = APIRouter(tags=["videos"])
log = get_logger(__name__)

UPLOAD_META_KEY = "upload:{upload_id}"
UPLOAD_TTL_SECONDS = 24 * 60 * 60


# --------------------------------------------------------------------------- #
# Helpers
# --------------------------------------------------------------------------- #
def _video_to_response(v: Video) -> VideoResponse:
    return VideoResponse(
        id=v.id,
        user_id=v.user_id,
        title=v.title,
        description=v.description,
        status=v.status,
        duration=v.duration,
        resolution=v.resolution,
        thumbnail_url=(
            f"{settings.API_V1_PREFIX}/videos/{v.id}/thumbnail" if v.thumbnail_path else None
        ),
        stream_url=(
            f"{settings.API_V1_PREFIX}/videos/{v.id}/stream" if v.status == VideoStatus.READY else None
        ),
        tags=[t.tag_name for t in (v.tags or [])],
        created_at=v.created_at,
    )


def _validate_extension(filename: str) -> str:
    ext = Path(filename).suffix.lower().lstrip(".")
    if ext not in settings.ALLOWED_VIDEO_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"Unsupported file type: .{ext}",
        )
    return ext


async def _process_video_pipeline(
    video_id: int,
    upload_id: str,
    original_path: Path,
) -> None:
    """Background task: probe → thumbnail → HLS transcode → mark ready."""
    from app.core.db import SessionLocal  # local import to avoid cycle

    started = time.perf_counter()
    log.info("video.process.start", video_id=video_id, path=str(original_path))

    async def _broadcast(stage: str, pct: float, message: str | None = None) -> None:
        await manager.broadcast(
            upload_id,
            UploadProgress(
                upload_id=upload_id,
                stage=stage,  # type: ignore[arg-type]
                pct=pct,
                message=message,
            ).model_dump(),
        )

    try:
        await _broadcast("processing", 5, "Probing metadata")
        meta = await probe(original_path)

        await _broadcast("processing", 25, "Extracting thumbnail")
        thumb_path = settings.storage_thumbs_dir / f"{video_id}.jpg"
        try:
            await extract_thumbnail(original_path, thumb_path)
        except FFmpegError as exc:
            log.warning("video.thumbnail.failed", video_id=video_id, error=str(exc))
            thumb_path = None  # type: ignore[assignment]

        await _broadcast("processing", 50, "Transcoding to HLS")
        hls_dir = settings.storage_hls_dir / str(video_id)
        master = await transcode_hls(original_path, hls_dir)

        async with SessionLocal() as db:
            video = await db.get(Video, video_id)
            if video is None:
                log.error("video.process.missing_row", video_id=video_id)
                return
            video.status = VideoStatus.READY
            video.duration = meta.duration
            video.resolution = meta.resolution
            video.thumbnail_path = str(thumb_path) if thumb_path else None
            video.hls_master_path = str(master)
            await db.commit()

        await _broadcast("ready", 100, "Done")
        video_uploads_total.labels(status="ready").inc()
        video_processing_duration_seconds.observe(time.perf_counter() - started)
        log.info("video.process.success", video_id=video_id, duration=meta.duration)
    except Exception as exc:  # noqa: BLE001
        log.error("video.process.failed", video_id=video_id, error=str(exc), exc_info=True)
        video_uploads_total.labels(status="failed").inc()
        try:
            async with SessionLocal() as db:
                video = await db.get(Video, video_id)
                if video is not None:
                    video.status = VideoStatus.FAILED
                    await db.commit()
        except Exception:  # noqa: BLE001
            pass
        await _broadcast("failed", 0, str(exc))


# --------------------------------------------------------------------------- #
# Upload
# --------------------------------------------------------------------------- #
@router.post(
    "/videos/init",
    response_model=SuccessResponse[VideoUploadInitResponse],
    status_code=status.HTTP_201_CREATED,
)
async def init_upload(
    payload: VideoUploadInit,
    current_user: User = Depends(get_current_user),
    redis: redis_async.Redis = Depends(get_redis),
) -> SuccessResponse[VideoUploadInitResponse]:
    if payload.size_bytes > settings.MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File exceeds {settings.MAX_UPLOAD_BYTES} bytes",
        )
    _validate_extension(payload.filename)

    upload_id = secrets.token_urlsafe(16)
    storage = get_storage()
    if isinstance(storage, LocalStorage):
        chunk_dir = storage.absolute_path(f"uploads/{upload_id}")
        chunk_dir.mkdir(parents=True, exist_ok=True)

    meta = {
        "user_id": str(current_user.id),
        "filename": payload.filename,
        "size_bytes": str(payload.size_bytes),
        "title": payload.title,
        "description": payload.description or "",
        "tags": ",".join(payload.tags),
        "bytes_received": "0",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await redis.hset(UPLOAD_META_KEY.format(upload_id=upload_id), mapping=meta)
    await redis.expire(UPLOAD_META_KEY.format(upload_id=upload_id), UPLOAD_TTL_SECONDS)

    video_uploads_total.labels(status="init").inc()
    log.info("upload.init", upload_id=upload_id, user_id=current_user.id, filename=payload.filename)
    return SuccessResponse(
        data=VideoUploadInitResponse(
            upload_id=upload_id,
            chunk_size=settings.CHUNK_SIZE_BYTES,
            expires_in=UPLOAD_TTL_SECONDS,
        )
    )


@router.post("/videos/chunk/{upload_id}", response_model=SuccessResponse[UploadProgress])
async def upload_chunk(
    upload_id: str,
    chunk_index: Annotated[int, Form(ge=0)],
    chunk: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    redis: redis_async.Redis = Depends(get_redis),
) -> SuccessResponse[UploadProgress]:
    meta = await redis.hgetall(UPLOAD_META_KEY.format(upload_id=upload_id))
    if not meta:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Upload not found or expired")
    if int(meta["user_id"]) != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your upload")

    storage = get_storage()
    if not isinstance(storage, LocalStorage):
        raise HTTPException(  # pragma: no cover
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="Chunked uploads require local storage backend in this build",
        )

    chunk_key = f"uploads/{upload_id}/chunk_{chunk_index:06d}"
    data = await chunk.read()
    await storage.write_bytes(chunk_key, data)

    received = int(meta.get("bytes_received", "0")) + len(data)
    total = int(meta["size_bytes"])
    await redis.hset(UPLOAD_META_KEY.format(upload_id=upload_id), "bytes_received", str(received))

    pct = min(99.0, (received / total) * 100.0) if total > 0 else 0.0
    progress = UploadProgress(
        upload_id=upload_id, stage="uploading", pct=pct, bytes_received=received
    )
    await manager.broadcast(upload_id, progress.model_dump())
    return SuccessResponse(data=progress)


@router.post(
    "/videos/finalize/{upload_id}",
    response_model=SuccessResponse[VideoUploadFinalizeResponse],
)
async def finalize_upload(
    upload_id: str,
    background: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    redis: redis_async.Redis = Depends(get_redis),
) -> SuccessResponse[VideoUploadFinalizeResponse]:
    meta = await redis.hgetall(UPLOAD_META_KEY.format(upload_id=upload_id))
    if not meta:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Upload not found")
    if int(meta["user_id"]) != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your upload")

    storage = get_storage()
    if not isinstance(storage, LocalStorage):
        raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail="Local storage required")

    ext = _validate_extension(meta["filename"])
    target_key = f"originals/{upload_id}.{ext}"

    await manager.broadcast(
        upload_id,
        UploadProgress(upload_id=upload_id, stage="assembling", pct=99).model_dump(),
    )
    final_path = await storage.assemble_chunks(f"uploads/{upload_id}", target_key)
    # Cleanup chunks
    await storage.delete(f"uploads/{upload_id}")

    tags = [t for t in meta.get("tags", "").split(",") if t]

    video = Video(
        user_id=current_user.id,
        title=meta["title"],
        description=meta.get("description") or None,
        original_path=str(final_path),
        status=VideoStatus.PROCESSING,
        size_bytes=final_path.stat().st_size,
    )
    for t in tags:
        video.tags.append(VideoTag(tag_name=t))
    db.add(video)
    await db.flush()
    video_id = video.id

    # Hand off to background processing
    background.add_task(_process_video_pipeline, video_id, upload_id, final_path)
    # Cleanup redis upload meta (processing state now lives in DB + WS)
    await redis.delete(UPLOAD_META_KEY.format(upload_id=upload_id))

    log.info("upload.finalize", upload_id=upload_id, video_id=video_id, user_id=current_user.id)
    return SuccessResponse(
        data=VideoUploadFinalizeResponse(video_id=video_id, status=VideoStatus.PROCESSING)
    )


# --------------------------------------------------------------------------- #
# Listing / detail / delete
# --------------------------------------------------------------------------- #
@router.get("/videos", response_model=PaginatedResponse[VideoResponse])
async def list_videos(
    params: VideoListParams = Depends(),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> PaginatedResponse[VideoResponse]:
    base = select(Video).where(
        Video.user_id == current_user.id,
        Video.deleted_at.is_(None),
    ).options(selectinload(Video.tags))

    if params.search:
        like = f"%{params.search.lower()}%"
        base = base.where(func.lower(Video.title).like(like))
    if params.status:
        base = base.where(Video.status == params.status)
    if params.tag:
        base = base.join(VideoTag, VideoTag.video_id == Video.id).where(
            VideoTag.tag_name == params.tag.lower()
        )
    if params.has_journal is True:
        base = base.where(
            Video.id.in_(select(JournalEntry.video_id).where(JournalEntry.user_id == current_user.id))
        )
    elif params.has_journal is False:
        base = base.where(
            ~Video.id.in_(select(JournalEntry.video_id).where(JournalEntry.user_id == current_user.id))
        )

    if params.sort == "created_asc":
        base = base.order_by(Video.created_at.asc())
    elif params.sort == "title_asc":
        base = base.order_by(Video.title.asc())
    else:
        base = base.order_by(Video.created_at.desc())

    total_q = select(func.count()).select_from(base.subquery())
    total = (await db.execute(total_q)).scalar_one()

    paged = base.offset((params.page - 1) * params.page_size).limit(params.page_size)
    rows = (await db.execute(paged)).scalars().all()

    return PaginatedResponse(
        data=[_video_to_response(v) for v in rows],
        meta=PaginationMeta(
            total=total,
            page=params.page,
            page_size=params.page_size,
            pages=ceil(total / params.page_size) if total else 0,
        ),
    )


@router.get("/videos/{video_id}", response_model=SuccessResponse[VideoResponse])
async def get_video(
    video_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SuccessResponse[VideoResponse]:
    result = await db.execute(
        select(Video)
        .where(Video.id == video_id, Video.user_id == current_user.id, Video.deleted_at.is_(None))
        .options(selectinload(Video.tags))
    )
    video = result.scalar_one_or_none()
    if video is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Video not found")
    return SuccessResponse(data=_video_to_response(video))


@router.patch("/videos/{video_id}", response_model=SuccessResponse[VideoResponse])
async def update_video(
    video_id: int,
    payload: VideoUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SuccessResponse[VideoResponse]:
    result = await db.execute(
        select(Video)
        .where(Video.id == video_id, Video.user_id == current_user.id, Video.deleted_at.is_(None))
        .options(selectinload(Video.tags))
    )
    video = result.scalar_one_or_none()
    if video is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Video not found")

    if payload.title is not None:
        video.title = payload.title
    if payload.description is not None:
        video.description = payload.description
    if payload.tags is not None:
        video.tags.clear()
        await db.flush()
        for t in payload.tags:
            video.tags.append(VideoTag(tag_name=t.lower()))

    await db.flush()
    return SuccessResponse(data=_video_to_response(video))


@router.delete("/videos/{video_id}", response_model=SuccessResponse[dict])
async def delete_video(
    video_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SuccessResponse[dict]:
    video = await db.get(Video, video_id)
    if video is None or video.user_id != current_user.id or video.deleted_at is not None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Video not found")
    video.deleted_at = datetime.now(timezone.utc)

    # Best-effort filesystem cleanup
    storage = get_storage()
    for p in (video.original_path, video.thumbnail_path):
        if p:
            try:
                await asyncio.to_thread(Path(p).unlink, missing_ok=True)
            except Exception as exc:  # noqa: BLE001
                log.warning("video.delete.fs_cleanup_failed", video_id=video_id, error=str(exc))

    hls_dir = settings.storage_hls_dir / str(video_id)
    if hls_dir.exists():
        try:
            await storage.delete(f"hls/{video_id}")
        except Exception as exc:  # noqa: BLE001
            log.warning("video.delete.hls_cleanup_failed", video_id=video_id, error=str(exc))

    log.info("video.deleted", video_id=video_id, user_id=current_user.id)
    return SuccessResponse(data={"deleted": True, "id": video_id})


# --------------------------------------------------------------------------- #
# Streaming
# --------------------------------------------------------------------------- #
def _parse_range(range_header: str | None, file_size: int) -> tuple[int, int] | None:
    if not range_header or not range_header.startswith("bytes="):
        return None
    try:
        start_s, end_s = range_header[6:].split("-", 1)
        start = int(start_s) if start_s else 0
        end = int(end_s) if end_s else file_size - 1
    except ValueError:
        return None
    end = min(end, file_size - 1)
    if start > end:
        return None
    return start, end


@router.get("/videos/{video_id}/thumbnail")
async def get_thumbnail(
    video_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> StreamingResponse:
    video = await db.get(Video, video_id)
    if video is None or video.user_id != current_user.id or not video.thumbnail_path:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Thumbnail not found")

    path = Path(video.thumbnail_path)
    if not path.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Thumbnail file missing")

    async def _iter():
        with open(path, "rb") as f:
            while chunk := f.read(64 * 1024):
                yield chunk

    return StreamingResponse(_iter(), media_type="image/jpeg")


@router.get("/videos/{video_id}/stream")
async def stream_video(
    request: Request,
    video_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> StreamingResponse:
    video = await db.get(Video, video_id)
    if (
        video is None
        or video.user_id != current_user.id
        or video.deleted_at is not None
        or video.status != VideoStatus.READY
    ):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Stream not ready")

    if not video.hls_master_path or not Path(video.hls_master_path).exists():
        # Fall back to MP4 progressive streaming with range support
        if not video.original_path or not Path(video.original_path).exists():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No media")
        return _range_response(Path(video.original_path), request, media_type="video/mp4")

    master_text = Path(video.hls_master_path).read_text(encoding="utf-8")
    return StreamingResponse(
        iter([master_text.encode("utf-8")]),
        media_type="application/vnd.apple.mpegurl",
        headers={"Cache-Control": "no-cache"},
    )


@router.get("/videos/{video_id}/hls/{path:path}")
async def stream_hls_segment(
    video_id: int,
    path: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> StreamingResponse:
    video = await db.get(Video, video_id)
    if video is None or video.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")

    base = (settings.storage_hls_dir / str(video_id)).resolve()
    target = (base / path).resolve()
    if not str(target).startswith(str(base)) or not target.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Segment missing")

    media_type = (
        "application/vnd.apple.mpegurl" if target.suffix == ".m3u8" else "video/mp2t"
    )

    async def _iter():
        with open(target, "rb") as f:
            while chunk := f.read(64 * 1024):
                yield chunk

    return StreamingResponse(_iter(), media_type=media_type)


def _range_response(path: Path, request: Request, media_type: str) -> StreamingResponse:
    file_size = path.stat().st_size
    range_header = request.headers.get("range")
    rng = _parse_range(range_header, file_size)

    if rng is None:
        async def _full():
            with open(path, "rb") as f:
                while chunk := f.read(64 * 1024):
                    yield chunk

        return StreamingResponse(
            _full(),
            media_type=media_type,
            headers={
                "Accept-Ranges": "bytes",
                "Content-Length": str(file_size),
            },
        )

    start, end = rng
    length = end - start + 1

    async def _ranged():
        with open(path, "rb") as f:
            f.seek(start)
            remaining = length
            while remaining > 0:
                chunk = f.read(min(64 * 1024, remaining))
                if not chunk:
                    break
                remaining -= len(chunk)
                yield chunk

    return StreamingResponse(
        _ranged(),
        status_code=206,
        media_type=media_type,
        headers={
            "Accept-Ranges": "bytes",
            "Content-Range": f"bytes {start}-{end}/{file_size}",
            "Content-Length": str(length),
        },
    )


# --------------------------------------------------------------------------- #
# WebSocket — upload progress
# --------------------------------------------------------------------------- #
@router.websocket("/ws/upload/{upload_id}")
async def upload_progress_ws(websocket: WebSocket, upload_id: str) -> None:
    await manager.connect(upload_id, websocket)
    active_websocket_connections.inc()
    try:
        while True:
            # We don't expect client→server messages; this just keeps the socket alive.
            try:
                await asyncio.wait_for(websocket.receive_text(), timeout=30.0)
            except asyncio.TimeoutError:
                await websocket.send_json({"type": "ping"})
    except WebSocketDisconnect:
        pass
    except Exception as exc:  # noqa: BLE001
        log.warning("ws.upload.error", upload_id=upload_id, error=str(exc))
    finally:
        await manager.disconnect(upload_id, websocket)
        active_websocket_connections.dec()
