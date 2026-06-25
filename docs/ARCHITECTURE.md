# Cineverse — System Architecture

> Personal 4K video archive, journal, and streaming platform.

---

## 1. High-Level Architecture

```
                                  ┌──────────────────────────┐
                                  │      Browser Client      │
                                  │  Next.js 14 (App Router) │
                                  │  TS · Tailwind · Framer  │
                                  └────────────┬─────────────┘
                                               │ HTTPS / WSS
                              ┌────────────────┴──────────────────┐
                              │             nginx                 │
                              │ (TLS, gzip, range, rate-limit)    │
                              └───────┬──────────────┬────────────┘
                                      │              │
                            /api/* ───┘              └─── /          (static)
                                      │
                              ┌───────▼────────┐
                              │   FastAPI app  │  uvicorn workers
                              │ (async, JWT,   │  ───────────────
                              │  OpenTelemetry)│  REST + WebSockets
                              └─┬────┬──────┬──┘
                                │    │      │
              ┌─────────────────┘    │      └─────────────────────┐
              │                      │                            │
        ┌─────▼─────┐         ┌──────▼──────┐              ┌──────▼─────┐
        │ PostgreSQL│         │   Redis     │              │  Storage   │
        │ 15 (async │         │ (sessions,  │              │  local FS  │
        │  asyncpg) │         │  ratelimit, │              │  or S3     │
        └───────────┘         │  ws pubsub) │              └─────┬──────┘
                              └─────────────┘                    │
                                                                 │
                                                          ┌──────▼──────┐
                                                          │   ffmpeg    │
                                                          │ workers     │
                                                          │ (HLS/DASH,  │
                                                          │  thumbnails)│
                                                          └─────────────┘
```

### 1.1 Upload Flow (Resumable, Chunked)

```
Client                          API                          Storage          Redis
  │   POST /videos/init          │                              │               │
  ├──────────────────────────────►│                              │               │
  │           upload_id           │   create temp dir            │               │
  │◄──────────────────────────────┤                              │               │
  │                               │                              │               │
  │   open WS /ws/upload/{id}     │                              │               │
  ├──────────────────────────────►│                              │               │
  │                               │                              │               │
  │  POST /videos/chunk/{id}      │                              │               │
  ├──────────────────────────────►│  append chunk to temp/{id}/  │               │
  │                               ├──────────────────────────────►│              │
  │                               │  publish progress             │               │
  │                               ├───────────────────────────────────────────────►│
  │   WS ← {"pct": 42}            │                              │               │
  │◄──────────────────────────────┤                              │               │
  │                               │                              │               │
  │  POST /videos/finalize/{id}   │                              │               │
  ├──────────────────────────────►│  assemble → /storage/orig/   │               │
  │                               │  enqueue ffmpeg job          │               │
  │      {video_id, "processing"} │                              │               │
  │◄──────────────────────────────┤                              │               │
```

### 1.2 Processing Pipeline

```
ffmpeg_service
  │── probe metadata (duration, resolution, fps)
  │── extract thumbnail @ 10% mark
  │── transcode → 720p HLS  (h264, aac, 4s segments)
  │── transcode → 1080p HLS (h264, aac, 4s segments)
  │── write master.m3u8
  └── UPDATE videos SET status='ready', duration=..., thumbnail_path=...
```

### 1.3 Streaming Flow

```
Client <video src="/api/v1/videos/{id}/stream">
       │
       ▼
   nginx range request (bytes=N-M)
       │
       ▼
   FastAPI StreamingResponse (chunked, accept-ranges: bytes)
       │
       ▼
   /storage/hls/{video_id}/master.m3u8 → segment_000.ts, segment_001.ts, ...
```

---

## 2. Tech Stack Justification

| Layer | Choice | Why |
|------|--------|-----|
| Frontend framework | **Next.js 14 App Router** | RSC + streaming SSR, file-based routing, mature TS support, easy static export for nginx. |
| Language | **TypeScript (strict)** | Type safety across the boundary; catches API drift early. |
| Styling | **Tailwind CSS** | Utility-first, zero-runtime, design-token friendly for cinematic theme. |
| Animation | **Framer Motion** | Declarative scroll-linked animations, `useScroll`/`useTransform` ideal for hero. |
| Data fetching | **React Query (TanStack)** | Cache, retries, background refetch, infinite scroll for library. |
| State | **Zustand** | Minimal, no boilerplate, perfect for auth + upload progress slices. |
| Backend framework | **FastAPI** | Async-native, Pydantic v2 validation, automatic OpenAPI. |
| ORM | **SQLAlchemy 2.0 async** | First-class async, mature, plays nicely with Alembic. |
| Database | **PostgreSQL 15** | JSONB, full-text `tsvector`, GIN indexes, mature replication. |
| Cache / pubsub | **Redis 7** | Token blacklist, rate-limit counters, WS broadcast channel. |
| Media | **ffmpeg** | De-facto standard; HLS + thumbnail in one toolchain. |
| Reverse proxy | **nginx** | Range requests, gzip, TLS termination, static serving. |
| Container orchestration | **docker-compose** | Single-host portfolio deploy; cleanly scales to k8s manifests later. |
| Observability | **Prometheus + Grafana + OTel** | Industry standard RED/USE metrics, vendor-neutral tracing. |
| Logging | **structlog (JSON)** | Correlation IDs, ship-to-Loki/CloudWatch ready. |
| Tests | **Pytest, Vitest, Playwright, k6** | Unit / component / E2E / load — full pyramid. |

---

## 3. Data Model (ERD)

```
┌──────────────┐ 1      ∞ ┌──────────────┐ 1      ∞ ┌──────────────────┐
│    users     │──────────│    videos    │──────────│ journal_entries  │
├──────────────┤          ├──────────────┤          ├──────────────────┤
│ id PK        │          │ id PK        │          │ id PK            │
│ email UQ     │          │ user_id FK   │          │ video_id FK      │
│ hashed_pw    │          │ title        │          │ user_id FK       │
│ full_name    │          │ description  │          │ ts_seconds       │
│ is_active    │          │ original_path│          │ content (JSONB)  │
│ created_at   │          │ status       │          │ content_text     │ ← tsvector idx
│ updated_at   │          │ duration     │          │ created_at       │
└──────────────┘          │ resolution   │          │ updated_at       │
                          │ thumbnail    │          └──────────────────┘
                          │ created_at   │
                          │ deleted_at   │ 1     ∞ ┌──────────────────┐
                          └──────┬───────┘────────│   video_tags     │
                                 │                ├──────────────────┤
                                 │                │ id PK            │
                                 │                │ video_id FK      │
                                 │                │ tag_name         │
                                 │                └──────────────────┘
                                 │ 1
                                 │
                                 │ ∞
                          ┌──────▼───────┐ 1     ∞ ┌──────────────────┐
                          │    clips     │────────│  share_tokens    │
                          ├──────────────┤        ├──────────────────┤
                          │ id PK        │        │ id PK            │
                          │ video_id FK  │        │ clip_id FK NULL  │
                          │ user_id FK   │        │ video_id FK NULL │
                          │ start_time   │        │ token UQ         │
                          │ end_time     │        │ expires_at       │
                          │ clip_path    │        │ view_count       │
                          │ title        │        │ created_at       │
                          │ created_at   │        └──────────────────┘
                          └──────────────┘
```

### Indexes
- `videos(user_id, created_at DESC)` — library list
- `journal_entries(video_id, timestamp_seconds)` — timeline render
- `journal_entries USING gin(to_tsvector('english', content_text))` — search
- `video_tags(tag_name)` + `video_tags(video_id)` — filter
- `share_tokens(token)` UNIQUE — public lookup

---

## 4. API Contract Overview

### REST (prefix `/api/v1`)

| Verb | Path | Auth | Purpose |
|------|------|------|---------|
| POST | `/auth/register` | – | Create user |
| POST | `/auth/login` | – | Issue JWT pair |
| POST | `/auth/refresh` | refresh | Rotate access token |
| POST | `/auth/logout` | access | Blacklist refresh in Redis |
| GET  | `/auth/me` | access | Current profile |
| POST | `/videos/init` | access | Begin chunked upload |
| POST | `/videos/chunk/{upload_id}` | access | Append chunk |
| POST | `/videos/finalize/{upload_id}` | access | Assemble + enqueue ffmpeg |
| GET  | `/videos` | access | List (search, filter, paginate) |
| GET  | `/videos/{id}` | access | Detail incl. journal |
| GET  | `/videos/{id}/stream` | access* | HLS manifest + segments, range |
| DELETE | `/videos/{id}` | access | Soft delete |
| POST | `/videos/{video_id}/journal` | access | Create entry |
| GET  | `/videos/{video_id}/journal` | access | List entries |
| PUT  | `/journal/{entry_id}` | access | Update |
| DELETE | `/journal/{entry_id}` | access | Delete |
| GET  | `/journal/search?q=` | access | FTS |
| POST | `/videos/{video_id}/clips` | access | Create clip |
| GET  | `/clips/{clip_id}` | access | Detail |
| POST | `/clips/{clip_id}/share` | access | Generate token |
| GET  | `/share/{token}` | – | Public access |

`*` access token OR valid share token query param.

### WebSocket

| Path | Purpose | Messages |
|------|---------|----------|
| `/ws/upload/{upload_id}` | Live upload + processing progress | `{stage, pct, bytes_received, eta_seconds}` |

### Response envelope

```json
{ "success": true, "data": { ... }, "error": null }
{ "success": false, "data": null, "error": { "code": "VIDEO_NOT_FOUND", "message": "..." } }
```

---

## 5. Security Model

- **Authentication**: OAuth2 password flow → JWT (HS256). Access token 30 min, refresh token 14 days. Refresh tokens stored hashed in Redis (`refresh:{jti}`); logout deletes the key.
- **Authorization**: All `/videos`, `/journal`, `/clips` endpoints scope queries by `current_user.id`. `get_current_user` raises 401 if absent/invalid/blacklisted.
- **Rate limiting**: slowapi backed by Redis. `/auth/login`: 5/min/IP, `/videos/chunk`: 200/min/user, others 60/min/user.
- **Upload limits**: enforced server-side: `MAX_UPLOAD_SIZE=10 GiB`, `ALLOWED_FORMATS={mp4, mov, mkv, webm}`. nginx `client_max_body_size 25M` for chunk endpoint.
- **CORS**: explicit allowlist (`FRONTEND_ORIGIN`); credentials allowed; methods limited.
- **Passwords**: bcrypt, work factor 12.
- **Transport**: HSTS + TLS 1.2+ at nginx.
- **Share tokens**: 256-bit URL-safe random, expire by default in 7 days, single-table lookup with `view_count` audit.
- **CSP**: `default-src 'self'; media-src 'self' blob:; img-src 'self' data:`.
- **Headers**: X-Content-Type-Options, X-Frame-Options DENY, Referrer-Policy strict-origin-when-cross-origin.

---

## 6. Scalability Notes

- Backend is **stateless** → horizontal scale behind nginx; pin uploads via `upload_id`→worker mapping in Redis (or use S3 multipart instead).
- DB sessions use a single async engine (pool 20 + max_overflow 10).
- ffmpeg work is CPU-bound — in production swap to Celery/RQ workers with a separate `worker` service.
- Storage abstraction allows hot-swap from local disk to S3 (`STORAGE_BACKEND=s3`).
