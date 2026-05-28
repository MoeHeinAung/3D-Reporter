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

## 2026-05-28 — Lottery Database Schema & Domain Rules

- **Source:** User-provided table definitions and business constraints for the 3D lottery reporting system.
- **Logic:**
  - **Draw Lifecycle:** Draws follow a strict linear state machine: `OPEN → CLOSED → SETTLED`. No backward transitions are permitted. Only one draw may be OPEN at any time. A draw's `cutoff_time` gates whether sales can be recorded — once `datetime('now')` exceeds it, even an OPEN draw rejects sales.
  - **Sales & Batches:** Sales are always grouped under a `batch`, which ties them to a specific `agent` and `draw`. A batch's `total_amount` is the denormalized sum of its sales and is maintained automatically. A sale's batch must reference the same `draw_id` and `agent_id` as the sale itself.
  - **Risk Management (Offloading):** The Admin/House retains only `house_holding_amount` per ticket. Any sale amount exceeding this limit must be recorded in the `offloaded` table, assigned to a `master_dealer`. A single ticket may have multiple offload entries if sold multiple times. Offloading is rejected once a draw is SETTLED.
  - **Blacklist — HALF:** When a winning ticket appears in the blacklist with type `HALF`, the prize payout is reduced by 50%. This is enforced at the application/service layer (payout calculation), not at the database level.
  - **Blacklist — BLOCK:** When a ticket is blacklisted as `BLOCK`, the sale amount must not be held by the Admin/House — it goes directly to a master dealer via the `offloaded` table. The database trigger enforces this by *rejecting* direct `sales` inserts for BLOCK-listed tickets, forcing the application to route the entry through `offloaded` with an explicit `master_dealer_id`.
  - **Tickets:** Ticket numbers are 1-3 digit numeric strings (`[0-9]` only, length 1-3). This is enforced at the column level via CHECK constraints across `sales`, `offloaded`, `blacklist_tickets`, and `winning_tickets`.
  - **Entities:** Agents and Master Dealers are separate entity types, each with their own commission, jp_factor, and sp_factor driving payout calculations.
  - **Winning Tickets:** A draw can have multiple winning tickets, categorized as either 'Jackpot' or 'Minor'. A `(draw_id, ticket, type)` combination must be unique. Setting winning tickets is only allowed while the draw is not already SETTLED (to prevent mid-settlement changes). Announcing winners triggers report calculation — this is application-layer logic.
- **Affects:** `backend/schema.sql`, future service layer (settlement reports, payout calculations, risk offloading).

## 2026-05-28 — SQLite Schema Design Decisions

- **Source:** DDL schema generation for the lottery reporting system.
- **Logic:**
  - **Natural keys for parties:** `agents.id` and `master_dealers.id` are user-defined varchar(3) codes, not auto-generated integers. These are the business identifiers operators use.
  - **Surrogate keys for transactions:** `draws`, `batches`, `sales`, `offloaded`, `blacklist_tickets`, and `winning_tickets` all use `INTEGER PRIMARY KEY AUTOINCREMENT` — standard SQLite idiom for auto-incrementing row IDs.
  - **Denormalization tradeoff:** `batches.total_amount` is a cached sum of `sales.amount` maintained by triggers. This avoids aggregate queries on every batch listing at the cost of trigger complexity on insert/update/delete of sales.
  - **Enum simulation:** SQLite lacks native ENUM types. All enum columns (`draws.status`, `blacklist_tickets.type`, `winning_tickets.type`) use TEXT with CHECK constraints listing valid values.
  - **Timestamp convention:** All `created_at` columns use `TEXT NOT NULL DEFAULT (datetime('now'))`, storing ISO-8601 UTC strings. This is the recommended SQLite approach over INTEGER Unix timestamps for human-readability.
  - **Unique constraints prevent duplicate classifications:** `blacklist_tickets` and `winning_tickets` have `UNIQUE(draw_id, ticket, type)`, preventing the same ticket from being blacklisted with the same type twice or winning in the same category twice within a draw.
- **Affects:** `backend/schema.sql`.

## 2026-05-28 — Single-Open-Draw with Mandatory Settlement Constraint

- **Source:** User-directed business rule enforcement during Draw page implementation.
- **Logic:**
  - At any given time, only **one draw** may be in the `OPEN` status. This was already enforced in the service layer.
  - Additionally, **all other draws must be in `SETTLED` status** before a new draw can be opened. Specifically, no draw may be left in `CLOSED` status when opening a new draw. This prevents the accumulation of unsettled draws and enforces a strict lifecycle: `OPEN → CLOSED → SETTLED` with no ability to "skip" settlement.
  - The constraint is enforced in `DrawService.open_draw()` via `DrawRepository.has_pending_closed()`, which checks for any row with `status = 'CLOSED'`. If any exist, a `ConflictError` is raised.
  - The mock backend in `bridge.ts` mirrors this constraint for consistent behavior during frontend development.
- **Affects:** `backend/services/draw_service.py`, `backend/repositories/draw_repository.py`, `frontend/src/api/bridge.ts`.
