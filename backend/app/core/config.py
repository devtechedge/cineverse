"""Application configuration via Pydantic Settings.

All values are environment-overridable; sensible defaults are provided for
local development. Production must override at minimum:
  * SECRET_KEY
  * DATABASE_URL
  * REDIS_URL
  * FRONTEND_ORIGIN
"""
from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ---- App ----
    APP_NAME: str = "Cineverse"
    APP_ENV: Literal["dev", "staging", "prod", "test"] = "dev"
    DEBUG: bool = True
    API_V1_PREFIX: str = "/api/v1"
    FRONTEND_ORIGIN: str = "http://localhost:3000"

    # ---- Security / JWT ----
    SECRET_KEY: str = "change-me-in-prod-please-this-must-be-a-long-random-string"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 14
    BCRYPT_ROUNDS: int = 12

    # ---- Database ----
    DATABASE_URL: str = (
        "postgresql+asyncpg://cineverse:cineverse@localhost:5432/cineverse"
    )
    DB_POOL_SIZE: int = 20
    DB_MAX_OVERFLOW: int = 10
    DB_ECHO: bool = False

    # ---- Redis ----
    REDIS_URL: str = "redis://localhost:6379/0"

    # ---- Storage ----
    STORAGE_BACKEND: Literal["local", "s3"] = "local"
    STORAGE_ROOT: Path = Path("/data/cineverse")
    S3_BUCKET: str | None = None
    S3_REGION: str | None = None
    S3_ENDPOINT_URL: str | None = None
    S3_ACCESS_KEY: str | None = None
    S3_SECRET_KEY: str | None = None

    # ---- Uploads ----
    MAX_UPLOAD_BYTES: int = 10 * 1024 * 1024 * 1024  # 10 GiB
    CHUNK_SIZE_BYTES: int = 1024 * 1024  # 1 MiB
    ALLOWED_VIDEO_EXTENSIONS: tuple[str, ...] = ("mp4", "mov", "mkv", "webm", "m4v")

    # ---- FFmpeg ----
    FFMPEG_BIN: str = "ffmpeg"
    FFPROBE_BIN: str = "ffprobe"
    HLS_SEGMENT_SECONDS: int = 4
    TRANSCODE_VARIANTS: tuple[str, ...] = ("720p", "1080p")

    # ---- Rate limiting ----
    RATE_LIMIT_LOGIN: str = "5/minute"
    RATE_LIMIT_DEFAULT: str = "60/minute"
    RATE_LIMIT_UPLOAD: str = "200/minute"

    # ---- Sharing ----
    SHARE_TOKEN_TTL_DAYS: int = 7

    # ---- Observability ----
    OTEL_ENABLED: bool = False
    OTEL_EXPORTER_OTLP_ENDPOINT: str = "http://localhost:4318"
    LOG_LEVEL: str = "INFO"
    LOG_JSON: bool = True

    @field_validator("STORAGE_ROOT", mode="before")
    @classmethod
    def _coerce_path(cls, v: str | Path) -> Path:
        return Path(v).expanduser().resolve() if not isinstance(v, Path) else v

    @property
    def is_prod(self) -> bool:
        return self.APP_ENV == "prod"

    @property
    def storage_uploads_dir(self) -> Path:
        return self.STORAGE_ROOT / "uploads"

    @property
    def storage_originals_dir(self) -> Path:
        return self.STORAGE_ROOT / "originals"

    @property
    def storage_hls_dir(self) -> Path:
        return self.STORAGE_ROOT / "hls"

    @property
    def storage_thumbs_dir(self) -> Path:
        return self.STORAGE_ROOT / "thumbnails"

    @property
    def storage_clips_dir(self) -> Path:
        return self.STORAGE_ROOT / "clips"

    def ensure_storage_dirs(self) -> None:
        for d in (
            self.storage_uploads_dir,
            self.storage_originals_dir,
            self.storage_hls_dir,
            self.storage_thumbs_dir,
            self.storage_clips_dir,
        ):
            d.mkdir(parents=True, exist_ok=True)


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
