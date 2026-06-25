"""Authentication endpoints."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
import redis.asyncio as redis_async

from app.core.config import settings
from app.core.deps import get_current_user, get_db, get_redis
from app.core.logging import get_logger
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.models.user import User
from app.schemas.common import SuccessResponse
from app.schemas.user import (
    AccessTokenResponse,
    Token,
    TokenRefresh,
    UserCreate,
    UserLogin,
    UserResponse,
)

router = APIRouter(prefix="/auth", tags=["auth"])
log = get_logger(__name__)


REFRESH_KEY = "refresh:{jti}"
BLACKLIST_KEY = "jwt:blacklist:{jti}"


async def _issue_pair(user: User, redis: redis_async.Redis) -> Token:
    access, _, _ = create_access_token(user.id, extra={"email": user.email, "role": user.role})
    refresh, refresh_jti, _ = create_refresh_token(user.id)

    ttl_seconds = settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60
    await redis.set(REFRESH_KEY.format(jti=refresh_jti), str(user.id), ex=ttl_seconds)

    return Token(
        access_token=access,
        refresh_token=refresh,
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )


@router.post(
    "/register",
    response_model=SuccessResponse[Token],
    status_code=status.HTTP_201_CREATED,
)
async def register(
    payload: UserCreate,
    db: AsyncSession = Depends(get_db),
    redis: redis_async.Redis = Depends(get_redis),
) -> SuccessResponse[Token]:
    try:
        user = User(
            email=payload.email.lower(),
            hashed_password=hash_password(payload.password),
            full_name=payload.full_name,
            is_active=True,
            role="user",
        )
        db.add(user)
        await db.flush()
    except IntegrityError as exc:
        await db.rollback()
        log.warning("auth.register.duplicate", email=payload.email)
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered",
        ) from exc

    tokens = await _issue_pair(user, redis)
    log.info("auth.register.success", user_id=user.id, email=user.email)
    return SuccessResponse(data=tokens)


@router.post("/login", response_model=SuccessResponse[Token])
async def login(
    payload: UserLogin,
    db: AsyncSession = Depends(get_db),
    redis: redis_async.Redis = Depends(get_redis),
) -> SuccessResponse[Token]:
    result = await db.execute(select(User).where(User.email == payload.email.lower()))
    user = result.scalar_one_or_none()
    if user is None or not verify_password(payload.password, user.hashed_password):
        log.warning("auth.login.failed", email=payload.email)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is disabled",
        )

    tokens = await _issue_pair(user, redis)
    log.info("auth.login.success", user_id=user.id)
    return SuccessResponse(data=tokens)


@router.post("/refresh", response_model=SuccessResponse[AccessTokenResponse])
async def refresh_token(
    payload: TokenRefresh,
    db: AsyncSession = Depends(get_db),
    redis: redis_async.Redis = Depends(get_redis),
) -> SuccessResponse[AccessTokenResponse]:
    data = decode_token(payload.refresh_token, expected_type="refresh")
    jti = data.get("jti")
    sub = data.get("sub")
    if not jti or not sub:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")

    if not await redis.get(REFRESH_KEY.format(jti=jti)):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token revoked")

    user = await db.get(User, int(sub))
    if user is None or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

    access, _, _ = create_access_token(user.id, extra={"email": user.email, "role": user.role})
    return SuccessResponse(
        data=AccessTokenResponse(
            access_token=access,
            expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        )
    )


@router.post("/logout", response_model=SuccessResponse[dict])
async def logout(
    payload: TokenRefresh,
    current_user: User = Depends(get_current_user),
    redis: redis_async.Redis = Depends(get_redis),
) -> SuccessResponse[dict]:
    try:
        data = decode_token(payload.refresh_token, expected_type="refresh")
    except HTTPException:
        # Even if token is invalid, return success — idempotent logout
        return SuccessResponse(data={"logged_out": True})

    jti = data.get("jti")
    if jti:
        await redis.delete(REFRESH_KEY.format(jti=jti))
        ttl = settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60
        await redis.set(BLACKLIST_KEY.format(jti=jti), "1", ex=ttl)
    log.info("auth.logout", user_id=current_user.id)
    return SuccessResponse(data={"logged_out": True})


@router.get("/me", response_model=SuccessResponse[UserResponse])
async def me(current_user: User = Depends(get_current_user)) -> SuccessResponse[UserResponse]:
    return SuccessResponse(data=UserResponse.model_validate(current_user))
