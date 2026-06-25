# Deploying Cineverse to Vercel (demo mode)

This guide gets the **frontend** live on Vercel in ~10 minutes with seeded mock
data. No backend, database, or video storage required — perfect for portfolios.

> Live demo URL will look like: `https://cineverse-yourname.vercel.app`

---

## 1. Push the repo to GitHub

```bash
cd Cineverse
git init
git add .
git commit -m "Initial commit — Cineverse"

# Create a new empty repo on github.com first (don't initialize it with anything)
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/cineverse.git
git push -u origin main
```

## 2. Import the project into Vercel

1. Go to <https://vercel.com/new>
2. Click **Import Git Repository** → pick your `cineverse` repo
3. Vercel will detect Next.js but will pick the **wrong root directory**.
   Set these manually:

| Setting | Value |
|---|---|
| **Framework Preset** | Next.js |
| **Root Directory** | `frontend` |
| **Build Command** | `next build` (auto) |
| **Output Directory** | `.next` (auto) |
| **Install Command** | `npm install` (auto) |

4. Under **Environment Variables**, add **one** variable:

| Key | Value |
|---|---|
| `NEXT_PUBLIC_MOCK_MODE` | `true` |

5. Click **Deploy**. First build takes ~2 minutes.

That's it. You now have a public URL.

## 3. (Optional) Custom subdomain

Vercel gives you a free `cineverse-yourname.vercel.app` subdomain. To change it:

* **Project → Settings → Domains** → add a domain
* Vercel domains: `whatever.vercel.app` is free and instant
* Bring your own: $12/yr at Namecheap, follow Vercel's DNS instructions

## 4. What works in demo mode

| Feature | Demo behavior |
|---|---|
| Homepage hero | 6 seeded videos with full parallax scroll-snap |
| Library | Search, tag filter, "has journal" filter all work against seeded data |
| Video player | Custom controls + journal markers + clip trimmer, plays real public-domain sample videos via HTTP range |
| Journal | Create / edit / delete (in-memory; resets on page reload) |
| Clips | Trim & save (in-memory, points at full source) |
| Sharing | Generate a share link → `/share/{token}` route works in-session |
| Upload | Simulates a 90% progress bar + processing stage, then adds a new card to the library (in-memory) |
| Auth | Auto-logged-in as "Demo Director" — login/register pages still work cosmetically |

The friendly **Demo mode banner** at the top of every page tells visitors
they're looking at the seeded version and links to your GitHub repo.

## 5. README polish

Once Vercel gives you the URL, edit `README.md` and replace `<YOUR-VERCEL-URL>`
in the badges section, then `git push`. Vercel will auto-redeploy.

## 6. To run the *real* full-stack version locally

The mock layer is a single env var; flip it off and `docker compose up`:

```bash
# frontend/.env.local
NEXT_PUBLIC_MOCK_MODE=false
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
NEXT_PUBLIC_WS_BASE_URL=ws://localhost:8000
```

Then:

```bash
docker compose -f devops/docker/docker-compose.yml up -d --build
docker compose -f devops/docker/docker-compose.yml exec app alembic upgrade head
```

Open <http://localhost> — now you're running FastAPI + Postgres + Redis +
ffmpeg + nginx + Prometheus + Grafana, end to end. See [`RUNBOOK.md`](RUNBOOK.md).

## Troubleshooting

| Symptom | Fix |
|---|---|
| Vercel build fails: `module not found` | Confirm Root Directory is `frontend` — not the repo root. |
| Page loads but no videos | Check the env var: must be **exactly** `NEXT_PUBLIC_MOCK_MODE=true`. Re-deploy after adding. |
| Sample videos won't play | Google's bucket is rate-limited per IP; refresh in a few seconds. Replace URLs in `src/lib/mock-data.ts` with your own if needed. |
| ESLint blocks build | Vercel runs `next build` which runs ESLint. We already disabled the offending rules in `.eslintrc.json`. |
