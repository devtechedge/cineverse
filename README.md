# 🎬 Cineverse

> **Your moments, framed.** A personal 4K video archive, journal, and streaming platform.

### 🌐 **[Live demo →](https://cineverse-fawn-two.vercel.app/)** &nbsp;·&nbsp; [Deploy your own ▲](https://vercel.com/new/clone?repository-url=https://github.com/devtechedge/cineverse&root-directory=frontend&env=NEXT_PUBLIC_MOCK_MODE&envDescription=Set%20to%20true%20for%20demo%20mode&project-name=cineverse&repository-name=cineverse)

![Next.js](https://img.shields.io/badge/Next.js-14-black?style=flat-square&logo=next.js) ![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?style=flat-square&logo=typescript&logoColor=white) ![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?style=flat-square&logo=fastapi&logoColor=white) ![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-336791?style=flat-square&logo=postgresql&logoColor=white) ![Redis](https://img.shields.io/badge/Redis-7-DC382D?style=flat-square&logo=redis&logoColor=white) ![ffmpeg](https://img.shields.io/badge/ffmpeg-HLS-5C5C5C?style=flat-square&logo=ffmpeg&logoColor=white) ![Docker](https://img.shields.io/badge/Docker-compose-2496ED?style=flat-square&logo=docker&logoColor=white) ![Vercel](https://img.shields.io/badge/Vercel-deployed-000000?style=flat-square&logo=vercel&logoColor=white) ![License](https://img.shields.io/badge/license-MIT-blue?style=flat-square)

> 🟢 **The Vercel demo runs the full Next.js frontend with seeded mock data.**
> The complete production stack — FastAPI + PostgreSQL + Redis + ffmpeg + nginx + Prometheus — ships in this repo's [`/backend`](backend) and runs end-to-end via `docker compose`.

---

## ✨ What it does

Cineverse is a personal media platform that lets you upload, archive, annotate, clip, and share your own 4K video — a cinematic alternative to "everything in a camera roll."

- **Resumable chunked uploads** with live WebSocket progress and ffmpeg HLS transcoding (720p / 1080p)
- **Cinematic homepage**: full-viewport scroll-snap with Framer Motion parallax and per-section background video
- **Custom video player** with HLS support, journal-entry timeline markers, two-handle clip trimmer, and J/K/L/Space/Arrow keyboard shortcuts
- **Timestamped journal** using TipTap rich-text — tie a thought to an exact moment, search across all entries with PostgreSQL full-text search
- **One-click clips** with expiring share tokens (256-bit, view-counted, public access without auth)
- **Library** with debounced search, tag filters, has-journal filter, and infinite scroll
- **Full observability**: structured JSON logs with correlation IDs, Prometheus RED metrics, Grafana dashboards, alert rules, OpenTelemetry tracing
- **Production ops**: multi-stage Docker images, nginx reverse proxy (range requests, gzip, rate-limit, SSL template), GitHub Actions CI/CD

---

## 🧱 Architecture

```
Next.js 14 (App Router) ──HTTPS──▶ nginx (TLS, range, gzip, rate-limit)
                                          ├── /api → FastAPI (async, JWT)
                                          ├── /ws  → WebSocket upload progress
                                          └── /    → SSR pages
FastAPI ──asyncpg──▶ PostgreSQL 15  (FTS on journal, ENUM video_status, GIN indexes)
FastAPI ──redis ──▶ Redis 7         (refresh tokens, upload meta, rate-limit, ws pubsub)
FastAPI ──subprocess─▶ ffmpeg       (HLS 720p/1080p, thumbnails, clip trims)
```

Full diagrams, ERD, security model, and tech-stack justification in [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

---

## 🗂️ Repository layout

```
cineverse/
├── frontend/         # Next.js 14 · TypeScript (strict) · Tailwind · Framer Motion · TanStack Query · Zustand
├── backend/          # FastAPI · SQLAlchemy 2.0 async · Alembic · structlog · Prometheus client
├── database/         # Seeds, SQL migration helpers
├── devops/           # Dockerfiles, docker-compose, nginx config
├── observability/    # Prometheus scrape config, Grafana dashboards, alert rules
├── qa/               # unit · integration · e2e (Playwright) · load (k6) tests
├── docs/             # ARCHITECTURE · DESIGN_SYSTEM · API_SPEC · RUNBOOK · DEPLOY_VERCEL
└── .github/workflows # CI (lint, type-check, test, build) · CD (GHCR + SSH deploy)
```

---

## 🚀 Try it three ways

### 1. Live demo (zero install)

Just click **[cineverse-fawn-two.vercel.app](https://cineverse-fawn-two.vercel.app/)** — the frontend is seeded with 6 sample videos, journal entries, and tags.

### 2. Run the demo locally

```bash
git clone https://github.com/devtechedge/cineverse.git
cd cineverse/frontend
echo "NEXT_PUBLIC_MOCK_MODE=true" > .env.local
npm install
npm run dev
# → http://localhost:3000
```

### 3. Run the full production stack

```bash
git clone https://github.com/devtechedge/cineverse.git
cd cineverse
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
docker compose -f devops/docker/docker-compose.yml up -d --build
docker compose -f devops/docker/docker-compose.yml exec app alembic upgrade head
# → http://localhost (full stack: FastAPI + Postgres + Redis + ffmpeg + nginx + Prometheus + Grafana)
```

See [`docs/RUNBOOK.md`](docs/RUNBOOK.md) for operational details, scaling, and debugging.

---

## 🧪 Testing

```bash
# Backend — pytest with TestContainers-style fixtures (httpx ASGI transport + fake Redis)
cd backend && pip install -r requirements.txt && pytest -q
# → 9 passed (auth, videos, journal, clips end-to-end flows)

# Frontend — Vitest + React Testing Library
cd frontend && npm install && npm test
# → 8 passed (auth store, video player, utilities)

# E2E — Playwright across Chromium, Firefox, WebKit, iPhone 14, iPad
cd frontend && npm run test:e2e

# Load — k6 (100 concurrent streamers · 20 concurrent 100MB uploads)
k6 run qa/load/k6-stream.js
```

CI runs everything on every PR — see [`.github/workflows/ci.yml`](.github/workflows/ci.yml).

---

## 🔐 Security model

- **Auth**: OAuth2 password flow → JWT HS256, access 30 min + refresh 14 d, refresh-token rotation tracked in Redis with logout blacklist
- **Passwords**: bcrypt, work factor 12
- **Rate limiting**: slowapi backed by Redis — 5/min login, 200/min chunk uploads, 60/min default
- **Headers**: HSTS, X-Frame-Options DENY, X-Content-Type-Options nosniff, strict Referrer-Policy
- **CORS**: explicit allowlist (`FRONTEND_ORIGIN`)
- **Uploads**: server-side enforced size/format limits, path-traversal guards on storage abstraction
- **Streaming**: per-user auth on every range request; share tokens are 256-bit URL-safe with expiry + view counter

---

## 📈 Observability

- `/metrics` exposes RED metrics (Rate, Errors, Duration) plus custom business counters (`video_uploads_total`, `video_processing_duration_seconds`, `active_websocket_connections`, `db_query_duration_seconds`)
- Two pre-built Grafana dashboards live in [`observability/grafana/dashboards/`](observability/grafana/dashboards)
- Four alert rules in [`observability/alerting/rules.yml`](observability/alerting/rules.yml): error rate > 5%, upload backlog, DB exhaustion, p95 latency > 1s
- Structured JSON logging via structlog with per-request correlation IDs, ready to ship to Loki / CloudWatch / Datadog

---

## 📐 Design system

Dark cinematic theme — `#0a0a0a` background, `#1a1a1a` surfaces, `#e50914` accent.
Typography: **Inter** for body, **Bebas Neue** for cinematic headings, **JetBrains Mono** for timecodes.
Full token inventory, motion specs, component inventory, and accessibility notes: [`docs/DESIGN_SYSTEM.md`](docs/DESIGN_SYSTEM.md).

---

## 📄 License

MIT © Cineverse contributors
