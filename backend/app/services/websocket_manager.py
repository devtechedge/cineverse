"""WebSocket connection manager for upload-progress broadcasts."""
from __future__ import annotations

import asyncio
from collections import defaultdict
from typing import Any

from fastapi import WebSocket

from app.core.logging import get_logger

log = get_logger(__name__)


class ConnectionManager:
    """Tracks active WebSocket connections keyed by ``upload_id``.

    Multiple tabs may subscribe to a single upload (e.g. mobile + desktop),
    so each key maps to a *set* of sockets.
    """

    def __init__(self) -> None:
        self._connections: dict[str, set[WebSocket]] = defaultdict(set)
        self._lock = asyncio.Lock()

    async def connect(self, upload_id: str, ws: WebSocket) -> None:
        await ws.accept()
        async with self._lock:
            self._connections[upload_id].add(ws)
        log.info("ws.connect", upload_id=upload_id, total=len(self._connections[upload_id]))

    async def disconnect(self, upload_id: str, ws: WebSocket) -> None:
        async with self._lock:
            self._connections[upload_id].discard(ws)
            if not self._connections[upload_id]:
                self._connections.pop(upload_id, None)
        log.info("ws.disconnect", upload_id=upload_id)

    async def broadcast(self, upload_id: str, message: dict[str, Any]) -> None:
        async with self._lock:
            targets = list(self._connections.get(upload_id, ()))
        if not targets:
            return
        dead: list[WebSocket] = []
        for ws in targets:
            try:
                await ws.send_json(message)
            except Exception as exc:  # noqa: BLE001
                log.warning("ws.send_failed", upload_id=upload_id, error=str(exc))
                dead.append(ws)
        if dead:
            async with self._lock:
                for ws in dead:
                    self._connections[upload_id].discard(ws)

    def active_count(self) -> int:
        return sum(len(s) for s in self._connections.values())


manager = ConnectionManager()
