# Implementation Log

This document records feature implementations and significant structural changes, organized chronologically.

---

## 2026-05-28 — Layout Refactoring to Reference Grid Standard

### IMPL-001: Remove Sidebar, Adopt Flex-Wrapper + 12×8 Grid Layout

- **Rationale:** The `Docs/Page-Grid-Layout-Reference.html` reference defines a strict viewport-locked layout with a flex column wrapper (navbar + main grid) and no sidebar. The previous implementation embedded the navbar inside a single all-in-one grid and dedicated 3 of 12 columns to a sidebar, reducing content space.
- **Changes:**
  - **`_grid.scss`:** Replaced `.app-shell` (single grid) with `.page-layout` (flex column wrapper) + `.main-content` (12×8 grid using `flex-grow: 1` and `min-height: 0`). Removed `.grid-sidebar` and `.grid-navbar` placement classes. Kept grid utility classes (`col-X`, `row-X`, `col-start-X`, etc.).
  - **`_navbar.scss`:** Changed navbar height from `height: 100%` (relative to a grid row) to `height: var(--navbar-height)` (fixed 60px) with `flex-shrink: 0` for the flex layout.
  - **`_tokens.scss`:** Added `--navbar-height: 60px` design token.
  - **`App.tsx`:** Restructured DOM from `app-shell > nav + aside + main` to `page-layout > nav + main.main-content`. Removed `<aside>` sidebar. System Info moved into a card in the main grid. Cards redistributed: System Info (3×4), Risk Telemetry (5×4), Operational Status (4×4), Quick Actions (12×4 full-width bottom row).
- **Files:** `frontend/src/styles/components/_grid.scss`, `frontend/src/styles/components/_navbar.scss`, `frontend/src/styles/abstracts/_tokens.scss`, `frontend/src/App.tsx`

### IMPL-002: Navbar & Background Redesign from Reference

- **Rationale:** `Docs/Navbar-and-background-reference.html` defines a 48px frosted-glass navbar with a center trapezoid logo, 12px Inter nav links with active underline indicators, a 32px grid-pattern background, and a translucent 12×8 grid overlay behind cards. The previous navbar used a 60px height with a neon cyan bottom edge and a small left-aligned trapezoid logo.
- **Changes:**
  - **`_tokens.scss`:** Changed `--navbar-height` from 60px to 48px. Updated `--color-void` to `#0d1516` and `--color-obsidian` to `#0A1525` to match reference palette. Added `--navbar-bg`, `--navbar-border`, `--navbar-trapezoid-bg`, `--grid-line-color`, `--grid-cell-size`.
  - **`_reset.scss`:** Replaced solid `background` on body with dual-linear-gradient grid pattern (32px cells, `--grid-line-color` lines over `--color-bg-root`).
  - **`_background.scss` (new):** `.grid-overlay` — absolutely-positioned 12×8 grid placed behind cards at 20% opacity. Each cell has a `primary/20` border and `primary/5` fill.
  - **`_navbar.scss`:** Complete rewrite. 48px height with `rgba(2,6,23,0.9)` background + 12px backdrop blur. Subtle `1px solid rgba(255,255,255,0.05)` bottom border (replaces neon cyan edge). Three-section layout: left nav links, center trapezoid (64px tall, overflows navbar, inset glow + bottom cyan line), right section. Nav links use 12px Inter Bold Uppercase with `border-bottom: 2px solid primary` active indicator.
  - **`App.tsx`:** Restructured navbar to three-section layout (`navbar__left` + `navbar__trapezoid` + `navbar__right`). Added 96-cell `.grid-overlay` inside `main-content`. Cards get `zIndex: 1, position: relative` to sit above the overlay.
- **Files:** `frontend/src/styles/abstracts/_tokens.scss`, `frontend/src/styles/base/_reset.scss`, `frontend/src/styles/components/_background.scss` (new), `frontend/src/styles/components/_navbar.scss`, `frontend/src/styles/main.scss`, `frontend/src/App.tsx`

### IMPL-003: Client-Side Routing with react-router-dom

- **Rationale:** Replace static `<a href="#">` navbar links with a proper client-side router. The navbar was reorganized into a three-section layout: Left (Draws, Partners, Report), Center trapezoid (Dashboard — the primary entry point), Right (Sales, Risk, Settings). Each link maps to a lazy-loaded route.
- **Changes:**
  - **`main.tsx`:** Wrapped app in `BrowserRouter` with a parent `<Route element={<App />}>` (the layout shell) and 7 child routes: index (`/` → Dashboard), `/draws`, `/partners`, `/report`, `/sales`, `/risk`, `/settings`.
  - **`App.tsx`:** Refactored into a layout shell — keeps the `page-layout`, grid overlay, and navbar; renders child routes via `<Outlet />`. Moved Dashboard-specific cards into the Dashboard page. Extracted navbar into its own component.
  - **`components/Navbar.tsx` (new):** Extracted navbar with `NavLink` components. Each link uses `className` callback for active-state styling. The center trapezoid text is now a `<NavLink to="/" end>` for the Dashboard entry point. Receives `uptime` and `onToggleTheme` props.
  - **`pages/*.tsx` (7 new files):** `Dashboard.tsx` (existing cards), plus placeholder pages for Draws, Partners, Report, Sales, Risk, Settings — each renders a full-width card in the 12×8 grid.
  - **`_navbar.scss`:** Added `text-decoration: none` to `&__trapezoid-text` and `&__link:hover` to prevent default link underlines from `_reset.scss`.
- **Files:** `frontend/src/main.tsx`, `frontend/src/App.tsx`, `frontend/src/components/Navbar.tsx` (new), `frontend/src/pages/Dashboard.tsx` (new), `frontend/src/pages/Draws.tsx` (new), `frontend/src/pages/Partners.tsx` (new), `frontend/src/pages/Report.tsx` (new), `frontend/src/pages/Sales.tsx` (new), `frontend/src/pages/Risk.tsx` (new), `frontend/src/pages/Settings.tsx` (new), `frontend/src/styles/components/_navbar.scss`

## 2026-05-28 — Database Schema (SQLite3 DDL)

### IMPL-004: Core Schema for 3D Lottery Reporting System

- **Rationale:** The application requires a structured SQLite3 database to manage draws, agents, master dealers, sales, batches, risk offloading, blacklist rules, and winning ticket tracking. All business constraints (draw lifecycle, blacklist enforcement, offloading rules) must be enforced at the database level wherever possible.
- **Changes:**
  - **`backend/schema.sql` (new):** Complete DDL with 8 tables (`agents`, `master_dealers`, `draws`, `batches`, `sales`, `offloaded`, `blacklist_tickets`, `winning_tickets`), 12 indexes on FK and lookup columns, and 12 triggers enforcing:
    - Single active draw constraint (only one OPEN at a time)
    - Linear status transitions (`OPEN → CLOSED → SETTLED`, no backwards moves)
    - Sales gating (draw must be OPEN, cutoff must not have passed)
    - Batch-to-sale integrity (batch must match sale's draw_id and agent_id)
    - BLOCK blacklist enforcement (direct sales of BLOCK-listed tickets rejected)
    - Batch total_amount denormalization (auto-synced on sales insert/update/delete)
    - Offload/winnings protection (no modifications against SETTLED draws)
  - **Column-level constraints:** Ticket numbers validated as 1-3 digit numeric strings via CHECK. Enum values constrained via CHECK IN clauses. Amounts must be positive integers.
  - **Unique constraints:** `(draw_id, ticket, type)` on both `blacklist_tickets` and `winning_tickets` to prevent duplicate classifications.
- **Files:** `backend/schema.sql` (new)

## 2026-05-28 — Architecture Refactoring & Standards

### IMPL-005: Comprehensive Architecture Refactoring

- **Rationale:** The documented 5-layer architecture (API → Service → Repository → Database) was only partially implemented. The backend was a flat module with business logic embedded in the API bridge. The database schema existed as a `.sql` file with no ORM models or connectivity. The frontend used direct API calls from components instead of zustand stores and custom hooks. No tests or coding standards existed.
- **Changes:**
  - **Backend Foundation (8 files):** `config.py` (centralized settings), `errors.py` (AppError hierarchy), `logging_config.py` (structured logging), `database/connection.py` (SQLAlchemy engine singleton + session factory + `init_db()`), `database/models.py` (9 SQLAlchemy 2.0 ORM models matching schema.sql + Preference model for key-value settings).
  - **Repository Layer (9 files):** `repositories/base.py` (generic `BaseRepository[T]` with CRUD), 8 entity-specific repositories (Agent, MasterDealer, Draw, Batch, Sale, Offloaded, BlacklistTicket, WinningTicket) each extending the base with domain query methods.
  - **Service Layer (6 files):** `services/system_service.py` (system info, uptime), `services/theme_service.py` (theme preference with legacy JSON migration), `services/risk_service.py` (placeholder), `services/draw_service.py` (state machine with OPEN→CLOSED→SETTLED transitions, single-open enforcement), `services/sales_service.py` (validation cascade — draw status, cutoff, batch integrity, BLOCK blacklist, ticket format, batch total sync).
  - **API Refactoring:** `api.py` rewritten as thin delegation layer with `_with_session()` helper for transactional session lifecycle. All business logic extracted to services. Theme migrated from `data/preferences.json` to `preferences` table.
  - **Frontend Foundation (10 files):** `types/api.ts` (API contract types), `types/domain.ts` (domain entity interfaces), `stores/themeStore.ts` + `stores/systemStore.ts` (zustand stores), `hooks/useTheme.ts` + `hooks/useSystemInfo.ts` + `hooks/useUptime.ts` + `hooks/useApi.ts` (custom hooks).
  - **Frontend Refactoring:** `App.tsx` simplified from 57 to ~35 lines (pure layout shell, no data fetching), `Navbar.tsx` reads from stores directly (no props), `Dashboard.tsx` uses `useSystemInfo()` hook. `bridge.ts` updated with new API method signatures and types.
  - **Documentation (3 files):** `ARCHITECTURE.md` (layer diagram, data flow, design decisions, database schema), `CODING_STANDARDS.md` (Python, TypeScript, SCSS, testing, Git conventions), `CLAUDE.md` updated with architecture rules, layer constraints, and commands.
  - **Tests (8 files):** `tests/conftest.py` (in-memory SQLite fixtures), `test_models.py`, `test_repositories/test_base.py`, `test_services/test_system_service.py`, `test_services/test_theme_service.py`. `requirements.txt` updated with pytest, pytest-cov.
- **Files:** 35 created, 9 modified, 0 deleted. See `ARCHITECTURE.md` and `CODING_STANDARDS.md` for the full reference.
