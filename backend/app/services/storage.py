"""Storage abstraction.

Two implementations:
* LocalStorage — writes to ``settings.STORAGE_ROOT``. Used in dev/tests.
* S3Storage    — boto3-backed; chosen when ``STORAGE_BACKEND=s3``.
"""
from __future__ import annotations

import asyncio
import shutil
from abc import ABC, abstractmethod
from pathlib import Path
from typing import AsyncIterator, BinaryIO

import aiofiles

from app.core.config import settings
from app.core.logging import get_logger

log = get_logger(__name__)


class StorageBackend(ABC):
    @abstractmethod
    async def write_bytes(self, key: str, data: bytes) -> str: ...

    @abstractmethod
    async def append_bytes(self, key: str, data: bytes) -> int: ...

    @abstractmethod
    async def read_bytes(self, key: str) -> bytes: ...

    @abstractmethod
    async def open_read(self, key: str, start: int = 0, end: int | None = None) -> AsyncIterator[bytes]: ...

    @abstractmethod
    async def delete(self, key: str) -> None: ...

    @abstractmethod
    async def exists(self, key: str) -> bool: ...

    @abstractmethod
    async def size(self, key: str) -> int: ...

    @abstractmethod
    def absolute_path(self, key: str) -> Path: ...


class LocalStorage(StorageBackend):
    def __init__(self, root: Path) -> None:
        self.root = root
        self.root.mkdir(parents=True, exist_ok=True)

    def absolute_path(self, key: str) -> Path:
        # Defense against path traversal
        p = (self.root / key).resolve()
        if not str(p).startswith(str(self.root.resolve())):
            raise ValueError(f"Invalid storage key: {key}")
        return p

    async def write_bytes(self, key: str, data: bytes) -> str:
        path = self.absolute_path(key)
        path.parent.mkdir(parents=True, exist_ok=True)
        async with aiofiles.open(path, "wb") as f:
            await f.write(data)
        return str(path)

    async def append_bytes(self, key: str, data: bytes) -> int:
        path = self.absolute_path(key)
        path.parent.mkdir(parents=True, exist_ok=True)
        async with aiofiles.open(path, "ab") as f:
            await f.write(data)
        return path.stat().st_size

    async def read_bytes(self, key: str) -> bytes:
        path = self.absolute_path(key)
        async with aiofiles.open(path, "rb") as f:
            return await f.read()

    async def open_read(self, key: str, start: int = 0, end: int | None = None) -> AsyncIterator[bytes]:
        path = self.absolute_path(key)
        chunk = 64 * 1024

        async def _iter() -> AsyncIterator[bytes]:
            async with aiofiles.open(path, "rb") as f:
                await f.seek(start)
                remaining = (end - start + 1) if end is not None else None
                while True:
                    read_size = chunk if remaining is None else min(chunk, remaining)
                    if read_size <= 0:
                        break
                    data = await f.read(read_size)
                    if not data:
                        break
                    if remaining is not None:
                        remaining -= len(data)
                    yield data

        return _iter()

    async def delete(self, key: str) -> None:
        path = self.absolute_path(key)
        if path.is_dir():
            await asyncio.to_thread(shutil.rmtree, path, ignore_errors=True)
        elif path.exists():
            await asyncio.to_thread(path.unlink, missing_ok=True)

    async def exists(self, key: str) -> bool:
        return self.absolute_path(key).exists()

    async def size(self, key: str) -> int:
        path = self.absolute_path(key)
        return path.stat().st_size if path.exists() else 0

    async def assemble_chunks(self, chunk_dir_key: str, target_key: str) -> Path:
        """Concatenate ``chunk_*`` files in ``chunk_dir_key`` into ``target_key``."""
        chunk_dir = self.absolute_path(chunk_dir_key)
        target = self.absolute_path(target_key)
        target.parent.mkdir(parents=True, exist_ok=True)

        def _do() -> None:
            chunks = sorted(chunk_dir.glob("chunk_*"), key=lambda p: int(p.stem.split("_")[1]))
            with open(target, "wb") as out:
                for c in chunks:
                    with open(c, "rb") as src:
                        shutil.copyfileobj(src, out, length=1024 * 1024)

        await asyncio.to_thread(_do)
        return target

    async def copy_file(self, src: BinaryIO, key: str) -> str:
        path = self.absolute_path(key)
        path.parent.mkdir(parents=True, exist_ok=True)
        await asyncio.to_thread(_copy, src, path)
        return str(path)


def _copy(src: BinaryIO, dest: Path) -> None:
    with open(dest, "wb") as out:
        shutil.copyfileobj(src, out, length=1024 * 1024)


# --- factory --------------------------------------------------------------- #
_storage_singleton: StorageBackend | None = None


def get_storage() -> StorageBackend:
    global _storage_singleton
    if _storage_singleton is not None:
        return _storage_singleton

    if settings.STORAGE_BACKEND == "local":
        settings.ensure_storage_dirs()
        _storage_singleton = LocalStorage(settings.STORAGE_ROOT)
    else:
        # S3 implementation: kept thin to avoid hard dependency in dev.
        _storage_singleton = _build_s3_storage()
    return _storage_singleton


def _build_s3_storage() -> StorageBackend:  # pragma: no cover — exercised only with S3 env
    try:
        import aioboto3  # type: ignore
    except ImportError as exc:
        raise RuntimeError(
            "aioboto3 is required for STORAGE_BACKEND=s3. Install with `pip install aioboto3`."
        ) from exc

    class S3Storage(StorageBackend):
        def __init__(self) -> None:
            self.session = aioboto3.Session(
                aws_access_key_id=settings.S3_ACCESS_KEY,
                aws_secret_access_key=settings.S3_SECRET_KEY,
                region_name=settings.S3_REGION,
            )
            self.bucket = settings.S3_BUCKET
            self.endpoint = settings.S3_ENDPOINT_URL

        def _client(self):
            return self.session.client("s3", endpoint_url=self.endpoint)

        def absolute_path(self, key: str) -> Path:
            return Path(f"s3://{self.bucket}/{key}")

        async def write_bytes(self, key: str, data: bytes) -> str:
            async with self._client() as s3:
                await s3.put_object(Bucket=self.bucket, Key=key, Body=data)
            return f"s3://{self.bucket}/{key}"

        async def append_bytes(self, key: str, data: bytes) -> int:
            existing = b""
            try:
                existing = await self.read_bytes(key)
            except Exception:
                existing = b""
            new_data = existing + data
            await self.write_bytes(key, new_data)
            return len(new_data)

        async def read_bytes(self, key: str) -> bytes:
            async with self._client() as s3:
                obj = await s3.get_object(Bucket=self.bucket, Key=key)
                return await obj["Body"].read()

        async def open_read(self, key: str, start: int = 0, end: int | None = None):
            range_header = f"bytes={start}-{end if end is not None else ''}"

            async def _gen():
                async with self._client() as s3:
                    obj = await s3.get_object(Bucket=self.bucket, Key=key, Range=range_header)
                    async for chunk in obj["Body"]:
                        yield chunk

            return _gen()

        async def delete(self, key: str) -> None:
            async with self._client() as s3:
                await s3.delete_object(Bucket=self.bucket, Key=key)

        async def exists(self, key: str) -> bool:
            try:
                async with self._client() as s3:
                    await s3.head_object(Bucket=self.bucket, Key=key)
                return True
            except Exception:
                return False

        async def size(self, key: str) -> int:
            async with self._client() as s3:
                obj = await s3.head_object(Bucket=self.bucket, Key=key)
                return int(obj["ContentLength"])

    return S3Storage()
