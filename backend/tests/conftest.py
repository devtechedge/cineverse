"""Pytest configuration: in-memory SQLite + fakeredis-style overrides."""
from __future__ import annotations

import asyncio
import os
import tempfile
from pathlib import Path
from typing import AsyncIterator

import pytest
import pytest_asyncio

# Force test config BEFORE app imports
os.environ.setdefault("APP_ENV", "test")
os.environ.setdefault("DATABASE_URL", "sqlite+aiosqlite:///:memory:")
os.environ.setdefault("REDIS_URL", "redis://localhost:6379/15")
os.environ.setdefault("SECRET_KEY", "test-secret-key-very-long-and-random")
os.environ.setdefault("STORAGE_ROOT", tempfile.mkdtemp(prefix="cv-test-"))
os.environ.setdefault("LOG_JSON", "false")

from httpx import ASGITransport, AsyncClient  # noqa: E402

from app.core import deps  # noqa: E402
from app.core.config import settings  # noqa: E402
from app.core.db import Base  # noqa: E402
from app.main import app  # noqa: E402


# ----------------------- in-memory async sqlite ----------------------------- #
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine  # noqa: E402

# Use a single shared in-memory DB across the test session
TEST_DB_URL = "sqlite+aiosqlite:///./test_cineverse.db"

test_engine = create_async_engine(TEST_DB_URL, echo=False, future=True)
TestSessionLocal = async_sessionmaker(test_engine, expire_on_commit=False, class_=AsyncSession)


# ----------------------- fake Redis ----------------------------------------- #
class FakeRedis:
    """Minimal async Redis stand-in covering only what the app uses."""

    def __init__(self) -> None:
        self.kv: dict[str, str] = {}
        self.hashes: dict[str, dict[str, str]] = {}

    async def ping(self) -> bool:
        return True

    async def get(self, key: str):
        return self.kv.get(key)

    async def set(self, key: str, value, ex: int | None = None):
        self.kv[key] = str(value)
        return True

    async def delete(self, *keys):
        for k in keys:
            self.kv.pop(k, None)
            self.hashes.pop(k, None)
        return len(keys)

    async def hset(self, key: str, *args, mapping: dict[str, str] | None = None, **kwargs):
        self.hashes.setdefault(key, {})
        if mapping:
            for k, v in mapping.items():
                self.hashes[key][k] = str(v)
        if args:
            # hset(key, field, value)
            if len(args) >= 2:
                self.hashes[key][str(args[0])] = str(args[1])
        for k, v in kwargs.items():
            self.hashes[key][k] = str(v)
        return 1

    async def hgetall(self, key: str):
        return dict(self.hashes.get(key, {}))

    async def expire(self, key: str, ttl: int) -> bool:
        return True

    async def aclose(self) -> None:
        return None


_fake_redis = FakeRedis()


# ----------------------- fixtures ------------------------------------------- #
@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture(scope="session", autouse=True)
async def _create_schema():
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await test_engine.dispose()
    # cleanup db file
    p = Path("./test_cineverse.db")
    if p.exists():
        p.unlink(missing_ok=True)


@pytest_asyncio.fixture()
async def db_session() -> AsyncIterator[AsyncSession]:
    async with TestSessionLocal() as session:
        yield session


@pytest_asyncio.fixture()
async def client() -> AsyncIterator[AsyncClient]:
    async def _get_db():
        async with TestSessionLocal() as s:
            try:
                yield s
                await s.commit()
            except Exception:
                await s.rollback()
                raise

    async def _get_redis():
        return _fake_redis

    app.dependency_overrides[deps.get_db] = _get_db
    app.dependency_overrides[deps.get_redis] = _get_redis

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

    app.dependency_overrides.clear()


@pytest_asyncio.fixture()
async def auth_client(client: AsyncClient) -> AsyncClient:
    """Registers a fresh user and attaches the access token to the client."""
    payload = {
        "email": f"user{os.urandom(3).hex()}@cineverse.example",
        "password": "secret-password-1",
        "full_name": "Test User",
    }
    r = await client.post("/api/v1/auth/register", json=payload)
    assert r.status_code == 201, r.text
    token = r.json()["data"]["access_token"]
    client.headers["Authorization"] = f"Bearer {token}"
    return client
