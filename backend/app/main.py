"""FastAPI application entrypoint."""
from __future__ import annotations

from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.api import auth as auth_router
from app.api import clips as clips_router
from app.api import journal as journal_router
from app.api import videos as videos_router
from app.core.config import settings
from app.core.deps import close_redis, get_redis, limiter
from app.core.logging import CorrelationIdMiddleware, configure_logging, get_logger
from app.core.metrics import PrometheusMiddleware, metrics_response

log = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    configure_logging(Path("logs") if not settings.is_prod else Path("/var/log/cineverse"))
    settings.ensure_storage_dirs()
    log.info("app.startup", env=settings.APP_ENV, version="1.0.0")

    # Warm Redis connection
    try:
        redis = await get_redis()
        await redis.ping()
        log.info("redis.connected")
    except Exception as exc:  # noqa: BLE001
        log.warning("redis.connect_failed", error=str(exc))

    # Optional OpenTelemetry
    if settings.OTEL_ENABLED:
        try:
            from opentelemetry import trace
            from opentelemetry.exporter.otlp.proto.http.trace_exporter import (
                OTLPSpanExporter,
            )
            from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
            from opentelemetry.sdk.resources import Resource
            from opentelemetry.sdk.trace import TracerProvider
            from opentelemetry.sdk.trace.export import BatchSpanProcessor

            resource = Resource.create({"service.name": settings.APP_NAME})
            provider = TracerProvider(resource=resource)
            provider.add_span_processor(
                BatchSpanProcessor(OTLPSpanExporter(endpoint=settings.OTEL_EXPORTER_OTLP_ENDPOINT))
            )
            trace.set_tracer_provider(provider)
            FastAPIInstrumentor.instrument_app(app)
            log.info("otel.enabled")
        except Exception as exc:  # noqa: BLE001
            log.warning("otel.init_failed", error=str(exc))

    yield

    await close_redis()
    log.info("app.shutdown")


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.APP_NAME,
        version="1.0.0",
        description="Personal 4K video archive, journal and streaming platform.",
        openapi_url=f"{settings.API_V1_PREFIX}/openapi.json",
        docs_url="/docs",
        redoc_url="/redoc",
        lifespan=lifespan,
    )

    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

    # ---- Middleware (order matters: outer → inner) ----
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[settings.FRONTEND_ORIGIN, "http://localhost:3000"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["X-Correlation-ID"],
    )
    app.add_middleware(CorrelationIdMiddleware)
    app.add_middleware(PrometheusMiddleware)

    # ---- Routers ----
    app.include_router(auth_router.router, prefix=settings.API_V1_PREFIX)
    app.include_router(videos_router.router, prefix=settings.API_V1_PREFIX)
    app.include_router(journal_router.router, prefix=settings.API_V1_PREFIX)
    app.include_router(clips_router.router, prefix=settings.API_V1_PREFIX)

    # ---- Health & metrics ----
    @app.get("/health", tags=["meta"])
    async def health() -> dict[str, str]:
        return {"status": "ok", "env": settings.APP_ENV}

    @app.get("/metrics", tags=["meta"], include_in_schema=False)
    async def metrics():
        return metrics_response()

    # ---- Exception handlers ----
    @app.exception_handler(StarletteHTTPException)
    async def http_exc_handler(_: Request, exc: StarletteHTTPException) -> JSONResponse:
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "success": False,
                "data": None,
                "error": {"code": _code_for(exc.status_code), "message": str(exc.detail)},
            },
        )

    @app.exception_handler(RequestValidationError)
    async def validation_handler(_: Request, exc: RequestValidationError) -> JSONResponse:
        # exc.errors() can contain non-JSON-serialisable values (e.g. exceptions
        # raised inside @model_validator); coerce them via jsonable_encoder.
        from fastapi.encoders import jsonable_encoder

        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={
                "success": False,
                "data": None,
                "error": {
                    "code": "VALIDATION_ERROR",
                    "message": "Request validation failed",
                    "details": jsonable_encoder(exc.errors()),
                },
            },
        )

    @app.exception_handler(Exception)
    async def unhandled_handler(request: Request, exc: Exception) -> JSONResponse:
        log.error("unhandled_exception", path=request.url.path, error=str(exc), exc_info=True)
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "success": False,
                "data": None,
                "error": {"code": "INTERNAL_ERROR", "message": "An internal error occurred"},
            },
        )

    return app


def _code_for(status_code: int) -> str:
    return {
        400: "BAD_REQUEST",
        401: "UNAUTHORIZED",
        403: "FORBIDDEN",
        404: "NOT_FOUND",
        409: "CONFLICT",
        410: "GONE",
        413: "PAYLOAD_TOO_LARGE",
        415: "UNSUPPORTED_MEDIA_TYPE",
        422: "VALIDATION_ERROR",
        429: "RATE_LIMITED",
        500: "INTERNAL_ERROR",
        501: "NOT_IMPLEMENTED",
    }.get(status_code, "ERROR")


app = create_app()
