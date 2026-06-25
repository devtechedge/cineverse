"""Structured JSON logging with correlation IDs."""
from __future__ import annotations

import logging
import sys
import uuid
from contextvars import ContextVar
from logging.handlers import RotatingFileHandler
from pathlib import Path
from typing import Any

import structlog
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from app.core.config import settings

correlation_id_ctx: ContextVar[str] = ContextVar("correlation_id", default="-")


def _add_correlation_id(_, __, event_dict: dict[str, Any]) -> dict[str, Any]:
    event_dict["correlation_id"] = correlation_id_ctx.get()
    return event_dict


def configure_logging(log_dir: Path | None = None) -> None:
    """Configure structlog + stdlib logging once at startup."""
    level = getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO)

    timestamper = structlog.processors.TimeStamper(fmt="iso")

    shared_processors: list[structlog.types.Processor] = [
        structlog.contextvars.merge_contextvars,
        structlog.stdlib.add_log_level,
        structlog.stdlib.add_logger_name,
        _add_correlation_id,
        timestamper,
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
    ]

    structlog.configure(
        processors=shared_processors
        + [
            structlog.stdlib.ProcessorFormatter.wrap_for_formatter,
        ],
        logger_factory=structlog.stdlib.LoggerFactory(),
        wrapper_class=structlog.stdlib.BoundLogger,
        cache_logger_on_first_use=True,
    )

    renderer: structlog.types.Processor = (
        structlog.processors.JSONRenderer()
        if settings.LOG_JSON
        else structlog.dev.ConsoleRenderer(colors=True)
    )

    formatter = structlog.stdlib.ProcessorFormatter(
        foreign_pre_chain=shared_processors,
        processors=[
            structlog.stdlib.ProcessorFormatter.remove_processors_meta,
            renderer,
        ],
    )

    root = logging.getLogger()
    root.setLevel(level)
    root.handlers.clear()

    stream_handler = logging.StreamHandler(sys.stdout)
    stream_handler.setFormatter(formatter)
    root.addHandler(stream_handler)

    if log_dir is not None:
        log_dir.mkdir(parents=True, exist_ok=True)
        file_handler = RotatingFileHandler(
            log_dir / "cineverse.log",
            maxBytes=10 * 1024 * 1024,
            backupCount=5,
            encoding="utf-8",
        )
        file_handler.setFormatter(formatter)
        root.addHandler(file_handler)

    # Quiet noisy libraries
    for noisy in ("uvicorn.access", "sqlalchemy.engine.Engine"):
        logging.getLogger(noisy).setLevel(logging.WARNING)


def get_logger(name: str | None = None) -> structlog.stdlib.BoundLogger:
    return structlog.get_logger(name)


class CorrelationIdMiddleware(BaseHTTPMiddleware):
    """Assign / propagate X-Correlation-ID per request and log request/response."""

    HEADER = "X-Correlation-ID"

    async def dispatch(self, request: Request, call_next):  # type: ignore[override]
        cid = request.headers.get(self.HEADER) or uuid.uuid4().hex
        token = correlation_id_ctx.set(cid)
        logger = get_logger("http")
        try:
            logger.info(
                "request.start",
                method=request.method,
                path=request.url.path,
                client=request.client.host if request.client else None,
            )
            response: Response = await call_next(request)
            response.headers[self.HEADER] = cid
            logger.info(
                "request.end",
                method=request.method,
                path=request.url.path,
                status_code=response.status_code,
            )
            return response
        except Exception as exc:  # noqa: BLE001
            logger.error(
                "request.error",
                method=request.method,
                path=request.url.path,
                error=str(exc),
                exc_info=True,
            )
            raise
        finally:
            correlation_id_ctx.reset(token)
