# 🎬 Cineverse

> **Your moments, framed.** A personal 4K video archive, journal, and streaming platform.

### 🌐 [Live demo →](https://cineverse-yourname.vercel.app) &nbsp;·&nbsp; [Deploy your own ▲](https://vercel.com/new/clone?repository-url=https://github.com/YOUR-USERNAME/cineverse&root-directory=frontend&env=NEXT_PUBLIC_MOCK_MODE&envDescription=Set%20to%20true%20for%20demo%20mode&project-name=cineverse&repository-name=cineverse)

![tech](https://img.shields.io/badge/Next.js-14-black) ![tech](https://img.shields.io/badge/FastAPI-0.115-009688) ![tech](https://img.shields.io/badge/PostgreSQL-15-336791) ![tech](https://img.shields.io/badge/Redis-7-DC382D) ![tech](https://img.shields.io/badge/ffmpeg-HLS-5C5C5C) ![tech](https://img.shields.io/badge/Docker-compose-2496ED) ![tech](https://img.shields.io/badge/Vercel-deployed-000000) ![license](https://img.shields.io/badge/license-MIT-blue)

> 🟢 **The Vercel demo runs the full Next.js frontend with seeded mock data.**
> The complete production stack (FastAPI + Postgres + Redis + ffmpeg + nginx + Prometheus) lives in [`/backend`](backend) and runs via `docker compose`.
> See [`docs/DEPLOY_VERCEL.md`](docs/DEPLOY_VERCEL.md) for the demo and [`docs/RUNBOOK.md`](docs/RUNBOOK.md) for the full stack.

Cineverse is a portfolio-grade, end-to-end full-stack platform that lets a single user upload, archive, annotate, clip, and share 4K video. It pairs a cinematic Next.js front-end with an async FastAPI back-end and a complete observability + DevOps story.

## ✨ Features

- **Resumable chunked uploads** with live WebSocket progress and ffmpeg HLS transcoding
- **Cinematic homepage**: full-viewport scrolling video sections with Framer Motion parallax
- **Custom 4K-ready video player** with timeline journal markers, clip trimmer, keyboard shortcuts
- **Timestamped journal** (TipTap rich text, PostgreSQL full-text search)
- **Clip creation + expiring share tokens**
- **Library** with debounced search, tag/journal filters, infinite scroll
- **Production observability** — Prometheus metrics, Grafana dashboards, alerting rules, OpenTelemetry tracing, structured JSON logs with correlation IDs
- **Docker + nginx + GitHub Actions CI/CD** out of the box

## 🧱 Architecture

```
Next.js 14 (App Router) ──HTTPS──▶ nginx (TLS, range, gzip, rate-limit)
                                          ├── /api → FastAPI (async, JWT)
                                          ├── /ws  → WebSocket upload progress
                                          └── /    → SSR pages
FastAPI ──asyncpg──▶ PostgreSQL 15  (FTS on journal, ENUM video_status)
FastAPI ──redis──▶ Redis 7          (refresh tokens, upload meta, rate-limit)
FastAPI ──subprocess──▶ ffmpeg      (HLS 720p/1080p, thumbnails, clips)
```

Full diagrams: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## 🗂️ Repository layout

```
Cineverse/
├── frontend/         # Next.js 14 · TypeScript · Tailwind · Framer Motion · TanStack Query
├── backend/          # FastAPI · SQLAlchemy 2.0 async · Alembic · structlog
├── database/         # Seeds, migration history
├── devops/           # Dockerfiles · docker-compose · nginx
├── observability/    # Prometheus · Grafana dashboards · alert rules
├── qa/               # unit · integration · e2e (Playwright) · load (k6)
├── docs/             # ARCHITECTURE · DESIGN_SYSTEM · API_SPEC · RUNBOOK
└── .github/workflows # CI + CD pipelines
```

## 🚀 Quick start

```bash
git clone <this-repo> cineverse && cd cineverse
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
docker compose -f devops/docker/docker-compose.yml up -d --build
docker compose -f devops/docker/docker-compose.yml exec app alembic upgrade head
```

Open <http://localhost>. Full runbook: [`docs/RUNBOOK.md`](docs/RUNBOOK.md).

## 🧪 Testing

```bash
# Backend (unit + integration)
cd backend && pip install -r requirements.txt && pytest -q

# Frontend (unit)
cd frontend && npm install && npm test

# E2E (Playwright)
cd frontend && npm run test:e2e

# Load (k6)
k6 run qa/load/k6-stream.js
```

CI runs everything on every PR (`.github/workflows/ci.yml`).

## 📐 Design system

Dark cinematic theme — `#0a0a0a` background, `#1a1a1a` surfaces, `#e50914` accent.
Typography: **Inter** for body, **Bebas Neue** for cinematic headings.
Full token inventory: [`docs/DESIGN_SYSTEM.md`](docs/DESIGN_SYSTEM.md).

## 🔐 Security model

- Bcrypt password hashing (rounds=12), JWT access (30 min) + refresh (14 d)
- Refresh-token rotation via Redis with logout blacklisting
- slowapi rate limits (5/min login, 200/min chunk uploads)
- Strict CORS allowlist, security headers (HSTS, X-Frame-Options, CSP-ready)
- Range-aware streaming endpoint with per-user authorization
- Share tokens: 256-bit URL-safe, expiry-based, view counter

## 📈 Observability

- `/metrics` exposes RED metrics + custom counters (`video_uploads_total`, `video_processing_duration_seconds`, `active_websocket_connections`, `db_query_duration_seconds`).
- Grafana dashboards under [`observability/grafana/dashboards`](observability/grafana/dashboards).
- Alerts in [`observability/alerting/rules.yml`](observability/alerting/rules.yml).

## 📄 License

MIT © Cineverse contributors
