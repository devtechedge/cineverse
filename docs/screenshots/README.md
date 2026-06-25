# Screenshot capture guide

The README references the following PNG files. Capture each at **1440×900** in your browser, save as PNG with the exact filename, and drop in this folder. They'll auto-display in the repo README.

| File | Page | Setup |
|---|---|---|
| `01-hero.png` | <https://cineverse-fawn-two.vercel.app/> | Light mode, scrolled to top, Big Buck Bunny hero visible |
| `02-hero-dark.png` | same | Toggle dark mode, same view |
| `03-library.png` | `/library` | All 6 cards visible, no filters applied |
| `04-watch.png` | `/watch/1` | Player loaded, journal sidebar visible on right |
| `05-watch-mobile.png` | `/watch/1` | Resize browser to ≤640px or use device mode |
| `06-upload.png` | `/upload` | Drag-drop zone visible, queue empty |

## How to capture cleanly

**On macOS:**
1. Open the URL in Chrome/Safari
2. Resize window to exactly **1440 × 900** (use a tool like Rectangle, or DevTools → Device Toolbar → Responsive → set dimensions)
3. `⌘ + Shift + 4`, then `Spacebar`, then click the window
4. Rename to the filename above, drop in `docs/screenshots/`

**On Windows:**
1. Open the URL in Edge/Chrome
2. DevTools (F12) → Toggle device toolbar → Responsive → set 1440 × 900
3. `Win + Shift + S` → Window snip
4. Save with the exact filename

**Pro tip:** for the cleanest screenshots, **dismiss the demo banner** (click X) and **scroll past the navbar** when possible so the screenshot is purely the content. Use light mode for `01`, dark mode for `02` to show the theme system.

After dropping the PNGs in this folder, commit & push. They'll auto-appear in the README on github.com.
