# Multi-game
A multi game player for train journeys with a toddler.

Three two-player games for a grown-up and a 4-year-old on one iPhone:
**Animal Pairs**, **Bubble Pop** and **Snakes & Ladders**. See
[docs/PLAN.md](docs/PLAN.md) for the principles and user stories.

## Web MVP (`web/`)

A plain HTML/CSS/JS version that runs in Safari, built so the games can be
played before the native iOS app exists. There are no dependencies and no
build step.

- **Run locally:** `python3 -m http.server -d web 8000`, then open
  <http://localhost:8000>.
- **On an iPhone:** the repo is set up for GitHub Pages (deploy from a
  branch, root folder). The root `index.html` redirects to `web/`. Open
  <https://dfarrimond.github.io/Multi-game/web/> in Safari, then
  Share → Add to Home Screen. It opens full screen and the service worker
  (`sw.js`) caches it for offline play.
- **Single-file build:** `python3 scripts/build_artifact.py out.html` inlines
  the CSS and JS into one page, for hosts that wrap the page themselves.

Sounds are synthesised with Web Audio and words are spoken with the
browser's built-in speech, so there are no media files.

## Native app

Planned in SwiftUI once there's a Mac with Xcode to hand. The web MVP's game
rules (deck/turn logic in Animal Pairs, board/turn logic in Snakes & Ladders)
are written to port across directly.
