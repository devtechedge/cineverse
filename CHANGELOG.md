# Changelog

All notable changes to Cineverse are documented here.
Format inspired by [Keep a Changelog](https://keepachangelog.com).

## [Unreleased]

### Added
- Light/dark theme toggle in navbar — defaults to light, persisted in `localStorage`, no flash on load
- Animated ambient gradient background — slow-drifting radial gradients with SVG noise, theme-aware, present on every page
- Theme-aware CSS variable system — all colors live in `:root` / `html.dark`, Tailwind utilities point at the variables, every component switches automatically
- `CHANGELOG.md` to track project progress

### Changed
- `HeroSection` layout rebuilt — title, description, and tags now live in three separate vertical blocks with explicit spacing; parallax range capped at ±18px so text can't overlap during scroll
- Library thumbnails switched from external image URLs to inline SVG `data:` URIs — eliminates broken-image states entirely
- `VideoPlayer` now lazy-loads `hls.js` on demand instead of bundling it — saved ~155 kB on `/watch/[id]` route (391 kB → 236 kB)
- Video player controls always visible on mobile, fade on desktop hover
- Navbar user display ("Demo Director") is now a clickable link to `/library` with hover state and user icon
- CD workflow disabled from auto-run (manual-trigger only) until a VPS is provisioned — no more spurious failure emails
- CI workflow simplified — frontend lint/typecheck/test/build always runs, backend allowed to soft-fail until full infra is wired

### Fixed
- Video playback on `/watch/[id]` pages — added URL `http://` detection so absolute URLs go directly to `<video>` instead of being prefixed with `/api/v1/`
- Keyboard shortcuts (Space, J/K/L, Arrow keys) now ignored when typing in inputs/textareas/contenteditable
- Tag chips on hero sections wrapped in translucent backdrop-blur background for legibility against any video frame

## [0.2.0] — Vercel demo live

### Added
- Mock data layer (`src/lib/mock-data.ts`, `src/lib/mock-api.ts`) — full in-memory backend simulation activated by `NEXT_PUBLIC_MOCK_MODE=true`
- 6 seeded videos with journal entries, clips, and tags
- Demo mode banner with link to source repo
- `vercel.json` and `docs/DEPLOY_VERCEL.md` deployment guide
- Auto-login as "Demo Director" when mock mode is on

### Changed
- Axios client routes through mock router when `MOCK_MODE=true` — interceptors only attach to real axios instance
- Upload store simulates realistic chunked-upload progress in demo mode
- README polished with live demo URL, deploy button, and recruiter-friendly project description

## [0.1.0] — Initial scaffold

### Added
- **Frontend**: Next.js 14 (App Router, strict TypeScript, Tailwind), cinematic scroll-snap homepage with Framer Motion parallax, custom HLS-capable video player with timeline journal markers and clip trimmer, library with search/filter/infinite scroll, upload page with drag-drop + chunked-upload progress, TipTap journal editor, login/register/share pages
- **Backend**: FastAPI async with full router suite (auth, videos, journal, clips), SQLAlchemy 2.0 async ORM with 6 models, Alembic migration with GIN full-text index and `updated_at` triggers, structured JSON logging via structlog with correlation IDs, Prometheus metrics endpoint, OpenTelemetry instrumentation, slowapi rate limiting, JWT auth with refresh-token rotation in Redis
- **Services**: ffmpeg HLS transcoding pipeline (720p/1080p), thumbnail extraction, clip trimming; pluggable storage abstraction (local FS for dev, S3 for prod); WebSocket connection manager for upload progress
- **DevOps**: Multi-stage Docker images for frontend + backend, full `docker-compose` stack (Postgres, Redis, app, web, nginx, Prometheus, Grafana), nginx reverse proxy with range/gzip/rate-limit/SSL template, GitHub Actions CI + CD workflows
- **Observability**: Prometheus scrape config, two Grafana dashboards (Health/RED + Business metrics), four alert rules (error rate, upload backlog, DB exhaustion, latency p95)
- **Testing**: pytest with 9 backend tests via httpx ASGI transport + fake Redis + in-memory SQLite (all passing), Vitest with 8 frontend tests (all passing), Playwright config across 5 devices, k6 load scripts for streaming and uploads
- **Documentation**: ARCHITECTURE.md (ASCII diagrams, ERD, tech-stack justification, security model), DESIGN_SYSTEM.md (full color/typography/motion tokens, component inventory), API_SPEC.md (every endpoint with example payloads + error code table), RUNBOOK.md (local, deploy, debug, scale playbooks)
