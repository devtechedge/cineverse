# Cineverse — Design System

> Dark, cinematic, content-first. Inspired by Netflix, Letterboxd, and the Criterion Channel.

---

## 1. Color Tokens

| Token | Hex | Use |
|-------|-----|-----|
| `bg-base` | `#0a0a0a` | App background, hero letterbox |
| `bg-surface` | `#1a1a1a` | Cards, panels, modals |
| `bg-elevated` | `#242424` | Hover states, dropdowns |
| `bg-overlay` | `rgba(0,0,0,0.6)` | Video text overlay scrim |
| `border-subtle` | `#2a2a2a` | Card borders |
| `border-strong` | `#3a3a3a` | Inputs |
| `text-primary` | `#f5f5f5` | Body, headings |
| `text-secondary` | `#a3a3a3` | Meta, timestamps |
| `text-muted` | `#6b6b6b` | Disabled, placeholder |
| `accent` | `#e50914` | Primary action, focus ring |
| `accent-hover` | `#ff1a25` | Hover |
| `accent-muted` | `#7a0a10` | Pressed |
| `success` | `#2ecc71` | Upload complete |
| `warning` | `#f39c12` | Processing |
| `danger` | `#e74c3c` | Errors |

---

## 2. Typography

| Role | Family | Weight | Size / line-height |
|------|--------|--------|--------------------|
| Display (hero) | **Bebas Neue**, fallback `Impact, sans-serif` | 400 | 96 / 96 (clamp 56 → 120) |
| H1 | Inter | 700 | 40 / 48 |
| H2 | Inter | 600 | 28 / 36 |
| H3 | Inter | 600 | 22 / 30 |
| Body | Inter | 400 | 16 / 24 |
| Small | Inter | 400 | 14 / 20 |
| Caption | Inter | 500 | 12 / 16, tracking 0.04em, uppercase |
| Mono (timecodes) | JetBrains Mono | 500 | 14 / 20 |

Display headings: `letter-spacing: 0.02em`, mixed-case allowed; never use Bebas for body or buttons.

---

## 3. Spacing Scale (4 px base)

`0 · 4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 · 96 · 128 · 192`

Tailwind tokens map 1:1 (`p-1` = 4 px). Sections use vertical rhythm of multiples of 24 px.

---

## 4. Radii / Shadows

| Token | Value |
|-------|-------|
| `radius-sm` | 4 px |
| `radius-md` | 8 px (cards) |
| `radius-lg` | 16 px (modals) |
| `radius-pill` | 9999 px (tag chips) |
| `shadow-card` | `0 4px 24px rgba(0,0,0,0.4)` |
| `shadow-elevated` | `0 12px 48px rgba(0,0,0,0.6)` |
| `shadow-glow-accent` | `0 0 24px rgba(229,9,20,0.35)` |

---

## 5. Motion

| Token | Duration | Easing | Use |
|-------|----------|--------|-----|
| `motion-fast` | 150 ms | `ease-out` | hover, focus |
| `motion-ui` | 300 ms | `cubic-bezier(0.2, 0.8, 0.2, 1)` | toggles, drawers |
| `motion-scroll` | 600 ms | `cubic-bezier(0.16, 1, 0.3, 1)` | hero parallax, section snap |
| `motion-cinematic` | 1200 ms | `cubic-bezier(0.65, 0, 0.35, 1)` | thumbnail zoom-ins |

Reduced motion: respect `prefers-reduced-motion`; replace transforms with fades, disable scroll-linked parallax.

---

## 6. Grid & Breakpoints

| Name | Min width | Columns | Gutter |
|------|----------|---------|--------|
| xs | 0 | 4 | 16 px |
| sm | 640 | 6 | 16 px |
| md | 768 | 8 | 24 px |
| lg | 1024 | 12 | 24 px |
| xl | 1440 | 12 | 32 px |
| 2xl | 1920 | 12 | 48 px |

Max content width: 1440 px; hero sections are full-bleed.

---

## 7. Component Inventory

| Component | Purpose |
|-----------|---------|
| `HeroSection` | Full-viewport video slide with title, journal excerpt, scroll-linked opacity/parallax |
| `VideoCard` | Library thumbnail card with title, duration pill, tag chips, hover-zoom |
| `VideoPlayer` | Custom HTML5 player: controls, markers, keyboard shortcuts, clip trimmer overlay |
| `Timeline` | Horizontal seekable bar with journal markers + clip range handles |
| `JournalEditor` | TipTap editor with "Insert timestamp" toolbar button, autosave |
| `JournalSidebar` | Slide-in panel listing entries grouped by minute |
| `ClipTrimmer` | Two-handle range over timeline, preview button, save modal |
| `UploadDropzone` | Drag/drop with active/accepted/rejected states |
| `UploadQueue` | List of files with per-row progress + status badge |
| `TagChip` | Pill, accent border, clickable filter |
| `Navbar` | Sticky translucent; logo, library, upload, avatar dropdown |
| `Toast` (Sonner) | Bottom-right, accent-tinted variants |
| `Modal` | Centered overlay with `Esc`/click-outside close |
| `Skeleton` | Shimmering placeholder for cards/lists/players |
| `EmptyState` | Icon + heading + CTA (e.g., library zero state) |

---

## 8. Accessibility

- All interactive elements meet WCAG AA contrast (text ≥ 4.5:1; large ≥ 3:1).
- Visible focus ring: `0 0 0 2px #0a0a0a, 0 0 0 4px #e50914`.
- Keyboard shortcuts documented + togglable in settings.
- Hero videos: `aria-hidden`, decorative; meaningful text is real DOM.
- Captions: future enhancement, schema reserves `subtitle_path` column.

---

## 9. Iconography

Lucide-react, stroke 1.5, 20 px default. No emoji in UI.

---

## 10. Tone & Voice

Brief, confident, filmic. "Your moments, framed." Never marketing-fluffy.
