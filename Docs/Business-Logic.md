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

## 2026-05-28/29 — Multi-Line Ticket Parsing & Record Generation Rules

- **Source:** Sales page implementation, `Docs/formatter.html` reference, user-directed parsing rule refinement.
- **Logic:**
  - **Input Format:** Each line of the sales textarea contains a 3-digit ticket followed by a separator and an amount. Format: `{ticket}{separator}{amount}` where ticket is exactly 3 digits (`000`–`999`) and separator is any non-digit character (space, `=`, `R`, `/`, `-`, etc.).
  - **Ticket Validation:** The first 3 characters of each line are the ticket. They MUST be exactly 3 numeric digits (`/^\d{3}$/`). `"000"` is valid; `"A01"` is invalid. The 4th character MUST be a non-digit (separator required between ticket and amount); `"1234567"` is invalid ("Missing separator between ticket and amount").
  - **Amount Parsing Rules** (applied per line, first match wins):
    - **Rule 4 — Dual Amount:** Body matches `(\d+)[Rr\/\s\=\-\.\+\~]+(\d+)` → two numbers separated by a delimiter. Generates all unique permutations of the ticket digits. The **first permutation** gets amount1, all **remaining permutations** get amount2. E.g., `"123 = 2000/1000"` produces: `123=2000`, `132=1000`, `213=1000`, `231=1000`, `312=1000`, `321=1000`.
    - **Rule 3 — R Indicator (Round):** Body contains `R`/`r`/`®` with a single number (and Rule 4 did not match). Generates all unique permutations of the ticket digits, **all sharing the same amount**. E.g., `"123 R 1000"` produces 6 records: `123=1000`, `132=1000`, `213=1000`, `231=1000`, `312=1000`, `321=1000`.
    - **Rule 2 — Direct (Standard):** Body contains a single number. Creates exactly **one record** with the original ticket and the parsed amount. E.g., `"123 = 1000"` → `{ticket: "123", amount: 1000}`.
  - **Permutation Generation:** For a 3-digit ticket, all unique permutations of the digit string are generated. Duplicate permutations caused by repeated digits are deduplicated via a `Set`: `"123"` → 6 unique perms; `"001"` → 3 unique perms (`001`, `010`, `100`); `"000"` → 1 perm.
  - **Real-Time Validation Feedback:** The textarea uses a mirror technique — a backdrop `<div>` renders each line with conditional background coloring. Invalid lines (bad ticket format, missing separator, missing amount) receive a red-tinted background (`rgba(255, 0, 85, 0.15)`) immediately as the user types. A line-count indicator shows `"N records / M warn"`.
  - **Sale Recording Workflow:** User enters lines → validates → clicks "Sale" → confirmation modal shows Draw ID, Agent Name, generated records list, and total amount → click "Confirm & Record" → batch is auto-created via `get_or_create_batch` (first sale for that draw+agent) → all records are inserted via `record_sale` with the shared note and batch ID.
- **Affects:** `frontend/src/pages/Sales.tsx` (`parseSalesInput`, `generatePermutations`), `backend/services/sales_service.py`, `Docs/formatter.html`.

## 2026-05-29 — Batch-Grouped Sales Table with Filtering & Sorting

- **Source:** Sales page table refactoring, user-directed column mapping and interaction requirements.
- **Logic:**
  - **Batch as Grouping Unit:** Sales records are grouped by `batchId` — each batch represents a logical grouping of sales for a specific agent within a draw. A batch row displays: Batch ID, Agent Name (resolved from the agents list), ticket count, and total amount. Clicking a batch row expands it to reveal individual sale records (Ticket, Amount, Note) as indented child rows.
  - **Column Mapping:** The table replaces the raw sale "ID" column with "Batch ID" (the database batch identifier). A new "Agent Name" column is added, resolved by joining the sale's `agentId` against the loaded agents list. "Tickets" shows the count of sales in the batch. "Total Amount" is the sum of all sale amounts in the batch.
  - **Filtering:** Agent selection in the left panel filters the table. Selecting an agent shows only batches belonging to that agent. Deselecting (clicking the active agent again, or clicking empty space in the agent list panel or card header) resets to "All Agents" showing all batches for the current draw.
  - **Sorting:** All four columns (Batch ID, Agent Name, Tickets, Total Amount) are sortable. Clicking a column header sorts ascending; clicking again toggles to descending. A sort arrow indicator (▴/▾) appears on the active column; idle columns show a faint arrow on hover.
  - **Footer:** A fixed footer bar below the table displays "Total Batches: N" and "Total Amount: X" aggregated across all currently filtered records.
- **Affects:** `frontend/src/pages/Sales.tsx` (`batchGroups`, `sortedGroups`, `filteredSales`), `frontend/src/styles/components/_draws.scss`.

## 2026-05-29 — Remediation: Cutoff Time Validation, Draw Immutability, Note Clearing, Error Codes

- **Source:** Executive Summary audit, remediation plan implementation.
- **Logic:**
  - **Cutoff Time Parsing:** Cutoff times may arrive in two formats: bare `HH:MM` (from `<input type="time">`) or full ISO-8601 timestamps. The comparison against current time must parse both — `HH:MM` values are combined with the draw's `open_date` to form a full UTC datetime before comparison. String comparison (the prior implementation) is incorrect because `"2026-05-29T..." > "14:00"` always evaluates `True` due to lexicographic ordering (`"2" > "1"`).
  - **Draw Immutability After Settlement:** Once a draw reaches `SETTLED` status (terminal state), only the `note` field may be modified. `open_date`, `cutoff_time`, and `house_holding_amount` are frozen — any attempt to change them raises `ValidationError`. This enforces settlement finality and report integrity.
  - **Note Clearing Semantics:** The `note` parameter on update methods uses a sentinel pattern (`_UNSET = object()`). `None` means "explicitly clear the note" (set column to NULL). The `_UNSET` sentinel means "not provided — leave unchanged." This distinguishes "the user cleared the note field" from "the note field wasn't in the request."
  - **Structured Error Codes:** Every `AppError` carries an `error_code` string for programmatic handling: `NOT_FOUND` (resource missing), `VALIDATION_ERROR` (input rejected), `CONFLICT` (business rule violation), `INTEGRITY_ERROR` (database constraint), `INTERNAL_ERROR` (unexpected). The frontend `ApiError` type includes an optional `errorCode` field.
  - **Entity Validation in FK Chains:** Before creating a Batch, the referenced Agent must exist. Before creating an Offloaded record, the referenced Master Dealer must exist. These checks complement database-level FK enforcement.
- **Affects:** `backend/services/sales_service.py`, `backend/services/offload_service.py`, `backend/services/draw_service.py`, `backend/services/agent_service.py`, `backend/services/master_dealer_service.py`, `backend/errors.py`, `backend/api.py`, `frontend/src/types/api.ts`.

## 2026-05-29 — Database Configuration Requirements

- **Source:** Executive Summary audit, database correctness remediation.
- **Logic:**
  - **Foreign Keys Per-Connection:** SQLite3 requires `PRAGMA foreign_keys=ON` on every new connection. Unlike `journal_mode=WAL` which persists across connections, `foreign_keys` is connection-scoped. An `@event.listens_for(Engine, "connect")` listener is the canonical SQLAlchemy pattern.
  - **WAL Mode Persistence:** `PRAGMA journal_mode=WAL` is set once via a raw connection in `init_db()`. It persists for the lifetime of the database file. WAL mode allows concurrent reads while a write is in progress, preventing "database is locked" errors.
  - **Busy Timeout:** `PRAGMA busy_timeout=5000` (5 seconds) tells SQLite to wait and retry when encountering a locked database, rather than failing immediately with `SQLITE_BUSY`.
  - **Synchronous Mode:** `PRAGMA synchronous=NORMAL` balances safety and performance — the database syncs at critical moments but not on every write, appropriate for a desktop application.
  - **Views as Schema Objects:** Database views (`v_current_draw_ticket_sales`, `v_current_draw_ticket_offloads`) are schema objects that must be created after tables. `init_db()` executes `views.sql` after `create_all()`, using `CREATE VIEW` statements that are idempotent (safe to re-run).
- **Affects:** `backend/database/connection.py`, `backend/database/views.sql`.

- **Source:** User-directed report page specification with dynamic winning ticket integration and export-as-image feature.
- **Logic:**
  - **Conditional Rendering:** The report has two modes based on whether winning tickets have been declared for the draw. When no winning tickets exist, only sales and commission data display. When winning tickets are declared, full payout calculations integrate into all sections.
  - **Commission Formula:** Commission is calculated as `amount * commission_rate / 100` (percentage). E.g., an agent with `commission = 5` receives 5% of total sales as commission.
  - **Payout Formula:** For Jackpot tickets, payout = `amount * jp_factor`. For Minor tickets, payout = `amount * sp_factor`. If the ticket is HALF-blacklisted, the payout is reduced by 50% (`payout // 2`). Payout factors are per-party: agents use their own `jp_factor`/`sp_factor`, master dealers use their own, and Admin uses the factors of the agent who sold the ticket (since Admin has no factors of its own).
  - **Winning Ticket Attribution:** A winning ticket appears in ALL sections that touched it. If Agent A sold ticket "123" for 10,000 and Dealer D was offloaded 6,000 of it — the ticket appears in Agent A's section (amount=10,000), Dealer D's section (amount=6,000), and Admin's section (amount=4,000, the unsold remainder). Each party's payout is calculated independently using their own factors.
  - **Admin-Held Winning Tickets:** For tickets not fully offloaded to dealers, the Admin/House holds the remainder. The admin-held amount is prorated across agents who sold the ticket: `admin_amount * agent_sales / total_ticket_sales`. Each prorated portion uses that agent's payout factors.
  - **Grand Total:** `SubtotalSales + SubtotalOffloads + CommissionFromMDs - ALL_Payouts`. This is the net Admin/House position — money from sales (minus agent commissions) + money from offloads (net of dealer commissions) + dealer commissions collected - all prize payouts owed.
  - **Agent Section Total:** `Subtotal - SUM(agent_winning_ticket_payouts)`. For agents with no winning tickets, Total = Subtotal.
  - **Dealer Section Total:** `Subtotal - SUM(dealer_winning_ticket_payouts)`. For dealers with no winning tickets, Total = Subtotal.
  - **Draw Filter:** The report works for any draw status (OPEN, CLOSED, SETTLED). A SETTLED draw produces the "final" report; OPEN/CLOSED draws produce an interim report reflecting current sales and offloads.
  - **Export as Image:** Uses html2canvas to capture a hidden-rendered template at 2x scale with dark background (`#0A0B0E`), downloaded as `Report_Draw{N}.png`.
- **Affects:** `backend/services/report_service.py`, `backend/api.py`, `frontend/src/pages/Report.tsx`, `frontend/src/types/api.ts`, `frontend/src/api/bridge.ts`.
