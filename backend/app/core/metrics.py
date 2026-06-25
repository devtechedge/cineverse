"""Prometheus metrics + middleware."""
from __future__ import annotations

import time

from prometheus_client import (
    CONTENT_TYPE_LATEST,
    CollectorRegistry,
    Counter,
    Gauge,
    Histogram,
    generate_latest,
)
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

registry = CollectorRegistry(auto_describe=True)

http_request_duration_seconds = Histogram(
    "http_request_duration_seconds",
    "HTTP request latency",
    labelnames=("method", "endpoint", "status"),
    buckets=(0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10),
    registry=registry,
)
http_requests_total = Counter(
    "http_requests_total",
    "Total HTTP requests",
    labelnames=("method", "endpoint", "status"),
    registry=registry,
)
video_uploads_total = Counter(
    "video_uploads_total",
    "Video upload outcomes",
    labelnames=("status",),
    registry=registry,
)
video_processing_duration_seconds = Histogram(
    "video_processing_duration_seconds",
    "Time spent in ffmpeg pipeline",
    buckets=(1, 5, 15, 30, 60, 120, 300, 600, 1800),
    registry=registry,
)
active_websocket_connections = Gauge(
    "active_websocket_connections",
    "Currently open WebSockets",
    registry=registry,
)
db_query_duration_seconds = Histogram(
    "db_query_duration_seconds",
    "Database query latency",
    labelnames=("operation",),
    buckets=(0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5),
    registry=registry,
)


class PrometheusMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):  # type: ignore[override]
        start = time.perf_counter()
        response: Response | None = None
        status_code = 500
        try:
            response = await call_next(request)
            status_code = response.status_code
            return response
        finally:
            elapsed = time.perf_counter() - start
            # Use route template (e.g. /videos/{id}) when available
            route = request.scope.get("route")
            endpoint = getattr(route, "path", request.url.path) if route else request.url.path
            method = request.method
            status_label = str(status_code)
            http_request_duration_seconds.labels(method, endpoint, status_label).observe(elapsed)
            http_requests_total.labels(method, endpoint, status_label).inc()


def metrics_response() -> Response:
    return Response(generate_latest(registry), media_type=CONTENT_TYPE_LATEST)
