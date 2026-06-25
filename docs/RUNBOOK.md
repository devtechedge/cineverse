# Cineverse — Runbook

## 1. Run locally

```bash
cd Cineverse
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local

docker compose -f devops/docker/docker-compose.yml up -d --build
# wait for healthy
docker compose -f devops/docker/docker-compose.yml exec app alembic upgrade head
```

Then open:
- App: <http://localhost> (nginx → Next.js + FastAPI)
- API docs: <http://localhost/docs>
- Prometheus: <http://localhost:9090>
- Grafana: <http://localhost:3001> (`admin` / `cineverse`)

Dev mode (no Docker):

```bash
# backend
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload

# frontend
cd ../frontend
npm install
npm run dev
```

## 2. Deploy

GitHub Actions handles build + push to GHCR on every `main` commit, then SSHes
into the configured VPS and runs `docker compose pull && up -d && alembic upgrade head`.

Required GitHub secrets:
- `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY`
- (Optional) `GHCR_TOKEN` for private registries.

VPS one-time bootstrap:

```bash
sudo apt-get install -y docker.io docker-compose-plugin
git clone https://github.com/<you>/cineverse.git /opt/cineverse
cd /opt/cineverse
cp backend/.env.example backend/.env  # then edit secrets
docker compose -f devops/docker/docker-compose.yml up -d
```

## 3. Debugging upload failures

Symptoms → first checks:

| Symptom | Investigate |
|---------|-------------|
| Upload stuck at 0% | Browser devtools → POST `/videos/chunk` returning 4xx? Check JWT validity. |
| WebSocket never opens | nginx upgrade headers (`devops/nginx/nginx.conf`), CORS, server logs `ws.connect`. |
| Stalls at "Processing" | `docker compose logs app | grep video.process` — ffmpeg stderr is logged. |
| `ffmpeg: not found` | Rebuild backend image; Dockerfile installs ffmpeg via apt. |
| `permission denied` writing to /data | Check the `media` volume mount is writable by uid 1000. |
| Transcode produced no master.m3u8 | Source resolution might be exotic. Inspect `storage_hls_dir/<id>/`. |

Useful commands:

```bash
docker compose logs -f app | grep -i upload
docker compose exec app ls -la /data/cineverse/originals
docker compose exec app ffprobe /data/cineverse/originals/<id>.mp4
docker compose exec redis redis-cli keys 'upload:*'
```

## 4. Horizontal scaling

1. Set `STORAGE_BACKEND=s3` and configure `S3_*` env vars. Backend instances
   become stateless.
2. Move the ffmpeg pipeline into a dedicated `worker` service (Celery / RQ /
   arq) consuming a Redis queue; the API just enqueues jobs.
3. Run multiple `app` replicas behind nginx (`upstream backend { server app:8000; }`
   → add more entries or use Docker Swarm/Kubernetes).
4. Add a Redis-backed slowapi storage (already configured) so rate limits are
   shared across replicas.
5. Use PostgreSQL connection pooler (PgBouncer transaction mode) when the
   number of replicas × `DB_POOL_SIZE` approaches Postgres `max_connections`.

## 5. Common operational tasks

| Task | Command |
|------|---------|
| Create migration | `cd backend && alembic revision --autogenerate -m "msg"` |
| Apply migrations | `alembic upgrade head` |
| Rollback last | `alembic downgrade -1` |
| Shell into backend | `docker compose exec app bash` |
| Tail JSON logs | `docker compose logs -f app | jq -R 'fromjson? // .'` |
| Reset dev DB | `docker compose down -v && docker compose up -d` |
