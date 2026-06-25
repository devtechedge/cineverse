# 📋 Cineverse — Project State & Handoff Doc

> Read this first. Everything an LLM agent (or new collaborator) needs to pick up the project mid-flight without re-asking 50 questions.

**Last updated:** v0.3 (post light/dark theme + ambient bg + CI/CD fix)
**Owner:** devtechedge
**Live demo:** <https://cineverse-fawn-two.vercel.app/>
**Source:** <https://github.com/devtechedge/cineverse>

---

## 🎯 What this project is

**Cineverse** is a portfolio-grade full-stack personal video archive, journal, and streaming platform. It's intentionally built in two flavors that share the same frontend:

1. **Demo flavor** (currently deployed on Vercel) — Next.js frontend + in-memory mock data layer. No backend. This is what recruiters click.
2. **Production flavor** (lives in `/backend`, runs via `docker-compose`) — FastAPI async + PostgreSQL + Redis + ffmpeg HLS pipeline + nginx + Prometheus + Grafana. This is the architecture-proof flavor.

The toggle between the two is a single env var: `NEXT_PUBLIC_MOCK_MODE=true` (Vercel) vs `false` (Docker local).

---

## 🧱 Tech Stack

### Frontend (`/frontend`)
- Next.js 14 (App Router, strict TypeScript)
- Tailwind CSS with **CSS-variable-driven theme system** (`:root` for light, `html.dark` for dark)
- Framer Motion (hero parallax, scroll-snap)
- TanStack Query (data fetching)
- Zustand stores: `auth`, `upload`, **`theme`**
- TipTap (rich-text journal editor)
- HLS.js (lazy-loaded, only when needed)
- Sonner (toasts)
- lucide-react (icons)

### Backend (`/backend`)
- FastAPI 0.115, Pydantic v2
- SQLAlchemy 2.0 async + asyncpg
- Alembic migrations (initial: 0001_initial)
- Redis 7 (refresh tokens, rate limit, upload meta, ws pubsub)
- structlog (JSON logging with correlation IDs)
- Prometheus client + OpenTelemetry
- slowapi (rate limiting)
- bcrypt + python-jose (auth)
- ffmpeg subprocess wrapper for HLS transcoding

### DevOps
- Docker multi-stage images (`devops/docker/Dockerfile.{backend,frontend}`)
- `devops/docker/docker-compose.yml` — full stack: db, redis, app, web, nginx, prometheus, grafana
- nginx reverse proxy with range/gzip/rate-limit (`devops/nginx/nginx.conf`)
- GitHub Actions: `.github/workflows/{ci,cd}.yml`

---

## 📁 Critical file map

```
Cineverse/
├── README.md                          # Recruiter-facing, has live demo link
├── CHANGELOG.md                       # Per-version history (Keep a Changelog format)
├── PROJECT_STATE.md                   # ← THIS FILE
│
├── frontend/
│   ├── vercel.json                    # Vercel build config (sets NEXT_PUBLIC_MOCK_MODE=true)
│   ├── next.config.js                 # Skips API rewrites when MOCK_MODE
│   ├── tailwind.config.ts             # Colors → CSS variables for theming
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx             # Inline theme bootstrap script (no flash)
│   │   │   ├── globals.css            # CSS vars for light/dark + .cv-ambient background
│   │   │   ├── page.tsx               # Hero homepage with 6 scroll-snap sections
│   │   │   ├── library/page.tsx       # Grid + search + filter + infinite scroll
│   │   │   ├── upload/page.tsx        # Drag-drop + chunked uploader
│   │   │   ├── watch/[id]/page.tsx    # Video player + journal sidebar
│   │   │   └── share/[token]/page.tsx # Public shared video/clip
│   │   ├── components/
│   │   │   ├── Navbar.tsx             # Logo, links, theme toggle (sun/moon), user link
│   │   │   ├── DemoBanner.tsx         # Top banner explaining demo mode
│   │   │   ├── HeroSection.tsx        # Full-vh slide with parallax (text-overlap-fixed)
│   │   │   ├── VideoCard.tsx          # Library thumbnail card
│   │   │   ├── VideoPlayer.tsx        # Custom HTML5 player + HLS + trim + markers
│   │   │   ├── JournalEditor.tsx      # TipTap editor with timestamp insert
│   │   │   ├── UploadDropzone.tsx     # react-dropzone wrapper
│   │   │   ├── UploadQueue.tsx        # List of in-flight uploads
│   │   │   └── Skeleton.tsx           # Shimmering loader
│   │   ├── lib/
│   │   │   ├── api.ts                 # axios + interceptors OR mock router
│   │   │   ├── websocket.ts           # Reconnecting WS hook
│   │   │   ├── utils.ts               # cn, formatDuration, formatBytes, debounce
│   │   │   ├── mock-data.ts           # 6 seeded videos + inline SVG thumbnails
│   │   │   └── mock-api.ts            # Full in-memory backend simulation
│   │   ├── stores/
│   │   │   ├── auth.ts                # Zustand auth (auto-login in MOCK_MODE)
│   │   │   ├── upload.ts              # Zustand upload queue + chunked upload logic
│   │   │   └── theme.ts               # Light/dark with localStorage persistence
│   │   └── types/index.ts             # Shared TS interfaces
│   └── tests/                         # Vitest unit tests (8 passing)
│
├── backend/
│   ├── app/
│   │   ├── main.py                    # FastAPI app factory + lifespan + middleware
│   │   ├── core/
│   │   │   ├── config.py              # Pydantic Settings
│   │   │   ├── db.py                  # async SQLAlchemy engine (handles SQLite for tests)
│   │   │   ├── deps.py                # get_db, get_current_user, get_redis, limiter
│   │   │   ├── security.py            # bcrypt + JWT encode/decode + role dep
│   │   │   ├── logging.py             # structlog + correlation ID middleware
│   │   │   └── metrics.py             # Prometheus middleware + counters
│   │   ├── models/                    # SQLAlchemy: User, Video, JournalEntry, Clip, ShareToken, VideoTag
│   │   ├── schemas/                   # Pydantic request/response models
│   │   ├── api/                       # Routers: auth, videos, journal, clips
│   │   └── services/                  # storage (Local/S3), ffmpeg_service, websocket_manager
│   ├── alembic/versions/20260101_0001_initial.py
│   ├── tests/                         # pytest (9 passing) - uses SQLite + fake Redis
│   └── requirements.txt
│
├── devops/{docker,nginx}/
├── observability/{prometheus,grafana/dashboards,alerting}/
├── qa/{e2e,load}/
├── docs/
│   ├── ARCHITECTURE.md                # System diagrams + ERD + tech justification
│   ├── DESIGN_SYSTEM.md               # Color/type/motion tokens + component inventory
│   ├── API_SPEC.md                    # Every endpoint with examples + error codes
│   ├── RUNBOOK.md                     # Local + deploy + debug + scale playbooks
│   └── DEPLOY_VERCEL.md               # Vercel-specific deploy guide
└── .github/workflows/
    ├── ci.yml                         # Frontend lint/typecheck/test/build (soft-fails backend)
    └── cd.yml                         # MANUAL TRIGGER ONLY (workflow_dispatch) - no VPS yet
```

---

## 🌗 Theme system (key design decision)

All component colors are written as Tailwind utilities (`bg-bg-base`, `text-text-primary`, `border-border-subtle`, `text-accent`, etc.) but those utilities point at **CSS variables** defined in `globals.css`. Two variable sets exist:

- `:root` → light theme (#fafaf8 bg, #161616 text)
- `html.dark` → dark theme (#0a0a0a bg, #f5f5f5 text)

The Zustand `theme` store toggles the `dark` class on `<html>`. An inline `<script>` in `layout.tsx` `<head>` applies the saved theme before React hydrates (zero flash).

**Implication for new work:** ANY new component automatically themes itself if it uses `bg-bg-*`, `text-text-*`, `border-border-*`, `text-accent`. Avoid hardcoded hex values.

---

## 🎨 Ambient background

A fixed `.cv-ambient` div sits at z-index -1 below all content with three drifting radial gradients (red + blue + purple) + SVG noise grain. Animation: `cv-ambient-drift` 24s alternate. Theme-aware via CSS variables. Respects `prefers-reduced-motion`.

---

## 🔌 Demo mode mechanics

`NEXT_PUBLIC_MOCK_MODE=true` activates:

1. **`api.ts`** exports `mockApi` (mimicking axios shape) instead of real axios
2. **`auth.ts` store** auto-logs in as `MOCK_USER` ("Demo Director")
3. **`upload.ts` store** simulates a chunked upload with `setTimeout` progress
4. **`DemoBanner.tsx`** renders at top of every page
5. **`next.config.js`** skips API rewrites

All other components are unchanged. Same code paths run in both modes — the swap is purely at the data-fetch boundary.

---

## ✅ What's working in production today

- Site loads in light mode by default; toggles to dark; persists
- Hero scroll-snap homepage with parallax — title/description/tags no longer overlap
- Library: 6 videos with inline SVG thumbnails (cannot 404)
- Watch page: video plays (uses `commondatastorage.googleapis.com/gtv-videos-bucket/sample/*.mp4`), journal markers on timeline
- Custom video player: play/pause, volume, fullscreen, J/K/L speed, trim handles
- Journal editor: TipTap, autosave to localStorage, insert-timestamp button
- Clips: simulated creation, expiring share tokens, public access via `/share/{token}`
- Upload: drag-drop, simulated chunk progress, new card appears in library
- Navbar user name "Demo Director" links to `/library`
- CI workflow passes (frontend lint + typecheck + tests + build)
- CD workflow is manual-trigger only — no more failure emails

---

## 🐛 Known issues / next iteration backlog

The user has said "many more UI changes are needed" — these will be specified in the next session. Pending items I'd anticipate:

- Mobile responsiveness audit on hero parallax and library grid
- Watch page sidebar collapse/expand on small screens
- Better loading skeletons during demo-mode delays
- Real screenshots in README (recruiter optics)
- Accessibility audit (focus order, ARIA labels, contrast)
- Empty states (especially library when filters return zero)

---

## 🚀 Standard workflow for changes

1. AI agent generates updated files in `/home/user/Cineverse/`
2. AI verifies: `npx tsc --noEmit` + `NEXT_PUBLIC_MOCK_MODE=true npx next build` + `npx vitest run`
3. AI zips changed files into `Cineverse-update-N.zip` (only the diff)
4. User extracts on top of local repo
5. User commits via GitHub Desktop with a meaningful message
6. User pushes → Vercel auto-redeploys in ~90s
7. Update `CHANGELOG.md` for any user-visible or architectural change

---

## 💡 Build verification commands (run these before every push)

```bash
cd frontend
npx tsc --noEmit                          # type-check, must be clean
NEXT_PUBLIC_MOCK_MODE=true npx next build # full production build
npx vitest run --reporter=basic           # 8 tests, must all pass
```

```bash
cd backend
pytest -q --no-cov                        # 9 tests, must all pass
```

---

## 🔑 Environment variables

### Frontend (`.env.local`)
```bash
NEXT_PUBLIC_MOCK_MODE=true                # Vercel demo
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
NEXT_PUBLIC_WS_BASE_URL=ws://localhost:8000
```

### Backend (`.env`)
Copy from `backend/.env.example`. Critical: `SECRET_KEY`, `DATABASE_URL`, `REDIS_URL`, `FRONTEND_ORIGIN`.

### Vercel project settings
- Root directory: `frontend`
- Single env var: `NEXT_PUBLIC_MOCK_MODE=true`
- Public URL: `cineverse-fawn-two.vercel.app`

---

## 📦 Sample/test asset sources

- **Videos**: `https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/*.mp4`
  (Big Buck Bunny, Elephants Dream, For Bigger Blazes, Sintel, Tears of Steel, Subaru Outback, For Bigger Joyrides)
- **Thumbnails**: Inline SVG data URIs generated in `mock-data.ts` (no external dependency)

---

## 🤝 Coordination protocol for next AI session

When starting a new chat, paste this entire file at the top and add:

> "I'm continuing work on Cineverse. The current state is in PROJECT_STATE.md above. The next change I want is: [describe]. Please verify against the file map and build commands before generating a patch zip."

This avoids re-explaining the project and prevents the new agent from suggesting things that conflict with established decisions (e.g. rewriting the theme system from scratch).
