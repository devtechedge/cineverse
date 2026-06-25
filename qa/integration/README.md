# Integration tests

Backend integration tests live alongside unit tests in `backend/tests/` using
the `auth_client` fixture, which exercises the full HTTP layer via FastAPI's
ASGI transport.

For tests requiring real PostgreSQL + ffmpeg, run them inside Docker:

```bash
docker compose -f devops/docker/docker-compose.yml run --rm app pytest -q tests
```
