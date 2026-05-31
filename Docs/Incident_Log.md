# Incident Log — Error Encounter Record

This document records every error encountered during development, organized chronologically. Each entry captures the symptom, root cause, resolution, and the files affected. It serves as the raw material from which `KNOWN_ERRORS.md` distills lasting guardrails.

---

## 2026-05-29 — Executive Summary Audit Remediation

### INC-012: All sales and offloads rejected due to lexicographic cutoff string comparison

- **Symptom:** Every `record_sale()` and `create_offload()` call returned "Sales/Offloads are closed: cutoff time has passed." regardless of the actual time. No tickets could be sold or offloaded.
- **Root Cause:** `datetime.utcnow().isoformat() > draw.cutoff_time` uses string comparison. `datetime.utcnow().isoformat()` produces `"2026-05-29T06:30:00.123456"` while `draw.cutoff_time` stores `"14:00"` (from `<input type="time">`). The first character `"2"` is always lexicographically greater than `"1"`, so the comparison is always `True`.
- **Resolution:** Parse `cutoff_time` as a proper datetime. If it's `HH:MM` format, combine with `draw.open_date` to form a UTC-aware datetime. If it's a full ISO timestamp, parse directly. Compare using `datetime.now(UTC) > cutoff_dt` for semantic correctness.
- **Files:** `backend/services/sales_service.py`, `backend/services/offload_service.py`

### INC-013: Notes could not be cleared due to `if note is not None` guard

- **Symptom:** Clearing a note field in the UI and saving had no effect — the note remained unchanged in the database.
- **Root Cause:** Service-layer update methods used `if note is not None:` to gate the update, treating `None` as "unchanged." The frontend sends `note || undefined` (which becomes Python `None` via pywebview) when the user clears the note field.
- **Resolution:** Introduced `_UNSET = object()` sentinel. `None` now means "explicitly clear the note to NULL." The sentinel `_UNSET` means "not provided — don't change." Applied to `agent_service.py`, `master_dealer_service.py`, and `draw_service.py`.
- **Files:** `backend/services/agent_service.py`, `backend/services/master_dealer_service.py`, `backend/services/draw_service.py`

### INC-014: SETTLED draws allowed unrestricted field modification

- **Symptom:** After settling a draw, `open_date`, `cutoff_time`, and `house_holding_amount` could still be changed through the edit draw modal.
- **Root Cause:** `update_draw()` had no status-gated validation. Terminal SETTLED state was not enforced as immutable.
- **Resolution:** Added status check in `update_draw()` — if `draw.status == "SETTLED"`, only the `note` field may be modified. Attempts to change `open_date`, `cutoff_time`, or `house_holding_amount` raise `ValidationError`.
- **Files:** `backend/services/draw_service.py`

### INC-015: Foreign keys disabled at SQLite level — orphan records possible

- **Symptom:** Batches could be created for non-existent agents. Offloads could reference non-existent master dealers. Deleting an agent did not cascade-restrict its batches.
- **Root Cause:** SQLite3 defaults to `PRAGMA foreign_keys=OFF`. The ORM's `ForeignKey` declarations were not enforced at the database level.
- **Resolution:** Added `@event.listens_for(Engine, "connect")` listener that executes `PRAGMA foreign_keys=ON` on every connection. Complemented with application-level validation: `get_or_create_batch()` checks agent exists, `create_offload()` checks dealer exists. Also added `PRAGMA busy_timeout=5000` and `PRAGMA synchronous=NORMAL`.
- **Files:** `backend/database/connection.py`, `backend/services/sales_service.py`, `backend/services/offload_service.py`

### INC-016: Database views never installed — `views.sql` orphaned

- **Symptom:** `v_current_draw_ticket_sales` and `v_current_draw_ticket_offloads` views did not exist in the database despite `views.sql` being present in the repository.
- **Root Cause:** `views.sql` existed at `backend/database/views.sql` but was never imported or executed by any Python code. `init_db()` only called `Base.metadata.create_all()`.
- **Resolution:** Added `_install_views()` helper that reads `views.sql` and executes its statements. Called in `init_db()` after `create_all()`. Also added `PRAGMA journal_mode=WAL` in `init_db()`.
- **Files:** `backend/database/connection.py`

### INC-018: `CREATE VIEW` fails on second startup because view already exists

- **Symptom:** `python main.py` crashes with `sqlite3.OperationalError: view v_current_draw_ticket_sales already exists` on the second and subsequent startups. The first startup succeeds because no views exist yet.
- **Root Cause:** `_install_views()` in `connection.py` executes the raw SQL from `views.sql` which uses bare `CREATE VIEW` statements. On first run the views are created; on subsequent runs the statements fail because the views already exist in the database. `CREATE VIEW` has no `OR REPLACE` semantics in SQLite without `IF NOT EXISTS`.
- **Resolution:** Changed `CREATE VIEW` to `CREATE VIEW IF NOT EXISTS` for both `v_current_draw_ticket_sales` and `v_current_draw_ticket_offloads` in `views.sql`. This makes `_install_views()` truly idempotent, matching `init_db()`'s documented contract.
- **Files:** `backend/database/views.sql`

### INC-017: N+1 queries in ReportService causing excessive database round-trips

- **Symptom:** Report generation was slow for draws with many agents and winning tickets.
- **Root Cause:** `get_by_ticket_grouped_by_agent()` called per winning ticket per agent inside nested loops. Same for dealers. `get_ticket_totals()` called per winning ticket in admin section.
- **Resolution:** Fetch all sales and offload records once. Build six precomputed dicts in memory. Pass to section builders — all inner-loop repository calls replaced with O(1) dict lookups.
- **Files:** `backend/services/report_service.py`

## 2026-05-28 — SCSS Architecture & Frontend-Backend Bridge Setup

### INC-001: Sass `math.div()` called without module import

- **Symptom:** SCSS compilation fails with `Error: Undefined function math.div`.
- **Root Cause:** `_functions.scss` used `math.div()` without `@use 'sass:math'`.
- **Resolution:** Added `@use 'sass:math';` at the top of `_functions.scss`.
- **Files:** `frontend/src/styles/abstracts/_functions.scss`

### INC-002: Deprecated Sass `if()` function in v1.100

- **Symptom:** Four deprecation warnings on `_mixins.scss` lines 185-192. The old `if($condition, $then, $else)` syntax is removed in favor of `if(sass($condition): $then; else: $else)`.
- **Root Cause:** The `scroll-container` mixin used ternary-style `if()` for `overflow-y`, `overflow-x`, and scrollbar width/height.
- **Resolution:** Replaced with `@if`/`@else if`/`@else` directive blocks for clearer control flow and zero warnings.
- **Files:** `frontend/src/styles/abstracts/_mixins.scss`

### INC-003: `pulse-hologram` and `digital-ping` invoked as mixins

- **Symptom:** SCSS compilation error — `@include pulse-hologram` and `@include digital-ping` failed because those symbols are CSS keyframe/class names, not mixins.
- **Root Cause:** Confusion between the mixin namespace and the CSS animation class namespace. `_animations.scss` defines `@keyframes pulse-hologram` and `.digital-ping`, but these are not reusable via `@include`.
- **Resolution:** Replaced `@include pulse-hologram` with `animation: pulse-hologram var(--duration-pulse) ease-in-out infinite` and `@include digital-ping` with `animation: digital-ping var(--duration-slow) var(--ease-out-expo)`.
- **Files:** `frontend/src/styles/components/_card.scss`, `frontend/src/styles/components/_inputs.scss`

### INC-004: TypeScript 6.0 `baseUrl` deprecation

- **Symptom:** `tsc -b` exits code 1: `Option 'baseUrl' is deprecated and will stop functioning in TypeScript 7.0`.
- **Root Cause:** TypeScript 6.0 deprecates `baseUrl` when paired with `paths` under `moduleResolution: "bundler"`. Vite resolves aliases at build time, but removing `paths` breaks IDE import resolution.
- **Resolution:** Added `"ignoreDeprecations": "6.0"` to `tsconfig.app.json` compiler options. This buys time until a `paths`-only alias syntax stabilizes.
- **Files:** `frontend/tsconfig.app.json`

### INC-005: Vite 8 rejects `api: 'modern-compiler'` in SCSS options

- **Symptom:** `tsc -b` fails with `Type 'api' does not exist in type 'SassPreprocessorOptions'`.
- **Root Cause:** The `api` property was introduced experimentally in Vite 6/7 but removed or renamed by Vite 8. The Sass module system (`@use`/`@forward`) works without it.
- **Resolution:** Removed the `api` option from `css.preprocessorOptions.scss` in `vite.config.ts`. The empty config block remains as a documentation hook.
- **Files:** `frontend/vite.config.ts`

### INC-006: `subprocess.Popen` cannot find `npx` on Windows

- **Symptom:** `FileNotFoundError: [WinError 2] The system cannot find the file specified` when launching Vite from Python.
- **Root Cause:** On Windows, `npm` and `npx` are `npm.cmd` / `npx.cmd` batch files. `subprocess.Popen` with `shell=False` (the default) only resolves `.exe` files, not `.cmd`.
- **Resolution:** Added platform detection: `_NPX = "npx.cmd" if sys.platform == "win32" else "npx"` (same for `_NPM`).
- **Files:** `main.py`

### INC-007: Blocking stdout read loop hangs Vite startup

- **Symptom:** `_start_vite_dev()` never returns. The `for line in proc.stdout:` loop blocks indefinitely once Vite enters its steady state (stops producing output), and the unconsumed stdout buffer can block the Vite child process.
- **Root Cause:** A direct `for` loop over `proc.stdout` is only safe when the subprocess produces a bounded amount of output and then exits. A long-running server process produces unbounded output and must be drained continuously from a separate thread.
- **Resolution:** Moved stdout reading to a daemon `threading.Thread`. Used a `threading.Event` (`ready`) set when `"Local:"` appears in output. The main thread waits on `ready.wait(timeout=30)` instead of blocking on the pipe.
- **Files:** `main.py`

### INC-008: No fast-failure path when Vite reports startup errors

- **Symptom:** If Vite exits early (port conflict, missing dependency), the caller hangs for the full 30-second timeout before reporting a warning.
- **Root Cause:** Only the "success" condition (`"Local:" in line`) was checked. Error output and early process exit were not monitored.
- **Resolution:** Added a `failed` event triggered by `"error"` / `"Error"` keywords in Vite output. Added a polling loop with `proc.poll()` check (non-None means the process exited). Both conditions raise `SystemExit(1)` immediately.
- **Files:** `main.py`

### INC-009: `frontend/nul` artifact on Windows from Sass output redirect

- **Symptom:** A zero-byte file named `nul` appears in the `frontend/` directory.
- **Root Cause:** On Windows, `/dev/null` is not a valid path. Bash in this environment translates it to `nul` (the Windows null device) but the sass CLI writes it as a regular file when the path doesn't exist as a device.
- **Resolution:** Redirect Sass test output to a proper temp file or use the `--no-source-map` flag with no output argument. Cleaned the orphaned `nul` file.
- **Files:** n/a (environment artifact)

### INC-010: pywebview `_checkValue` crash on Python `float` return type

- **Symptom:** `Uncaught (in promise) TypeError: Cannot set properties of undefined (setting '<id>')` at `Object._checkValue` in pywebview's internal JS API layer. Occurs when `get_uptime_seconds()` is called via `setInterval` every 1 second.
- **Root Cause:** The Python API method `get_uptime_seconds` returns `round(time.time() - self._start_time, 1)` which is a Python `float`. pywebview's JS-side `_checkValue` deserializer tracks promise results on an internal registry object. Certain Python `float` values pass through a serialization path where the registry object is not yet initialized, causing the `Cannot set properties of undefined` error.
- **Resolution:** Changed return type from `float` to `int` using `int(time.time() - self._start_time)`. The frontend already applies `Math.floor()` in `formatUptime()`, so sub-second precision was never needed. Python `int` serializes cleanly through pywebview's bridge as a JS `number`.
- **Files:** `backend/api.py`

### INC-011: Frontend shows mock data despite real database having different records

- **Symptom:** Frontend displays 5 draws, database only has 1. Blacklist tickets created via UI don't appear in the SQLite database. Frontend and database are completely out of sync.
- **Root Cause:** The `getAPI()` function in `frontend/src/api/bridge.ts` falls back to a mock backend when `window.pywebview.api` is not available (i.e., when running `npm run dev` in a browser instead of via `python main.py`). The mock had 5 hardcoded pre-populated draws and in-memory-only ticket storage arrays. Nothing persisted to disk. The user was inspecting the real SQLite database while the frontend was operating against the mock.
- **Resolution:**
  - Cleared pre-populated mock draws (`_mockDraws: []`, `_nextDrawId: 1`) so the mock starts empty like a fresh database.
  - Added `api_mode()` method to both the Python API (`return "pywebview"`) and the mock (`return "mock"`). The React `App.tsx` now calls `api.api_mode()` on mount and renders a red banner: `MOCK MODE — Data is in-memory only. Run python main.py for real database.` when the mock is active.
  - Updated the mock's lifecycle methods (`open_draw`, `close_draw`, `settle_draw`, `get_open_draw`) to properly read/write the shared `_mockDraws` array, so CRUD operations work within a mock session.
  - Added `IntegrityError` handling in `_with_session()` to return user-friendly messages for duplicate blacklist/winning ticket creation instead of a generic "internal error."
- **Files:** `frontend/src/api/bridge.ts`, `frontend/src/App.tsx`, `frontend/src/styles/components/_navbar.scss`, `backend/api.py`

## 2026-05-31 — Backend Rebuild from TestingDatabase

### INC-019: SQL trigger installation fails with "incomplete input" error

- **Symptom:** `init_db()` crashed with `sqlite3.OperationalError: incomplete input` when executing the SQL triggers. The error occurred at the `END;` of the first trigger body — SQLite received a partial statement.
- **Root Cause:** The `_install_triggers()` method split the multi-statement trigger SQL on `;` characters. Since trigger bodies contain their own semicolons (e.g., `SELECT COALESCE(SUM(amount), 0)` is followed by `;` inside the body), the split produced fragments. The first fragment ended at the trigger body's first internal semicolon, producing an incomplete `CREATE TRIGGER` statement missing its `END`.
- **Resolution:** Replaced `conn.exec_driver_sql(stmt)` in a `for stmt in sql.split(";")` loop with `conn.connection.executescript(sql)` which uses SQLite's native multi-statement parser. This handles semicolons inside trigger/view bodies correctly. Applied the same fix to `_install_views()` for consistency.
- **Files:** `backend/database/connection.py`

### INC-020: Report grand total off by ~9x due to reversed dealer cash flow signs

- **Symptom:** Report generation produced grand total of -89,867,000 for the CalculationWorkflow.md example scenario. The expected value was -9,963,000.
- **Root Cause:** The grand total formula treated dealer cash flows with reversed signs: `+ subtotal_offloads - dealer_payout_total`. From admin's perspective, `subtotal_offloads` is cash PAID to dealers (negative), and `dealer_payout_total` is prize cash RECEIVED from dealers (positive). The formula was backwards.
- **Resolution:** Corrected to `- subtotal_offloads + dealer_payout_total`. Also corrected the per-ticket `admin_profit_loss` in settlement persistence from `total_sold - agent_settlement + master_recovery` to `total_sold - agent_settlement + master_recovery - total_offloaded` (must subtract the cash paid to dealers).
- **Files:** `backend/services/report_service.py`
