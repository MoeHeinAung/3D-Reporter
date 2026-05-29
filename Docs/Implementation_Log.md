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

## 2026-05-28 — Draw Page Implementation

### IMPL-006: Draw Management Page with Split-Panel Layout

- **Rationale:** The Draws page was a placeholder ("coming soon"). It needed full CRUD capability for draws and management of associated blacklist/winning tickets, laid out according to the grid reference coordinates (Column 4/13, Row 1/5 for the main draw table; Column 4/13, Row 5/8 for ticket management).
- **Changes:**
  - **`pages/Draws.tsx`:** Complete rewrite — split-panel layout with clickable draw list (Column A), detailed summary view (Column B), "Insert New Draw" button opening a modal form with fields for openDate, cutoffTime, houseHoldingAmount, and note. Dedicated Edit and Delete actions per draw item (later refined to SVG icon buttons). Ticket management section with tabbed interface toggling between blacklist and winning ticket tables, each with create/delete capability via modals.
  - **`styles/components/_draws.scss` (new):** Styles for split layout (`.draws__split`, `.draws__list`, `.draws__summary`), list items with active/hover states, status badges (OPEN/CLOSED/SETTLED with distinct colors), tab menu (`.draws__tabs`, `.draws__tab`), ticket table (`.draws__ticket-table`), modal overlay + dialog (`.modal-overlay`, `.modal`), icon buttons (`.icon-btn` with hover glow effects), spinner animation (`@keyframes spin`), and state placeholders for loading/error/empty.
  - **Backend — `services/blacklist_service.py` (new):** Blacklist ticket management with type validation (HALF/BLOCK), create, get_by_draw, and delete operations.
  - **Backend — `services/winning_service.py` (new):** Winning ticket management with type validation (Jackpot/Minor), create, get_by_draw, and delete operations.
  - **Backend — `services/draw_service.py`:** Extended with `get_all_draws()`, `update_draw()`, and `delete_draw()` methods.
  - **Backend — `repositories/draw_repository.py`:** Added `has_pending_closed()` query method.
  - **Backend — `api.py`:** Added 12 new API endpoints: `get_all_draws`, `get_draw`, `update_draw`, `delete_draw`, `get_blacklist_tickets`, `create_blacklist_ticket`, `delete_blacklist_ticket`, `get_winning_tickets`, `create_winning_ticket`, `delete_winning_ticket`, plus `api_mode` for backend detection.
  - **Frontend — `api/bridge.ts`:** Added 12 new typed bridge methods with a shared `MockState` interface for the in-memory mock backend.
  - **Frontend — `types/api.ts`:** Added `BlacklistTicketResult`, `WinningTicketResult`, `DeleteResult` types.
- **Files:** `frontend/src/pages/Draws.tsx` (rewrite), `frontend/src/styles/components/_draws.scss` (new), `frontend/src/styles/main.scss` (updated), `backend/services/blacklist_service.py` (new), `backend/services/winning_service.py` (new), `backend/services/draw_service.py`, `backend/repositories/draw_repository.py`, `backend/api.py`, `frontend/src/api/bridge.ts`, `frontend/src/types/api.ts`

### IMPL-007: Single-Open-Draw Business Constraint

- **Rationale:** The draw lifecycle already enforced only one OPEN draw at a time, but allowed CLOSED (unsettled) draws to accumulate. The business rule requires all non-OPEN draws to be fully SETTLED before a new draw can be opened. This prevents orphaned CLOSED draws from piling up without settlement.
- **Changes:**
  - **`services/draw_service.py`:** `open_draw()` now checks `has_pending_closed()` after the existing OPEN-draw guard. If any CLOSED draw exists, it raises a `ConflictError`: "Cannot open a new draw: one or more draws are CLOSED but not yet SETTLED. Settle all CLOSED draws before opening a new one."
  - **`repositories/draw_repository.py`:** Added `has_pending_closed()` — returns `True` if any row has `status = 'CLOSED'`.
  - **Mock backend:** `open_draw()` mock mirrors the constraint, checking for both existing OPEN and pending CLOSED draws before allowing creation.
- **Files:** `backend/services/draw_service.py`, `backend/repositories/draw_repository.py`, `frontend/src/api/bridge.ts`

### IMPL-008: UI Refinement — Icon Buttons & Aesthetic Enhancement

- **Rationale:** Replace textual "Edit" and "Delete" buttons with minimal SVG icon buttons to match the futuristic HUD aesthetic. Enhance overall polish while preserving the existing glassmorphism card design, color palette, and 12×8 grid layout.
- **Changes:**
  - **`pages/Draws.tsx`:** Replaced all `<button>Edit</button>` / `<button>Delete</button>` text buttons with `<button class="icon-btn"><EditIcon/></button>` pattern. Added three inline SVG icon components: `EditIcon` (pencil), `DeleteIcon` (trash), `CloseIcon` (X). Updated draw list items with a two-line info layout (date + cutoff time). Added summary header with title + large status badge. Shortened tab labels ("Blacklist Ticket Table" → "Blacklist Tickets"). Added Retry button on error states. Added `selectedDrawId` sync effect to auto-select first draw after deletion.
  - **`styles/components/_draws.scss`:** Added `.icon-btn` styles (30×30px, transparent bg, hover glow with primary/danger color variants), `.icon-btn__svg` (14×14px, pointer-events none), `.draws__spinner` (20px rotating border spinner), `.draws__summary-header` (title + badge flex row), `.draws__list-item-info` (stacked date + cutoff), `.draws__badge--lg` (larger badge variant). Enhanced badge backgrounds with translucent color tints. Improved tab hover states and border transitions.
  - **`styles/components/_navbar.scss`:** Added `.mock-banner` styles for the mock mode indicator banner (red-tinted background, monospace code element).
- **Files:** `frontend/src/pages/Draws.tsx`, `frontend/src/styles/components/_draws.scss`, `frontend/src/styles/components/_navbar.scss`

### IMPL-009: Mock Backend Transparency & Sync Fix

- **Rationale:** Users running `npm run dev` for frontend development were confused by mock data (5 hardcoded draws) not matching the real SQLite database (1 draw). Blacklist tickets created via the UI appeared to succeed but never persisted to disk. The mock needed to be transparent about its nature and start in a fresh state.
- **Changes:**
  - **`api/bridge.ts`:** Cleared `_mockDraws` to `[]` and reset `_nextDrawId` to `1`. Added `api_mode()` method returning `'mock'`. Defined shared `MockState` interface for all mock `this` types. Fixed `open_draw` mock to push to `_mockDraws` and enforce business constraints. Fixed `close_draw`/`settle_draw` to mutate status in-place. Fixed `get_open_draw` to search the live array.
  - **`App.tsx`:** Added `apiMode` state, calls `api.api_mode()` on mount, renders `.mock-banner` when mode is `'mock'`.
  - **`api.py`:** Added `api_mode()` returning `'pywebview'`. Added `IntegrityError` catch in `_with_session()` returning "A record with that data already exists."
- **Files:** `frontend/src/api/bridge.ts`, `frontend/src/App.tsx`, `frontend/src/styles/components/_navbar.scss`, `backend/api.py`

### IMPL-010: Partners Page — Agent & Master Dealer Management

- **Rationale:** The Partners page was a placeholder ("coming soon"). It needed full CRUD tables for agents and master dealers — the two entity types managing lottery ticket sales and payouts. The implementation reuses the tabbed table pattern, modal forms, icon buttons, and state handling established on the Draws page.
- **Changes:**
  - **`pages/Partners.tsx`:** Complete rewrite — single card at grid position Column 4/13, Row 1/8 with a tabbed interface toggling between "Agent Table" and "Master Dealer Table." Each tab shows a scrollable table with columns: ID, Name, Commission, JP Factor, SP Factor, Note, and icon action buttons (Edit, Delete). Header contains tabs + "Insert Agent"/"Insert Master Dealer" button that opens a modal form. Form fields: ID (disabled on edit, natural key varchar), Name, Commission, JP Factor, SP Factor, Note. Reuses inline SVG icon components (`EditIcon`, `DeleteIcon`, `CloseIcon`) and all SCSS classes from `_draws.scss` (`.draws__tabs`, `.draws__tab`, `.draws__ticket-table`, `.draws__ticket-table-wrapper`, `.draws__state`, `.draws__spinner`, `.icon-btn`, `.modal-*`).
  - **`services/agent_service.py` (new):** Thin CRUD service wrapping `AgentRepository` with `get_all`, `get_by_id`, `create`, `update`, `delete`.
  - **`services/master_dealer_service.py` (new):** Thin CRUD service wrapping `MasterDealerRepository` with `get_all`, `get_by_id`, `create`, `update`, `delete`.
  - **`api.py`:** Added 8 new endpoints: `get_all_agents`, `create_agent`, `update_agent`, `delete_agent`, `get_all_master_dealers`, `create_master_dealer`, `update_master_dealer`, `delete_master_dealer`.
  - **`api/bridge.ts`:** Added 8 new typed bridge methods (`get_all_agents`, `create_agent`, `update_agent`, `delete_agent`, `get_all_master_dealers`, `create_master_dealer`, `update_master_dealer`, `delete_master_dealer`) with mock implementations using `_mockAgents` and `_mockMasterDealers` arrays. Extended `MockState` interface and added `PartnerResult` type.
  - **`types/api.ts`:** Added `PartnerResult` interface (`{ id: string, name: string }`).
- **Files:** `frontend/src/pages/Partners.tsx` (rewrite), `backend/services/agent_service.py` (new), `backend/services/master_dealer_service.py` (new), `backend/api.py`, `frontend/src/api/bridge.ts`, `frontend/src/types/api.ts`

## 2026-05-28 — Sales Page Implementation

### IMPL-011: Sales Management Page with Agent List, Multi-Line Input, and Batch-Grouped Table

- **Rationale:** The Sales page was a placeholder ("coming soon"). It needed a complete sales recording workflow: agent selection, multi-line ticket/amount entry with real-time validation, batch auto-creation, and a batch-grouped table with expandable rows showing individual sale records.
- **Changes:**
  - **`pages/Sales.tsx`:** Complete rewrite in multiple stages:
    - **Stage 1 — Split Layout:** Agent list (left, 320px) with clickable agent items showing ID, name, commission, JP/SP factors, and a "+" button per agent. Right panel showing agent detail summary (commission, factors, sales count, total amount) and a flat sales table (ID, Ticket, Amount, Note). Sale form modal with individual Ticket + Amount + Note inputs. Loading, error, empty states throughout.
    - **Stage 2 — Multi-Line Input + Real-Time Validation:** Replaced individual Ticket/Amount inputs with a single textarea using a mirror technique (transparent textarea overlaid on a backdrop `<div>` that renders line-by-line colored backgrounds). Invalid lines get a red-tinted background (`rgba(255, 0, 85, 0.15)`) in real-time as the user types. Validation rules: ticket must be exactly 3 digits (`000`–`999`), a non-digit separator must appear between ticket and amount, amount must be a valid numeric value. Parsing rules applied per line: Dual Amount (two numbers → `TTT = N1/N2`), R Indicator (single number + R → `TTT R N`), Standard (single number → `TTT = N`).
    - **Stage 3 — Record Generation + Confirmation Modal:** Replaced flat line parsing with a record-generation engine that produces individual `SaleEntry[]` per line based on three rules: **Direct** (`123 = 1000` → 1 record), **Round** (`123 R 1000` → all unique permutations of ticket digits sharing the same amount, e.g., 6 records for `123`), **Dual** (`123 = 2000/1000` → first permutation gets first amount, remaining get second amount). Added a `generatePermutations()` function handling repeated digits (e.g., `001` → 3 perms, `000` → 1 perm). Added a Note input field applied to all generated records. Renamed submit button to "Sale." Added a confirmation modal appearing after clicking "Sale" showing Draw ID, Agent Name, records table (Ticket + Amount), and total amount.
    - **Stage 4 — Batch-Grouped Table:** Replaced the agent detail summary and flat sales table with a batch-grouped table. Columns: Batch ID, Agent Name, Tickets (count), Total Amount — all sortable (click header to toggle asc/desc). Clicking a batch row expands it to reveal individual sales (Ticket, Amount, Note). Table footer showing Total Batches and Total Amount. Agent filtering: selecting an agent filters to their batches; clicking the active agent deselects and shows "All Agents." Clicking empty space in the agent list panel or the card header also deselects.
  - **Backend — `repositories/sale_repository.py`:** Added `get_by_draw(draw_id)` query method.
  - **Backend — `repositories/batch_repository.py`:** Added `get_by_draw_and_agent(draw_id, agent_id)` query method.
  - **Backend — `services/sales_service.py`:** Added `get_sales_by_draw(draw_id)` and `get_or_create_batch(draw_id, agent_id)` (auto-creates a batch if none exists for the draw+agent pair).
  - **Backend — `api.py`:** Added `get_sales_by_draw` and `get_or_create_batch` API endpoints.
  - **Frontend — `api/bridge.ts`:** Added typed bridge methods for `get_sales_by_draw`, `get_or_create_batch` with full mock implementations (in-memory sales and batches storage). Extended `MockState` interface. Updated `record_sale` mock to store entries and update batch totals.
  - **Frontend — `types/api.ts`:** Added `SaleRecord` and `BatchInfo` interfaces.
  - **Frontend — `styles/components/_draws.scss`:** Added styles for: mirror textarea (`.sales__input-container`, `.sales__input-backdrop`, `.sales__backdrop-line--warn`), confirmation table wrapper (`.sales__confirm-table-wrapper`), sortable column headers (`.sales__sortable`, `.sales__sort-arrow`), batch rows (`.sales__batch-row` with hover highlight), child rows (`.sales__child-row` indented), expand icon (`.sales__expand-icon`), table footer (`.sales__table-footer`).
  - **Frontend — `components/Navbar.tsx`:** Removed uptime clock, green status dot, and theme toggle button. Removed `useTheme` and `useUptime` imports.
- **Files:** `frontend/src/pages/Sales.tsx` (rewrite), `backend/repositories/sale_repository.py`, `backend/repositories/batch_repository.py`, `backend/services/sales_service.py`, `backend/api.py`, `frontend/src/api/bridge.ts`, `frontend/src/types/api.ts`, `frontend/src/styles/components/_draws.scss`, `frontend/src/components/Navbar.tsx`

## 2026-05-29 — Dynamic Financial Report Page

### IMPL-012: Report Page with Conditional Winning Ticket Logic and Export

- **Rationale:** The Report page was a placeholder ("coming soon"). It needed a complete financial report engine generating per-agent, per-dealer, and admin/house consolidated sections with conditional winning ticket integration, commission/payout calculations, and a PNG export feature.
- **Changes:**
  - **Backend — `repositories/sale_repository.py`:** Added `get_sales_grouped_by_agent(draw_id)` — sums sale amounts grouped by agent. Added `get_by_ticket_grouped_by_agent(draw_id, ticket)` — sums sale amounts for a specific ticket grouped by agent for winning ticket attribution.
  - **Backend — `repositories/offloaded_repository.py`:** Added `get_offloads_grouped_by_dealer(draw_id)` — sums offloaded amounts grouped by master dealer. Added `get_by_ticket_grouped_by_dealer(draw_id, ticket)` — sums offloaded amounts for a specific ticket grouped by dealer.
  - **Backend — `services/report_service.py` (new):** Core report generation engine. Named tuples: `WinningTicketDetail`, `AgentReportLine`, `DealerReportLine`, `AdminReportSection`, `ReportData`. Implements: commission as `amount * commission / 100` (percentage), payout as `amount * jp_factor` (Jackpot) or `amount * sp_factor` (Minor) with HALF-blacklist reducing payout by 50%. Winning tickets appear in all sections that touched them (agent, dealer, admin). Admin-held winning ticket amounts are prorated across agents who sold the ticket, with payouts using each agent's factors. Grand total formula: `SubtotalSales + SubtotalOffloads + CommissionFromMDs - ALL_Payouts`.
  - **Backend — `api.py`:** Added `generate_report(draw_id)` bridge method serializing all named tuples to camelCase dicts.
  - **Frontend — `types/api.ts`:** Added 5 new interfaces: `WinningTicketDetail`, `AgentReportLine`, `DealerReportLine`, `AdminReportSection`, `ReportData`.
  - **Frontend — `api/bridge.ts`:** Added `generate_report(draw_id)` to `PywebviewAPI` interface. Added full mock implementation with in-memory state aggregation replicating the backend calculation logic.
  - **Frontend — `pages/Report.tsx`:** Full rewrite from placeholder. Controls bar (Row 1) with draw selector dropdown, "Generate Report" button, and "Export as Image" button. Report content (Rows 2-8) with three sections: Agent Section (per-agent sales, commission, subtotal, winning tickets, total), Master Dealer Section (per-dealer offloads, commission to admin, subtotal, winning tickets, total), Admin/House Consolidated (total sales, commission payable, subtotal, total offloaded, commission from MDs, subtotal, admin-held winning tickets, grand total). Conditional rendering: when `hasWinningTickets` is false, winning ticket rows are omitted. States: loading (scanline), error (banner + retry), empty (prompt to generate), normal (full report). Export via html2canvas capturing a hidden-rendered clean template — downloaded as `Report_Draw{N}.png`.
  - **Frontend — `styles/components/_report.scss` (new):** Report-specific styles: section titles, party cards (per-agent/dealer), financial tables (JetBrains Mono monospaced), subtotal/total/grand-total rows with cyan accents, winning ticket rows with Neural Violet coloring and HALF badge, export template styling.
  - **Frontend — `styles/main.scss`:** Imported `components/report`.
- **Files:** `backend/repositories/sale_repository.py`, `backend/repositories/offloaded_repository.py`, `backend/services/report_service.py` (new), `backend/api.py`, `frontend/src/types/api.ts`, `frontend/src/api/bridge.ts`, `frontend/src/pages/Report.tsx` (rewrite), `frontend/src/styles/components/_report.scss` (new), `frontend/src/styles/main.scss`
