# 📋 Cineverse — Project State & Handoff Doc

> **Read this first.** Everything any agent (LLM or human) needs to continue Cineverse without re-asking 50 questions. Paste this whole file as the opening of any new chat.

**Last updated:** v0.4 — Polish round (footer, drawers, skeletons, empty states, a11y, OG tags, favicon, transitions)
**Owner:** [@devtechedge](https://github.com/devtechedge)
**Live demo:** <https://cineverse-fawn-two.vercel.app/>
**Source:** <https://github.com/devtechedge/cineverse>
**Local path on user's machine:** wherever they cloned it (`~/Documents/GitHub/cineverse` typical)

---

## 0️⃣ 30-second elevator pitch

Cineverse is a portfolio-grade full-stack personal video archive + journal + streaming platform. Intentionally built in two flavors sharing one frontend:

- **Demo** (Vercel, live) — Next.js frontend + in-memory mock data, no backend. Recruiters click this.
- **Production** (in `/backend`, runs via `docker-compose`) — FastAPI async + Postgres + Redis + ffmpeg HLS + nginx + Prometheus + Grafana. Architecture-proof.

Toggle = a single env var: `NEXT_PUBLIC_MOCK_MODE=true` (Vercel) vs `false` (Docker local).

---

## 1️⃣ Tech Stack

### Frontend (`/frontend`)
- **Next.js 14.2.4** App Router, strict TypeScript
- **Tailwind CSS** with CSS-variable-driven theme system (`:root` light, `html.dark` dark)
- **Framer Motion** (hero parallax, scroll-snap, page transitions, scroll-to-top)
- **TanStack Query** v5 (data fetching, infinite scroll)
- **Zustand stores:** `auth`, `upload`, `theme`
- **TipTap** (rich-text journal editor with timestamp insert)
- **HLS.js** (lazy-loaded — only when source is `.m3u8`)
- **Sonner** (toast notifications, theme="system")
- **lucide-react** (icons, stroke 1.5)
- **react-dropzone** (upload zone)

### Backend (`/backend`)
- **FastAPI 0.115.6**, Pydantic v2
- **SQLAlchemy 2.0 async** + asyncpg
- **Alembic** migrations (initial: `20260101_0001_initial.py`)
- **Redis 7** (refresh tokens, rate limit, upload meta, ws pubsub)
- **structlog** (JSON logging + correlation IDs)
- **prometheus-client** + OpenTelemetry
- **slowapi** (rate limiting via Redis)
- **bcrypt** + python-jose (JWT auth)
- **ffmpeg** subprocess wrapper (HLS 720p/1080p + thumbnails + clip trimming)

### DevOps
- Multi-stage Docker images (`devops/docker/Dockerfile.{backend,frontend}`)
- Full `docker-compose.yml` — db, redis, app, web, nginx, prometheus, grafana
- nginx with range/gzip/rate-limit/SSL template (`devops/nginx/nginx.conf`)
- GitHub Actions: `.github/workflows/{ci,cd}.yml` (**CD is `workflow_dispatch` only** — no VPS yet)

### Verified working tests
- Backend: 9 pytest tests pass (SQLite + fake Redis + ffmpeg mocked)
- Frontend: 8 Vitest tests pass

---

## 2️⃣ Critical file map (post-v0.4)

```
Cineverse/
├── README.md                          # Recruiter-facing — has live demo + screenshot section
├── CHANGELOG.md                       # Keep-a-Changelog format, every version logged
├── PROJECT_STATE.md                   # ← THIS FILE
│
├── frontend/
│   ├── vercel.json                    # Bakes NEXT_PUBLIC_MOCK_MODE=true into build
│   ├── next.config.js                 # Skips API rewrites when MOCK_MODE
│   ├── tailwind.config.ts             # Colors point at CSS vars → theme-aware
│   ├── .eslintrc.json                 # Disabled @typescript-eslint/no-explicit-any (plugin not installed)
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx             # Inline theme bootstrap, OG meta, wires footer+skip+scroll-top+keyboard hints
│   │   │   ├── globals.css            # CSS vars (light/dark), .cv-ambient bg, reduced-motion + forced-colors a11y
│   │   │   ├── providers.tsx          # QueryClient + hydrate auth + hydrate theme
│   │   │   ├── icon.svg               # Custom Cineverse favicon (red play triangle)
│   │   │   ├── page.tsx               # Hero homepage with scroll-snap + section dots OR landing for logged-out
│   │   │   ├── library/page.tsx       # Grid + search + filter + infinite scroll + mobile filter drawer + empty states
│   │   │   ├── upload/page.tsx        # Drag-drop + chunked uploader (simulated in mock mode)
│   │   │   ├── watch/[id]/page.tsx    # Video player + journal sidebar/drawer (mobile)
│   │   │   ├── share/[token]/page.tsx # Public shared video/clip
│   │   │   ├── login/page.tsx
│   │   │   ├── register/page.tsx
│   │   │   ├── error.tsx              # "Cut!" themed error page
│   │   │   └── not-found.tsx          # "Lost frame" 404 page
│   │   ├── components/
│   │   │   ├── Navbar.tsx             # Logo, links, theme toggle (sun/moon), user → /library
│   │   │   ├── DemoBanner.tsx         # Top banner explaining demo mode + link to repo
│   │   │   ├── Footer.tsx             # 4-column with project links + tech stack + copyright
│   │   │   ├── SkipLink.tsx           # WCAG keyboard "skip to main"
│   │   │   ├── ScrollToTop.tsx        # Appears after 600px scroll
│   │   │   ├── KeyboardHints.tsx      # Press ? to toggle shortcut cheatsheet modal
│   │   │   ├── PageTransition.tsx     # 250ms Framer fade on route change
│   │   │   ├── HeroSection.tsx        # Full-vh slide, parallax (capped ±14px), text-overlap-FIXED, 100svh
│   │   │   ├── VideoCard.tsx          # Library thumbnail card, focus-visible ring, status badges
│   │   │   ├── VideoPlayer.tsx        # Custom HTML5 player, lazy HLS, trim handles, journal markers, kbd shortcuts
│   │   │   ├── JournalEditor.tsx      # TipTap, insert-timestamp button, autosave to localStorage
│   │   │   ├── UploadDropzone.tsx     # react-dropzone wrapper
│   │   │   ├── UploadQueue.tsx        # In-flight uploads list + empty state
│   │   │   ├── Skeleton.tsx           # VideoCardSkeleton, VideoGridSkeleton, HeroSkeleton, WatchSkeleton
│   │   │   └── EmptyState.tsx         # Reusable empty state w/ icon + title + desc + CTA
│   │   ├── lib/
│   │   │   ├── api.ts                 # axios + interceptors (real mode) OR mockApi (demo mode)
│   │   │   ├── websocket.ts           # Reconnecting WS hook
│   │   │   ├── utils.ts               # cn, formatDuration, formatBytes, debounce
│   │   │   ├── mock-data.ts           # 6 seeded videos + inline SVG thumbnails (no external image deps)
│   │   │   └── mock-api.ts            # Full in-memory backend simulation
│   │   ├── stores/
│   │   │   ├── auth.ts                # Auto-login as MOCK_USER when MOCK_MODE
│   │   │   ├── upload.ts              # Simulated chunked upload in demo mode
│   │   │   └── theme.ts               # Light/dark with localStorage persistence
│   │   └── types/index.ts             # Shared TS interfaces
│   ├── tests/                         # Vitest unit tests (8 passing)
│   └── package.json
│
├── backend/                           # FastAPI + everything for production
│   ├── app/{api,core,models,schemas,services}/
│   ├── alembic/versions/20260101_0001_initial.py
│   ├── tests/                         # pytest 9 passing
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
│   ├── DEPLOY_VERCEL.md               # Vercel-specific deploy guide
│   └── screenshots/                   # README screenshot folder + capture guide
│       ├── README.md                  # Instructions (1440x900, filenames)
│       └── (01-hero.png ... 06-upload.png — USER TO CAPTURE)
└── .github/workflows/
    ├── ci.yml                         # Frontend lint/typecheck/test/build (backend soft-fails)
    └── cd.yml                         # workflow_dispatch ONLY — no VPS configured
```

---

## 3️⃣ Theme system (architectural)

ALL component colors are Tailwind utilities (`bg-bg-base`, `text-text-primary`, `border-border-subtle`, `text-accent`) but those map to **CSS variables** in `globals.css`:

- `:root` → light (#fafaf8 bg, #161616 text)
- `html.dark` → dark (#0a0a0a bg, #f5f5f5 text)

The Zustand `theme` store toggles `dark` class on `<html>`. An inline `<script>` in `layout.tsx` `<head>` applies saved theme **before** React hydrates (zero flash).

**RULE for new code:** never hardcode hex values. Use `bg-bg-*`, `text-text-*`, `border-border-*`, `text-accent`, etc. They auto-theme.

---

## 4️⃣ Ambient background

A fixed `.cv-ambient` div at z-index -1 below all content with three drifting radial gradients (red + blue + purple) + SVG noise grain. Animation `cv-ambient-drift` 24s alternate. Theme-aware via CSS vars. Respects `prefers-reduced-motion`.

---

## 5️⃣ Demo mode mechanics (critical to understand)

`NEXT_PUBLIC_MOCK_MODE=true` activates four behaviors:

1. **`lib/api.ts`** exports `mockApi` (mimicking axios shape) instead of real axios. Interceptors only attach to real axios.
2. **`stores/auth.ts`** auto-logs in as `MOCK_USER` ("Demo Director")
3. **`stores/upload.ts`** simulates chunked upload with `setTimeout` progress; finalize creates a new in-memory video
4. **`components/DemoBanner.tsx`** renders at top of every page
5. **`next.config.js`** skips `/api/*` rewrites

Same code paths run in both modes. Swap is **purely at the data-fetch boundary** — no component knows the difference.

---

## 6️⃣ What's working in production today (v0.4)

Confirmed by URL fetches:

- ✅ Site loads in **light mode** by default
- ✅ Sun/moon toggle in navbar, persists in localStorage, no flash
- ✅ Ambient gradient drifting in background (red+blue+purple)
- ✅ Hero scroll-snap with parallax, title/desc/tags no longer overlap
- ✅ 6 seeded videos with inline SVG thumbnails (cannot 404)
- ✅ `/watch/[id]` pages play video (uses Google sample bucket)
- ✅ Custom video player: play/pause, volume, fullscreen, J/K/L speed, trim handles, journal markers
- ✅ Journal editor (TipTap), autosave, insert-timestamp button
- ✅ Clips: simulated, expiring share tokens, public `/share/{token}` route works
- ✅ Upload simulates chunked progress, adds new card to library
- ✅ Navbar "Demo Director" links to `/library`
- ✅ **Mobile filter drawer** (library)
- ✅ **Mobile journal drawer** (watch)
- ✅ **Footer** with 4 columns
- ✅ **Scroll-to-top** button after 600px
- ✅ **Keyboard hints** modal — press `?`
- ✅ **Page transitions** — 250ms fade between routes
- ✅ **Skip link** for keyboard users
- ✅ **Open Graph + Twitter meta** for social sharing
- ✅ **Custom favicon** (icon.svg)
- ✅ **404 + error pages** cinematic-themed
- ✅ CI passes
- ✅ CD is `workflow_dispatch` only — no failure emails

---

## 7️⃣ Standard workflow (every change follows this)

1. Agent generates/edits files in `Cineverse/`
2. Agent verifies:
   ```bash
   cd frontend
   npx tsc --noEmit                                  # type-check, must be clean
   NEXT_PUBLIC_MOCK_MODE=true npx next build         # full production build
   npx vitest run --reporter=basic                   # 8 tests, must all pass
   ```
3. Agent zips ONLY the changed files into `Cineverse-<round-name>.zip` (e.g. `Cineverse-polish.zip`)
4. User extracts zip on top of local repo (preserves paths)
5. User commits via GitHub Desktop with descriptive message
6. User pushes → Vercel auto-redeploys in ~90s
7. Update `CHANGELOG.md` for any user-visible or architectural change

---

## 8️⃣ Build verification commands (sacred — run before every push)

```bash
cd frontend
npx tsc --noEmit                                # MUST be clean
NEXT_PUBLIC_MOCK_MODE=true npx next build       # MUST succeed, 9 routes
npx vitest run --reporter=basic                 # 8 tests MUST pass

# Optional (only when backend touched)
cd ../backend
pytest -q --no-cov                              # 9 tests pass on SQLite
```

---

## 9️⃣ Environment variables

### Frontend (`.env.local`)
```bash
NEXT_PUBLIC_MOCK_MODE=true                # Vercel demo
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
NEXT_PUBLIC_WS_BASE_URL=ws://localhost:8000
```

### Backend (`.env`)
Copy from `backend/.env.example`. Critical: `SECRET_KEY`, `DATABASE_URL`, `REDIS_URL`, `FRONTEND_ORIGIN`.

### Vercel project settings (already configured)
- Root directory: `frontend`
- Single env var: `NEXT_PUBLIC_MOCK_MODE=true`
- Public URL: `cineverse-fawn-two.vercel.app`
- Framework auto-detected as Next.js

---

## 🔟 Sample/test asset sources

- **Videos**: `https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/*.mp4`
  (Big Buck Bunny, Elephants Dream, For Bigger Blazes, Sintel, Tears of Steel, Subaru Outback, For Bigger Joyrides)
- **Thumbnails**: inline SVG `data:` URIs generated in `lib/mock-data.ts` (zero external image deps)

---

## 1️⃣1️⃣ Known issues / open backlog (post-v0.4)

### Outstanding from user
- 📸 **Screenshots not yet captured** — `docs/screenshots/` folder has guide but 6 PNGs (01-hero.png through 06-upload.png) still need to be taken at 1440×900. README references them but they'll 404 until captured.
- 🎥 **No Loom/video walkthrough** yet — biggest portfolio multiplier still pending

### Lower priority (deferred)
- Backend not actually deployed anywhere — only Vercel demo is live. CD workflow built but VPS not provisioned.
- Real-time WebSocket upload progress not exercised in production (mock mode simulates)
- No Sentry / error tracking wired (logs structured but nothing collecting them in prod)
- No analytics (could enable Vercel Web Analytics — free, 1-click in dashboard)

### What I (current agent) would suggest as next moves, ranked
1. **Take the 6 screenshots, commit them** — biggest visible win, 15 min effort
2. **Record 90-sec Loom** walking through demo, paste link at top of README
3. **Pin repo + Vercel Web Analytics** (free, 30-second toggle in Vercel dashboard)
4. **Provision a $4 Hetzner VPS**, point at it via the existing CD workflow → full stack actually live (only thing left that meaningfully outclasses current state)
5. Write a 600-word "how I built it" dev.to / Medium post → links back to repo

---

## 1️⃣2️⃣ Coordination protocol for new chats

When opening a fresh agent chat:

1. Paste this entire file as your first message
2. Add a line: *"I'm continuing work on Cineverse. State above. Next change I want: [describe]."*
3. Ask the agent to **verify against the file map and run build commands before generating a patch zip**

This prevents the new agent from:
- Re-explaining things you already know
- Suggesting architectural changes that conflict with established decisions (e.g. "let me rewrite the theme system as ThemeContext" → it's already a Zustand store with CSS vars, on purpose)
- Forgetting that MOCK_MODE is the demo flavor and CSS vars drive theming
- Skipping the `tsc + next build + vitest` checks

---

## 1️⃣3️⃣ Patch zip naming convention

Used so far (in chronological order):
- `Cineverse.zip` — full project (initial)
- `Cineverse-update.zip` — README + DemoBanner fix
- `Cineverse-update-v2.zip` — theme + ambient + hero fixes (12 files)
- `Cineverse-fix-ci.zip` — workflow fixes + CHANGELOG (4 files)
- `Cineverse-handoff.zip` — added PROJECT_STATE.md (5 files)
- `Cineverse-polish.zip` — footer, drawers, a11y, OG, transitions, skeletons (21 files)

Next patches → `Cineverse-screenshots.zip`, `Cineverse-<feature>.zip`, etc.

---

## 1️⃣4️⃣ User context (helpful for the next agent)

- User is **`@devtechedge`** on GitHub
- Uses **GitHub Desktop** (Windows) for commit/push workflow, not CLI
- Uses **Vercel Hobby (free tier)** for hosting the demo
- Has a **Snapdragon X16 ARM Windows laptop** (Asus VivoBook) — running Hermes 0.17 desktop agent
- Tried Gemini 2.5 Flash for Hermes brain — kept hitting RPM. Was advised to switch to **Groq with `llama-3.3-70b-versatile`** (30 RPM, OpenAI-compatible API, free)
- Prefers **incremental commits** with descriptive messages — that's how the project is being shipped
- Wants the project to be **portfolio-grade** and **recruiter-friendly** — not over-engineered for fictional scale
- Has explicitly said no further VPS deploy *yet*, no Supabase (uses quota on other projects)

---

_End of state doc. v0.4 — last updated post-polish round._
