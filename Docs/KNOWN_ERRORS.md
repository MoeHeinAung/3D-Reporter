# Incident Analysis and Resolution Reference

This document serves as a strategic reference for common errors, logical issues, and technical incidents encountered during the development of 3D-Striker-Net. It focuses on the intent behind resolutions and serves as a guide for preventing regressions.

## 1. Environment & Infrastructure
**Challenge:** Ensuring consistency across the backend, database, and desktop shell.

*   **Database Path Fragmentation**
    *   **Context:** Different layers (Alembic, API, Desktop Shell) targeting different `app.db` locations.
    *   **Resolution:** Enforce `PROJECT_ROOT` based pathing in the centralized configuration. Mandate absolute root targeting for all database operations to prevent "lost data" scenarios.
*   **Database View Initialization Failures**
    *   **Context:** Application crashes due to missing SQLite views required for complex risk calculations.
    *   **Resolution:** Transition to automated migration management (Alembic). Ensure all views, triggers, and indices are defined within versioned migrations.
*   **Circular Dependency Crashes**
    *   **Context:** Backend startup failures caused by importing models too early in the database initialization phase.
    *   **Resolution:** Defer model imports to specific scopes (e.g., inside the migration environment or service functions) rather than the global database base class.
*   **Windows Subprocess Resolution**
    *   **Context:** `subprocess.Popen` fails with `FileNotFoundError` for `npm`/`npx` on Windows, despite the commands being available in the terminal.
    *   **Resolution:** On Windows, `npm` and `npx` are `.cmd` batch files that `Popen` with `shell=False` cannot resolve. Detect `sys.platform` and append `.cmd` explicitly (`"npm.cmd"` / `"npx.cmd"`). Do not use `shell=True` as a workaround; it introduces injection risk and cross-platform inconsistency.
*   **Long-Running Subprocess I/O Deadlocks**
    *   **Context:** Reading `proc.stdout` in a blocking `for` loop causes the parent process to hang when the child (a dev server) stops producing output but never exits.
    *   **Resolution:** Drain subprocess stdout from a daemon `threading.Thread`. Use a `threading.Event` signaled by key output (e.g., `"Local:"`) for readiness detection. Poll `proc.poll()` to detect early process death and fail fast rather than waiting for the full timeout.

## 2. Architectural Guardrails
**Challenge:** Maintaining the integrity of the 5-layer system.

*   **Logic Leakage (Thin Layer Violation)**
    *   **Context:** Business logic (status transitions, risk math) creeping into API routes or React components.
    *   **Resolution:** Strict delegation. API routes handle only HTTP concerns; UI components handle only interaction. All domain logic must reside exclusively in the `Service` layer.
*   **Direct Database Access (Layer Skipping)**
    *   **Context:** Frontend or external scripts attempting to query SQLite directly.
    *   **Resolution:** Enforce the `Repository` pattern. All data persistence must flow through the API -> Service -> Repository pipeline to ensure validation and security.
*   **Unsafe Resource Targeting**
    *   **Context:** Modification of files outside the "Allowed Files" scope, leading to unintended regressions.
    *   **Resolution:** Rigid adherence to task-specific white-listing and "Scope Locks" before any code generation or editing.

## 3. Frontend Runtime & State
**Challenge:** Stability and consistency of the "Futuristic Precision" UI.

*   **Stale Form State (Ant Design Persistence)**
    *   **Context:** Modals retaining values from previous operations, causing validation failures or "ghost" submissions.
    *   **Resolution:** Implement mandatory form resets upon modal visibility changes and disable persistent data caching for UI forms using `preserve={false}` and `destroyOnClose`.
*   **ESM Module Resolution Failures**
    *   **Context:** Runtime `SyntaxError` when importing from TypeScript files that contain only interfaces (which are erased during transpilation).
    *   **Resolution:** Mandate the use of `import type` for all interface-only imports. Ensure every source file contains at least one concrete runtime export to prevent empty JS files.
*   **Data Flow Crashes (Null Safety)**
    *   **Context:** UI crashes when receiving incomplete data or empty arrays from the backend.
    *   **Resolution:** Enforce defensive UI programming. Use `Array.isArray()` checks before rendering and null-safe numeric formatting (e.g., `value ?? 0`) for all telemetry data.
*   **SCSS Module System Hygiene**
    *   **Context:** Compilation failures from `@use 'sass:math'` omission, and deprecation warnings from the legacy `if()` function syntax in Sass >=1.100.
    *   **Resolution:** Every `.scss` partial that calls `math.div()` must declare `@use 'sass:math';` at the top. Prefer `@if`/`@else` directive blocks over the legacy ternary `if($cond, $then, $else)` function. When a component file references mixins from another module, it must explicitly `@use` that module — the Sass module system does not leak globals across files.
*   **TypeScript Path Alias Deprecation**
    *   **Context:** TypeScript 6.0 deprecates `baseUrl` when used alongside `paths`, warning it will stop functioning in TS 7.0.
    *   **Resolution:** When `moduleResolution` is `"bundler"`, Vite handles alias resolution at build time, but `tsconfig` `paths` remain necessary for IDE support. Add `"ignoreDeprecations": "6.0"` to silence the warning until a `paths`-only replacement is available. Monitor the TS 7.0 migration guide for the successor syntax.
*   **Vite Configuration Drift**
    *   **Context:** Experimental or version-specific Vite config keys (e.g., `css.preprocessorOptions.scss.api`) break type-checking after a Vite major upgrade.
    *   **Resolution:** Keep `vite.config.ts` minimal. Remove any key that `tsc` reports as non-existent in the current Vite type definitions. Features like the modern Sass compiler API are auto-detected by Vite when the installed `sass` package supports them.

## 4. Logical & Business Rules
**Challenge:** Accuracy in the gaming and risk management domain.

*   **Draw Lifecycle Violations**
    *   **Context:** Recording sales for draws that are already closed or settled.
    *   **Resolution:** Implement a strict "Active Draw" constraint in the service layer. Validate all transactions against the `OPEN` status and the hard `cutoff_time` timestamp.
*   **Risk Calculation Mismatches**
    *   **Context:** Inconsistent "Exceed Amount" values due to differing calculation logic between separate views or layers.
    *   **Resolution:** Centralize all risk aggregation math within the backend `Repository` layer. Use a standardized "Success Envelope" to ensure the UI remains a reflection of the database state.
*   **Validation Mismatches**
    *   **Context:** IDs or tickets being accepted by the UI but rejected by database constraints.
    *   **Resolution:** Synchronize Pydantic schemas and TypeScript types. Use shared Regex patterns to enforce strict validation (e.g., 3-digit tickets, 3-letter IDs) across all layers.

## 6. Database Correctness & Configuration

**Challenge:** Ensuring SQLite is correctly configured for multi-connection concurrency and data integrity.

*   **Foreign Keys Disabled by Default**
    *   **Context:** SQLite3 defaults to `PRAGMA foreign_keys=OFF`. Foreign key constraints in ORM models (`ForeignKey("agents.id")`, etc.) were not enforced at the database level. Orphan records (batches referencing non-existent agents, sales referencing non-existent draws) could be created despite ORM-level relationship declarations.
    *   **Resolution:** Add a `@event.listens_for(Engine, "connect")` listener in `connection.py` that executes `PRAGMA foreign_keys=ON` on every new connection. This must happen per-connection — WAL mode persists across connections, but `foreign_keys` does not. Also add `busy_timeout=5000` and `synchronous=NORMAL` for concurrency safety.
*   **Database Views Never Installed**
    *   **Context:** `views.sql` defines `v_current_draw_ticket_sales` and `v_current_draw_ticket_offloads` — views that join against the OPEN draw for risk calculations. The file existed but was never referenced by any Python code.
    *   **Resolution:** `init_db()` in `connection.py` now reads and executes `views.sql` after `create_all()`. Each statement is split on `;` and executed individually via a raw connection.
*   **Database View Installation Not Idempotent**
    *   **Context:** `views.sql` used bare `CREATE VIEW` statements. On the first startup this succeeds (no views exist), but on every subsequent startup it crashes with `sqlite3.OperationalError: view ... already exists`. The `init_db()` docstring claims the function is "idempotent — safe to call on every startup," but `_install_views()` violated that contract.
    *   **Resolution:** Use `CREATE VIEW IF NOT EXISTS` for all views in `views.sql`. This is the SQLite-compatible idempotent form (SQLite does not support `CREATE OR REPLACE VIEW`). Any view definition change that requires a schema update should be handled via migration scripts, not by crashing on startup.
*   **Missing UNIQUE Constraint on Batch**
    *   **Context:** The business rule "one batch per draw per agent" was enforced only by `get_or_create_batch()`'s lookup-then-create pattern, which is vulnerable to race conditions under concurrent access.
    *   **Resolution:** Add `UniqueConstraint("draw_id", "agent_id", name="uq_batch_draw_agent")` to the Batch model. SQLAlchemy will create the constraint on next `create_all()`. On existing databases, check for duplicate `(draw_id, agent_id)` pairs before migrating.
*   **Missing Entity Validation in Foreign Key Chains**
    *   **Context:** `get_or_create_batch()` checked draw existence but not agent existence. `create_offload()` did not validate that the `master_dealer_id` references a real dealer. With FKs disabled, these gaps allowed orphan batch and offload records.
    *   **Resolution:** Both services now validate the referenced entity exists before creating records, raising `NotFoundError` if not found. This complements the FK PRAGMA fix — validation at both the application and database layers.

## 7. Business Logic Defects

**Challenge:** Core domain logic errors that silently produced incorrect behavior.

*   **Cutoff Time String Comparison**
    *   **Context:** `datetime.utcnow().isoformat() > draw.cutoff_time` performs lexicographic string comparison. `datetime.utcnow().isoformat()` returns `"2026-05-29T06:30:00.123456"` while `draw.cutoff_time` stores `"14:00"` (from `<input type="time">`). String comparison: `"2" > "1"` is always `True` — ALL sales and offloads are immediately rejected regardless of actual time.
    *   **Resolution:** Parse `cutoff_time` properly — try ISO format first, then `HH:MM` combined with `open_date` to form a full datetime. Use `datetime.now(UTC) > cutoff_dt` for semantic comparison. Applies to both `sales_service.py` and `offload_service.py`.
*   **Note Clearing Semantics (Sentinel Pattern)**
    *   **Context:** Services used `if note is not None:` to gate updates, treating `None` as "unchanged." But the frontend sends `note || undefined` (which becomes `None` via pywebview) when the user clears a note field. Notes could never be cleared.
    *   **Resolution:** Use a module-level `_UNSET = object()` sentinel. `None` means "explicitly clear the note." `_UNSET` (the sentinel) means "not provided — don't change." Applies to `agent_service.py`, `master_dealer_service.py`, and `draw_service.py`.
*   **Draw Update Missing Status-Gated Validation**
    *   **Context:** `update_draw()` allowed unrestricted modification of all fields regardless of draw status. A SETTLED draw could have its `open_date`, `cutoff_time`, or `house_holding_amount` changed — breaking report integrity and settlement finality.
    *   **Resolution:** SETTLED draws are now immutable except for the `note` field. `open_date` must match YYYY-MM-DD format. `cutoff_time` must be HH:MM or ISO. `house_holding_amount >= 0` enforced.

## 8. Query Performance Anti-Patterns

**Challenge:** N+1 queries in critical paths causing unnecessary database round trips.

*   **ReportService Nested-Loop Repository Calls**
    *   **Context:** `_agent_winning_tickets()` called `get_by_ticket_grouped_by_agent()` per winning ticket per agent — O(agents × winners). Same pattern in `_dealer_winning_tickets()`. `_build_admin_section()` called `_total_sales_for_ticket()` + `_total_offloads_for_ticket()` per winning ticket, each invoking `get_ticket_totals()` and scanning the full result.
    *   **Resolution:** Fetch all sales and offloads once in `generate_report()`. Build six precomputed dicts in-memory. Pass to section builders — all dict lookups are O(1), eliminating every repository call from inner loops.
*   **OffloadService Loop Scanning Full Result Sets**
    *   **Context:** Inside the `for entry in entries` loop, `get_ticket_totals()` was called for sales AND offloads, and each call's full result was scanned with a `sum(... if row[0] == ticket)` comprehension — O(entries × all_tickets) for each totals call.
    *   **Resolution:** Precompute `sales_totals` and `offload_totals` dicts once before the loop. Track accumulated offloads in-memory as entries are created so subsequent entries see the updated totals.

## 5. UX & Aesthetic Integrity
**Challenge:** Adherence to the "Futuristic Precision" design system.

*   **Layout Overflow**
    *   **Context:** Content expansion breaking the "HUD" aesthetic by introducing global scrollbars.
    *   **Resolution:** Enforce a strict non-scrolling viewport architecture (`100vh`). Utilize localized scroll containers (`.scroll-container`) within rigid grid cards to manage content overflow.
*   **Aesthetic Drift**
    *   **Context:** Introduction of standard UI elements that clash with the sci-fi theme.
    *   **Resolution:** Strictly follow the `design-system.md` specifications. Use the centralized SCSS theme for "Void Black" backgrounds and "Neon" accents, maintaining a consistent 12x8 grid layout.
*   **Mock/Real Backend Desync (Data Visibility)**
    *   **Context:** Frontend displays data (draws, tickets) that doesn't match what's in the SQLite database. New records created through the UI don't appear in the database file.
    *   **Resolution:** This occurs when `npm run dev` is used instead of `python main.py`. The mock backend (`getAPI()` in `bridge.ts` with no `window.pywebview.api`) uses in-memory arrays that never touch SQLite. Always run the desktop app via `python main.py` when database persistence is required. The mock is for UI development only. A red "MOCK MODE" banner now appears at the top of the app when the mock backend is active, and the mock starts with an empty data set to avoid false impressions of pre-existing records. The `api_mode()` method can be used to programmatically check which backend is active (`'mock'` vs `'pywebview'`).
*   **Animation Namespace Collision**
    *   **Context:** Attempting to invoke a CSS `@keyframes` animation or utility class via `@include` (Sass mixin syntax), causing compilation failure.
    *   **Resolution:** Maintain a strict separation in the SCSS architecture: `@keyframes` and utility classes (`.pulse-hologram`, `.digital-ping`) belong to the CSS cascade and are consumed via `animation:` properties or class names. Reusable logic blocks (`glass-panel`, `corner-accent`) belong to mixins and are consumed via `@include`. Never cross the streams — if it's defined with `@keyframes` or `.class`, it's not a mixin.


## 9. SQL Multi-Statement Execution (Semicolon Splitting)

**Challenge:** SQLite trigger and view bodies contain semicolons, making naive string splitting unsafe.

*   **Semicolon Splitting Breaks Triggers and Views**
    *   **Context:** Using str.split(';') to separate multi-statement SQL (triggers, views) and executing each fragment with exec_driver_sql(). Trigger bodies contain their own semicolons (e.g., SELECT COALESCE(SUM(amount), 0); inside BEGIN...END), causing the split to produce incomplete statements.
    *   **Resolution:** Use connection.connection.executescript(sql) which delegates to SQLite's native executescript() -- a multi-statement parser that understands statement boundaries including nested semicolons inside trigger bodies, view definitions, and compound SELECTs. Never split SQL by semicolon when the script contains triggers or views.

## 10. Report Calculation Sign Conventions (Admin Cash Flow)

**Challenge:** Correctly modeling cash flow direction in financial settlement reports.

*   **Dealer Cash Flow Sign Reversal**
    *   **Context:** The admin grand total treated dealer offloads as income (+ subtotal_offloads) and dealer prize payouts as expense (- dealer_payout_total). From admin's perspective: admin PAYS dealers the net offloaded amount (cash out = negative), and dealers PAY admin their share of prizes (cash in = positive). The signs were reversed.
    *   **Resolution:** Use the admin cash-flow perspective consistently:
      - subtotal_sales: agents pay admin (cash in)
      - agent_payout_total: admin pays agents prizes (cash out)
      - subtotal_offloads: admin pays dealers net offloaded (cash out)
      - dealer_payout_total: dealers pay admin prizes (cash in)
      - Per-ticket: total_sold - agent_settlement + master_recovery - total_offloaded
    *   **Verification:** Always verify report formulas against CalculationWorkflow.md Section 10 (Example Verification). The expected values for the standard example (100K sales, 80K offloaded, 20K hold, 15pct agent/40pct master commission, JP=500) are: losing scenario = 37,000 profit; winning scenario = -9,963,000 loss.