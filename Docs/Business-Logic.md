# Business Logic & Domain Rules

This document captures business logic, domain rules, constraints, and core ideas extracted from user prompts, design discussions, and implementation work. Each entry records the source context, the logic in plain language, and which part of the system it affects.

---

## 2026-05-28 — Viewport-Locked Dashboard Architecture

- **Source:** Design reference documents (`Page-Grid-Layout-Reference.html`, `Navbar-and-background-reference.html`), user-directed layout refactoring.
- **Logic:**
  - The application viewport is strictly locked to `100vw × 100vh` with `overflow: hidden` at the `html`/`body` level. No global scrollbars are permitted under any circumstance.
  - All layout uses a 12-column × 8-row CSS Grid system with a 24px gap. Row height is calculated as `(100% - (7 × 24px)) / 8`.
  - Content that exceeds a card's boundary must use internal `.scroll-container` (Strategy A: `overflow-y: auto`) or internal pagination (Strategy B: `overflow: hidden` with page controls). The grid row must never expand to accommodate content.
  - The navbar is a fixed-height (48px) element outside the grid, in a flex column wrapper. The remaining viewport height is consumed by the 12×8 grid via `flex-grow: 1` with `min-height: 0`.
  - The application has no sidebar — content spans all 12 columns.
  - A 32px grid-pattern background (subtle cyan lines) and a translucent 12×8 grid overlay sit behind cards.
- **Affects:** Entire frontend layout architecture — `_grid.scss`, `_reset.scss`, `_navbar.scss`, `App.tsx`.

## 2026-05-28 — Design System: "Futuristic Precision"

- **Source:** Project initialization, SCSS architecture, design tokens.
- **Logic:**
  - **Color palette (Dark Mode):** Void Black (`#0d1516`), Obsidian (`#0A1525`), Striker Blue / Cyan (`#00F0FF`), Neural Violet (`#8A2BE2`), Alert Red (`#FF0055`).
  - **Typography:** Headings use Tektur (sci-fi display), body uses Instrument Sans, telemetry/data uses JetBrains Mono (tabular-nums).
  - **Glassmorphism:** Cards and panels use frosted glass (`backdrop-filter: blur(12px)`) with `rgba(10, 21, 37, 0.7)` backgrounds and subtle white borders.
  - **Corner accents:** Cards have 48px bracket accents at top-left and bottom-right corners via `::before`/`::after` pseudo-elements.
  - **Theme:** Dark mode is default. A theme toggle switches between `data-theme="dark"` and `data-theme="light"` on `<html>`. Theme preference is persisted via the Python backend.
  - **Animations:** Scanline effect (3s linear), hologram pulse (2s ease-in-out), digital ping, fade-in-up entrance. All gated by `prefers-reduced-motion` media query.
- **Affects:** `_tokens.scss`, `_theme.scss`, `_mixins.scss`, `_card.scss`, `_animations.scss`.

## 2026-05-28 — Desktop Application Shell

- **Source:** `main.py`, `api/bridge.ts`, subprocess incident log.
- **Logic:**
  - The application runs as a pywebview desktop app. The Python backend (`main.py`) spawns a Vite dev server as a subprocess and loads it in a native window.
  - On Windows, `npx`/`npm` are `.cmd` batch files — `subprocess.Popen` with `shell=False` must explicitly target `npx.cmd`/`npm.cmd`.
  - Vite startup detection uses a daemon thread reading stdout, signaling readiness when `"Local:"` appears. Error keywords or early process exit trigger immediate failure.
  - The frontend communicates with the Python backend via `window.pywebview.api`, with a mock fallback for browser-based development.
- **Affects:** `main.py`, `frontend/src/api/bridge.ts`.

## 2026-05-28 — 5-Layer Backend Architecture

- **Source:** KNOWN_ERRORS.md architectural guardrails.
- **Logic:**
  - **API Layer:** Handles only HTTP concerns (request parsing, response formatting). No business logic.
  - **Service Layer:** All domain logic lives here — status transitions, risk math, validation. This is the single source of truth for business rules.
  - **Repository Layer:** All data persistence flows through here. Direct database access from any other layer is forbidden.
  - **Database Layer:** SQLite with Alembic migrations. Views, triggers, and indices are version-controlled.
  - **Frontend Layer:** Handles only presentation and interaction. No domain logic.
  - **Hard rules:** No logic leakage between layers. No layer skipping (e.g., frontend → database directly). API → Service → Repository pipeline is mandatory.
- **Affects:** Backend architecture, all API routes, all service modules.
