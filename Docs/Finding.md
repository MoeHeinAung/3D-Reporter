diff --git a/findings.md b/findings.md
index 99a6f97280ee63e198395991dd0ae2c7ebf54d01..249091072399901e257864dc34f49d9a5691cd15 100644
--- a/findings.md
+++ b/findings.md
@@ -1,17 +1,247 @@
-# Findings - Frontend UI Analysis
-
-## Design System: "Nexus Terminal" / "Futuristic Precision"
-- **Aesthetic:** HUD-style, glassmorphism, geometric, high-contrast.
-- **Grid:** 12x8 viewport-locked grid. Row height is dynamic based on gap calculations.
-- **Colors:** Deep Space palette (Void, Obsidian, Cyan Primary).
-- **Typography:** Tektur (Headings), Instrument Sans (Body), JetBrains Mono (Telemetry).
-- **Signatures:**
-  - Trapezoid navbar logo.
-  - Bracket corner accents on cards.
-  - "Digital Ping" interaction on special buttons.
-- **Animations:**
-  - `scanline`: Vertical sweep.
-  - `pulse-hologram`: Subtle opacity breathing.
-  - `border-chase`: Circuit trace animation.
-  - `glitch-hover`: RGB jitter.
-- **Theming:** Full CSS variable-based dark/light mode support.
+# Comprehensive Codebase Audit — TestingDatabase, Backend, Frontend, UI/UX
+
+Date: 2026-05-31
+
+## Scope
+
+This audit reviewed the project with a primary focus on `TestingDatabase`, then extended into the Python backend, SQLite runtime database, React frontend, and UI/UX implementation. It was intentionally read-only; no application code was changed.
+
+## Commands and checks performed
+
+- `find .. -name AGENTS.md -print`
+- `rg --files -g '!node_modules' -g '!dist' -g '!build'`
+- `rg -n "TestingDatabase|testingdatabase|DatabaseTest|schema|CREATE TABLE|INSERT INTO|select|join|TODO|FIXME|any|unknown|@ts-ignore|as any" -S backend frontend TestingDatabase tests Docs main.py ARCHITECTURE.md CODING_STANDARDS.md`
+- `sqlite3 data/3d_reporter.db ".tables"`
+- `sqlite3 data/3d_reporter.db "SELECT name, sql FROM sqlite_master WHERE type IN ('table','view','trigger') ORDER BY type,name;"`
+- Runtime data-integrity SQL queries against `data/3d_reporter.db` for row counts, orphan records, duplicate open draws, invalid tickets, batch-total mismatches, and over-offloaded tickets.
+- `pytest -q`
+- `cd frontend && npm run lint && npm run build`
+- `cd frontend && npm run build`
+
+## Executive summary
+
+The application is not ready for production use. The highest-risk issue is not a single bug; it is a fractured domain contract. There are at least four active schema/API vocabularies:
+
+1. `TestingDatabase/testingdatabase.sql`, which defines the intended current database schema.
+2. `backend/database/models.py`, which mostly matches `TestingDatabase` and is what SQLAlchemy actually creates.
+3. `backend/schema.sql`, which is a stale, incompatible schema document/script.
+4. Frontend API/domain types and mock data, which still use older names such as `openDate`, `cutoffTime`, `commission`, `type: Jackpot`, and `note`.
+
+The runtime SQLite file currently matches the ORM/TestingDatabase family more closely than `backend/schema.sql`, but the frontend contract does not match the backend responses. This explains why many UI flows are likely to render blank/misleading values or reject valid backend data.
+
+A large-scale targeted refactor is necessary. It should not be a ground-up rewrite, but it should include a schema/API contract consolidation, database migration strategy, backend service hardening, frontend type alignment, and UI component-system cleanup.
+
+## GitNexus note
+
+The repository `AGENTS.md` requires GitNexus impact/detect-change tooling before symbol edits and commits. No GitNexus MCP tools were available in this environment, and `npx gitnexus --help` attempted to fetch `gitnexus` from npm but failed with `403 Forbidden`. Because this was an audit and no code symbols were edited, the impact-analysis requirement did not block this report. If follow-up code changes are requested, GitNexus tooling must be restored or an alternative process agreed before editing symbols.
+
+## TestingDatabase and schema audit
+
+### Critical: `backend/schema.sql` is incompatible with the active ORM and TestingDatabase schema
+
+`TestingDatabase/testingdatabase.sql` defines `draws` with `draw_name`, `opened_at`, `closed_at`, `settled_at`, and `notes`. The ORM mirrors this shape. However, `backend/schema.sql` defines `draws` with `open_date`, `cutoff_time`, `note`, and `created_at`. The frontend also expects `openDate` and `cutoffTime`, creating a three-way mismatch.
+
+`TestingDatabase` defines `agents.commission_rate`, `active`, and no `note`. `backend/schema.sql` defines `commission` and `note`. The frontend domain type still defines `commission` and `note`, while backend API returns `commissionRate` and `active`.
+
+`TestingDatabase` defines `blacklist_tickets.restriction_type` and `winning_tickets.prize_type` with uppercase values `JACKPOT`/`MINOR`. `backend/schema.sql` defines both as `type`, and winning values as `Jackpot`/`Minor`. Frontend types and UI also use `type` and title-case prize values in several places.
+
+Impact: if `backend/schema.sql` is used for setup, documentation, migrations, or manual repair, the app will create a database that the ORM/services cannot use. If frontend types are trusted, UI calls will send values that backend services reject.
+
+### Critical: stale `backend/schema.sql` contains SQL that will not run as written
+
+The status-transition trigger in `backend/schema.sql` attempts to concatenate strings inside `RAISE(ABORT, ...)`. SQLite requires the `RAISE()` message argument to be a string literal in trigger programs; the dynamic expression form shown is not portable and may fail depending on SQLite version. More importantly, this trigger set is not installed by `init_db()` at all, because `init_db()` installs only the simplified trigger block in `backend/database/connection.py`.
+
+Impact: schema documentation promises constraints that are not enforced in the active runtime database.
+
+### High: TestingDatabase intentionally allows zero-amount sales, but business wording is inconsistent
+
+`TestingDatabase` allows `sales.amount >= 0`. `SalesService.record_sale()` also allows zero because it rejects only `amount < 0`. However, `backend/schema.sql` requires `amount > 0`. The workflow says a sale record has an amount but does not clearly state whether zero is valid.
+
+Impact: zero-amount sales can inflate `ticket_count`, appear in reports, and create unique `(batch_id,ticket)` rows that block later positive sales for the same ticket in the same batch.
+
+Recommendation: decide whether zero is a valid correction/placeholder. If not, change `TestingDatabase`, ORM, service validation, tests, and UI validation to `amount > 0`. If yes, rename the behavior explicitly and exclude zero rows from count/risk/report calculations where appropriate.
+
+### High: ticket constraints check only length, not numeric content
+
+`TestingDatabase` checks only `length(ticket)=3` for sales, offloads, blacklist, and winning tickets. Services validate digit-only for some flows, but `BlacklistService.create()` and `WinningService.create()` do not validate ticket format. Direct database insertion can store nonnumeric three-character tickets.
+
+Impact: malformed tickets can enter through direct DB writes, loose tests, future tools, or service gaps, then break lottery assumptions and sorting/filtering.
+
+Recommendation: enforce `ticket GLOB '[0-9][0-9][0-9]'` at the database and service level.
+
+### High: actual runtime database lacks lifecycle/business triggers beyond batch totals
+
+The active `data/3d_reporter.db` contains only `trg_sales_insert`, `trg_sales_update`, and `trg_sales_delete`. It does not contain triggers for one-open-draw, allowed status transitions, sales-only-when-open, blocked-ticket sales, or offload-settled-draw prevention. Those are service-layer rules only.
+
+Impact: any direct DB operation, future migration, repository bypass, or partially implemented service can violate core business rules. This is especially risky because settlement data is financial.
+
+Recommendation: add database-level constraints/triggers for invariants that must never be violated, then keep service validations for user-friendly errors.
+
+### Medium: active runtime data is internally consistent but sparse
+
+The sampled runtime database had 2 agents, 2 master dealers, 2 draws, 2 batches, 3 sales, 1 offload, 1 blacklist ticket, and 1 winning ticket. Integrity checks found no orphan sales, orphan batches, duplicate open draws, invalid sale tickets, zero/negative sale amounts, batch-total mismatches, or over-offloaded tickets.
+
+Caveat: this is sample data, not proof of general correctness. The absence of database-level invariants means future data can drift.
+
+## Backend architecture and logic audit
+
+### Critical: frontend calls `open_draw(openDate, cutoffTime, houseHoldingAmount, note)`, but backend expects `open_draw(draw_name, house_holding_amount, notes)`
+
+The TypeScript bridge declares `open_draw(open_date, cutoff_time, house_holding_amount, note)`. The Python API accepts `open_draw(draw_name, house_holding_amount=0, notes=None)`. The Draws page passes four arguments. In pywebview, this will map the first argument to `draw_name`, the second string (`cutoffTime`) to `house_holding_amount`, and the third number to `notes`, with an extra fourth argument likely causing a bridge arity error or being rejected.
+
+Impact: creating draws from the UI is likely broken against the real backend.
+
+### Critical: frontend sends title-case winning types while backend only accepts uppercase
+
+`WinningService.VALID_TYPES` is `{'JACKPOT', 'MINOR'}`. The Draws UI initializes winning ticket type as `'Jackpot'`, and frontend types define `'Jackpot' | 'Minor'`. The stale `backend/schema.sql` also documents title-case values, while TestingDatabase and ORM use uppercase.
+
+Impact: creating winning tickets from the real UI is likely rejected. If mock mode is used, it can pass in browser dev and fail in desktop production.
+
+### Critical: blacklist/winning response keys do not match frontend types
+
+Backend returns blacklist tickets as `restrictionType` and winning tickets as `prizeType`. Frontend `BlacklistTicketResult` and `WinningTicketResult` expect `type`. UI code references `ticket.type` in several places. Mock mode returns `type`, hiding the real-backend mismatch.
+
+Impact: ticket tables and edit/create logic can display undefined values, send wrong payloads, or appear to work in mock mode only.
+
+### High: API error handling swallows unexpected backend failures into generic responses
+
+`RiskService.get_telemetry()` catches all exceptions and returns zero counts. This can hide missing views, SQL errors, or schema drift. The API layer does centralize sessions and errors, but silent fallback in domain services is dangerous for financial/risk telemetry.
+
+Impact: dashboard risk can report all zeros during an outage or schema failure, causing false confidence.
+
+Recommendation: log exceptions with stack traces and return an explicit degraded/error state to the UI.
+
+### High: settlement flow can update draw status without persisting settlement tables
+
+`API.settle_draw()` calls only `DrawService(s).settle_draw(draw_id)` and returns status. `ReportService.settle_and_persist()` exists but is not used by this API method.
+
+Impact: a draw can become `SETTLED` without `draw_settlement_*` records or snapshots, undermining auditability and final report integrity.
+
+Recommendation: make settlement a transaction that generates/persists report records and transitions status atomically.
+
+### High: report formulas appear inconsistent with the documented workflow example
+
+`ReportService` computes agent line totals as `subtotal - total_payout`, where `subtotal = total_sales - commission`. That matches the cash owed after commission in broad terms. For master dealers, it computes `total = subtotal - total_payout`, where `subtotal = total_offloaded - commission`. The workflow defines `Master_Net_Profit_Loss = Net_Offloaded_Received_By_Master - Total_Master_Payout_To_Admin`, so that portion aligns.
+
+However, admin grand total is computed as `subtotal_sales - agent_payout_total - subtotal_offloads + dealer_payout_total`. The workflow formula says `Admin_Net_Profit = Total_Sales - Total_Agent_Commission - Total_Admin_Payout_To_Agents + sum(Master_Net_Profit_Loss)`, and defines master net as `gross - commission - payout`. If interpreted literally, adding master net to admin profit conflicts with the cash-flow comments that offloads are cash paid out by admin while dealer payouts are cash received by admin. The code comment itself treats `subtotal_offloads` as cash TO master dealers and `dealer_payout_total` as cash FROM master dealers.
+
+Impact: the report may not match stakeholder examples, especially for winning tickets. This requires validation with known input/output fixtures from `CalculationWorkflow.md`.
+
+Recommendation: encode the example in tests and reconcile terminology: admin perspective vs master-dealer perspective should use explicit signs.
+
+### Medium: `ReportService.settle_and_persist()` repeatedly queries agents/dealers inside loops
+
+Settlement persistence repeatedly calls `_agent_repo.get_by_id()` and `_dealer_repo.get_by_id()` for each line and ticket. This is avoidable because `generate_report()` already builds agent/dealer maps.
+
+Impact: small sample data is fine, but large draw settlement can become unnecessarily slow.
+
+### Medium: batch model design conflicts with sales-entry workflow
+
+`TestingDatabase` has `UNIQUE(batch_id,ticket)` and says “one ticket per batch,” but `CalculationWorkflow.md` says a ticket can be sold many times by the same or different agents. `SalesService.get_or_create_batch()` returns one batch per draw+agent, so the unique constraint means the same agent cannot record the same ticket twice in the same draw through the same batch. This may be intended aggregation behavior, but then `record_sale()` should update existing sale amounts instead of inserting and hitting an integrity error.
+
+Impact: repeated entries for the same agent/ticket/draw can fail rather than aggregate.
+
+Recommendation: decide between immutable sale-line entries and aggregated ticket rows. If immutable, drop unique constraint. If aggregated, add upsert semantics and make UI communicate that sales are accumulated.
+
+### Medium: draw deletion has no explicit business guard
+
+`DrawService.delete_draw()` deletes any draw by ID. Foreign keys are enabled, so deletes with dependent rows may fail, but the service does not provide a domain-specific guard or clear error. Settled draws should likely be immutable and non-deletable.
+
+Impact: destructive UI action can either fail unclearly or delete critical empty draw records.
+
+## Frontend architecture and contract audit
+
+### Critical: API/domain types are stale relative to backend
+
+`OpenDrawInfo` expects `openDate`, `cutoffTime`, and `note`. Backend returns `drawName`, `openedAt`, `closedAt`, `settledAt`, and `notes`. Agents and master dealers in `domain.ts` use `commission` and `note`, while backend returns `commissionRate`, `active`, and no note.
+
+Impact: UI displays blank/undefined values and submits wrong arguments.
+
+Recommendation: generate or centrally maintain API DTO types from backend contracts. Short term, update TypeScript types and adapter functions to translate backend DTOs into UI view models.
+
+### Critical: mock API masks production bugs
+
+The mock bridge accepts and returns the stale frontend shapes. Browser dev can therefore look healthy while pywebview production fails.
+
+Impact: manual testing in Vite/browser is unreliable.
+
+Recommendation: make mock conform exactly to backend API DTOs, or put a real adapter boundary above both real and mock APIs.
+
+### High: lint currently fails with 19 errors and 1 warning
+
+`npm run lint` fails primarily due to React Compiler/ESLint `react-hooks/set-state-in-effect` errors across Draws, Partners, Report, Sales, and Risk, plus at least one `no-useless-escape` warning/error. Build succeeds, but lint failure should block CI.
+
+Impact: technical debt is already measurable and will increase merge risk.
+
+### High: report/mock calculations diverge from backend naming and formulas
+
+The mock report code uses title-case `Jackpot`/`Minor` and `agent.commission`, while backend uses uppercase prize types and `commission_rate`/API `commissionRate`. It also computes admin totals independently of backend code.
+
+Impact: UI report previews in browser can disagree with real reports.
+
+### Medium: frontend pages are large, stateful, and heavily inline-styled
+
+Pages such as `Risk.tsx`, `Sales.tsx`, and `Draws.tsx` mix data fetching, transformation, form state, rendering, and domain actions. Risk contains extensive inline styles for tables and controls. This creates repeated patterns and inconsistent UX.
+
+Impact: difficult maintenance, harder tests, inconsistent loading/error behavior.
+
+Recommendation: extract API hooks, view-model mappers, shared table/card/form components, and domain-specific subcomponents.
+
+## UI/UX audit and recommendations
+
+### Strengths
+
+- The app has a defined visual direction in `Docs/UI-Design-system.md`, with a coherent “Nexus Terminal” aesthetic.
+- The layout uses cards, tabs, badges, telemetry numbers, and monospaced ticket cells that fit the lottery/risk domain.
+- Core workflows are separated into Draws, Sales, Risk, Report, Partners, and Settings, which is conceptually sound.
+
+### UX risks and improvements
+
+1. **Use domain language consistently.** The UI still says Open Date/Cutoff Time while backend uses draw name/opened/closed/settled timestamps. Decide whether draws are date-based or name-based and reflect it everywhere.
+2. **Add confirmation dialogs for destructive actions.** Draw deletion and ticket deletion should require confirmation, especially for non-empty or settled draws.
+3. **Disable impossible actions by status.** UI should clearly disable sales/offloads for non-OPEN draws and disable mutation of settled draw financial fields.
+4. **Normalize validation before submit.** Ticket inputs should auto-pad or reject non-3-digit values inline. Winning type options should be uppercase internally but user-friendly in labels.
+5. **Improve error visibility.** Errors should be near the field/action that caused them, not only in broad card-level state.
+6. **Add empty-state guidance.** “No sales data” should include a next action: open draw, add agent, record sales, configure offload, etc.
+7. **Reduce inline styles.** Move repeated table/action/footer styling into SCSS components to improve consistency and responsive behavior.
+8. **Add audit/status affordances.** For financial workflows, show when a report was generated, whether it is interim/final, and whether settlement records are persisted.
+9. **Accessibility pass.** Ensure icon-only buttons have `aria-label`, modals trap focus, tab buttons expose selected state, errors use `aria-live`, and contrast meets WCAG in both themes.
+10. **Responsive and overflow behavior.** The design locks the viewport and uses dense grids; test smaller desktop/laptop screens to prevent hidden primary actions.
+
+## Is a large-scale refactor necessary?
+
+Yes — a large-scale targeted refactor is necessary. A full rewrite is not recommended because the repository already has a reasonable layered structure: repositories, services, API bridge, and React pages. The required refactor should consolidate contracts and isolate responsibilities rather than replace the stack.
+
+## Prioritized required changes
+
+### P0 — Blockers
+
+1. Choose one canonical schema: preferably `TestingDatabase` + ORM, then delete or rewrite stale `backend/schema.sql` so it cannot mislead setup/migration work.
+2. Align backend API, TypeScript bridge, frontend DTO types, and mock API around the same field names and enum values.
+3. Fix draw creation/update UI contract (`draw_name` vs `openDate/cutoffTime`) and winning/blacklist ticket response key mismatches.
+4. Make `settle_draw` persist settlement records atomically or prevent status transition without settlement persistence.
+5. Add regression tests for the calculation workflow example, including losing and winning scenarios.
+
+### P1 — Data integrity and business rules
+
+6. Add database-level constraints/triggers for ticket format, one open draw, lifecycle transitions, blocked sales, and mutation limits after settlement.
+7. Decide and enforce zero-sale semantics.
+8. Resolve unique sale row vs repeated sale-line behavior.
+9. Add explicit guards for deleting settled/non-empty draws and partners with dependent records.
+10. Replace silent risk telemetry fallback with logged errors and UI degraded states.
+
+### P2 — Frontend quality
+
+11. Fix ESLint failures and add lint/build/test to CI.
+12. Replace mock API drift with a backend-conformant mock or generated fixtures.
+13. Extract shared UI components and custom hooks from large pages.
+14. Add robust loading, empty, and error states per workflow.
+15. Add confirmation dialogs and action disabling by draw status.
+
+### P3 — UI/UX polish
+
+16. Standardize terminology and labels across docs, backend, and UI.
+17. Move inline styles into SCSS component modules.
+18. Improve accessibility semantics for tabs, modals, icon buttons, and alerts.
+19. Add audit/status indicators for reports and settlements.
+20. Conduct viewport/responsive testing under the locked `100vw × 100vh` layout model.
