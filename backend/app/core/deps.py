"""Reusable FastAPI dependencies."""
from __future__ import annotations

from typing import AsyncIterator

import redis.asyncio as redis_async
from fastapi import Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.core.config import settings
from app.core.db import SessionLocal
from app.core.security import decode_token, oauth2_scheme
from app.models.user import User

# slowapi limiter — initialized once; storage is in-process by default, swap to
# `storage_uri=REDIS_URL` for distributed deployments.
limiter = Limiter(
    key_func=get_remote_address,
    storage_uri=settings.REDIS_URL,
    default_limits=[settings.RATE_LIMIT_DEFAULT],
)


# --- DB ------------------------------------------------------------------- #
async def get_db() -> AsyncIterator[AsyncSession]:
    async with SessionLocal() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
        else:
            await session.commit()


# --- Redis ---------------------------------------------------------------- #
_redis_client: redis_async.Redis | None = None


async def get_redis() -> redis_async.Redis:
    global _redis_client
    if _redis_client is None:
        _redis_client = redis_async.from_url(
            settings.REDIS_URL,
            encoding="utf-8",
            decode_responses=True,
        )
    return _redis_client


async def close_redis() -> None:
    global _redis_client
    if _redis_client is not None:
        await _redis_client.aclose()
        _redis_client = None


# --- Auth ----------------------------------------------------------------- #
CREDENTIALS_EXCEPTION = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Could not validate credentials",
    headers={"WWW-Authenticate": "Bearer"},
)


async def get_current_user(
    token: str | None = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
    redis: redis_async.Redis = Depends(get_redis),
) -> User:
    if not token:
        raise CREDENTIALS_EXCEPTION

    payload = decode_token(token, expected_type="access")
    user_id = payload.get("sub")
    jti = payload.get("jti")
    if not user_id or not jti:
        raise CREDENTIALS_EXCEPTION

    # Blacklist check
    if await redis.get(f"jwt:blacklist:{jti}"):
        raise CREDENTIALS_EXCEPTION

    result = await db.execute(select(User).where(User.id == int(user_id)))
    user = result.scalar_one_or_none()
    if user is None or not user.is_active:
        raise CREDENTIALS_EXCEPTION
    return user


async def get_current_user_optional(
    token: str | None = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
    redis: redis_async.Redis = Depends(get_redis),
) -> User | None:
    if not token:
        return None
    try:
        return await get_current_user(token=token, db=db, redis=redis)
    except HTTPException:
        return None
