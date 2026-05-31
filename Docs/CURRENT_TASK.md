# CURRENT TASK — Post-Audit Contract Consolidation & Hardening (2026-05-31)

**Status:** In Progress — Phases 1-3 complete (2026-05-31)
**Source:** `Docs/Finding.md` cross-referenced against current codebase state

## Context

A comprehensive read-only audit (`Docs/Finding.md`) identified a fractured domain contract between the backend (Python/SQLAlchemy), the frontend TypeScript types, the mock bridge, and the stale `backend/schema.sql`. The backend was rebuilt from `TestingDatabase` as the authoritative source, but the frontend and `schema.sql` were not updated to match. This plan addresses every verified "Requires Change" finding.

**The core problem:** The frontend speaks a different vocabulary than the backend. Parameter names, response keys, and enum values are mismatched. In mock mode (browser dev), everything appears to work. Against the real pywebview backend, draw creation, ticket management, and data display will fail silently or with cryptic errors.

## Progress (2026-05-31)

### Completed
- [x] **Phase 1** — Contract Consolidation (all 11 steps)
  - schema.sql rewritten to match ORM + settlement tables + views + triggers
  - api.ts: OpenDrawInfo, BlacklistTicketResult, WinningTicketResult, WinningTicketDetail, SaleRecord, OffloadRecord, OffloadResult updated
  - domain.ts: All 8 interfaces updated (Agent, MasterDealer, Draw, Batch, Sale, Offloaded, BlacklistTicket, WinningTicket)
  - bridge.ts: PywebviewAPI interface + mock implementation fully rewritten to match backend
  - All 6 pages updated: Draws, Partners, Sales, Risk, Report, Dashboard
  - Verification: zero stale field names, TypeScript 0 errors, Vite build passes
- [x] **Phase 2.1** — Wired `settle_and_persist` into API.settle_draw() with atomic status transition
- [x] **Phase 2.2** — Verified settlement is transactional (single commit/rollback boundary)
- [x] **Phase 3.2** — Added ticket digit validation to BlacklistService and WinningService
- [x] **Phase 3.3** — Added guard for deleting SETTLED draws
- [x] **Phase 3.4** — Added guards for deleting agents/dealers with dependent records
- [x] **Phase 3.5** — Replaced silent risk telemetry fallback with logged error + degraded flag
- Backend tests: 24/24 passing
- Frontend build: production build succeeds

### Remaining
- [ ] **Phase 2.3** — Settlement tests (test_report_service.py)
- [ ] **Phase 3.1** — Zero-sale semantics decision (needs stakeholder input)
- [ ] **Phase 3.6** — Database-level ticket CHECK constraints
- [ ] **Phase 4** — Calculation verification tests from CalculationWorkflow.md
- [ ] **Phase 5** — Frontend quality (lint fixes, shared components, confirmation dialogs)
- [ ] **Phase 6** — UI/UX polish (SCSS migration, accessibility)

---

## Phase 1 — Contract Consolidation (P0)

**Goal:** Make the frontend types, bridge signatures, mock implementation, page components, and `schema.sql` all speak the same vocabulary as the backend API.

### Step 1.1 — Rewrite `backend/schema.sql` to match the ORM

**File:** `backend/schema.sql`

Replace the entire file with DDL that exactly mirrors the SQLAlchemy ORM models (`backend/database/models.py`) and `TestingDatabase/testingdatabase.sql`. This file is labeled "Reference DDL (documentation only)" in CLAUDE.md but currently contradicts the running schema on every table.

Changes per table:
- `draws`: `draw_name`, `opened_at`, `closed_at`, `settled_at`, `notes`, `house_holding_amount` (remove `open_date`, `cutoff_time`, `note`, `created_at`)
- `agents`: `commission_rate REAL`, `jp_factor REAL`, `sp_factor REAL`, `active INTEGER DEFAULT 1` (remove `commission INTEGER`, `note`; add `active`)
- `master_dealers`: same pattern as agents
- `batches`: add `batch_no TEXT NOT NULL`, `ticket_count INTEGER DEFAULT 0`, `closed_at DATETIME`, `remarks` (remove `note`)
- `sales`: `amount >= 0`, `UNIQUE(batch_id, ticket)`, NO denormalized `draw_id`/`agent_id` (remove `amount > 0`, add unique constraint)
- `blacklist_tickets`: `restriction_type` IN (`HALF`,`BLOCK`) (was `type`), `CHECK(length(ticket)=3)`, `UNIQUE(draw_id, ticket)`
- `winning_tickets`: `prize_type` IN (`JACKPOT`,`MINOR`) (was `type` with `Jackpot`,`Minor`), `CHECK(length(ticket)=3)`, `UNIQUE(draw_id, ticket)`
- `offloaded`: `page_no TEXT`, `notes` (was `note`)
- Add the 5 new settlement tables: `draw_ticket_snapshot`, `draw_settlement_agent`, `draw_settlement_master`, `draw_settlement_ticket`, `draw_settlement_summary`
- Add the 3 new views: `v_agent_sales_live`, `v_master_exposure_live`, `v_ticket_exposure_live`
- Replace trigger section with only the 3 batch-maintenance triggers that match `connection.py`
- Add header comment: "Reference DDL — matches SQLAlchemy ORM. The ORM is authoritative. This file is for documentation only."

### Step 1.2 — Update frontend API types to match backend response shapes

**File:** `frontend/src/types/api.ts`

Replace each type with the exact shape the backend returns:

```typescript
// Draw list/get response — matches backend get_draw/get_all_draws/get_open_draw
export interface OpenDrawInfo {
  id: number
  drawName: string
  status: string
  houseHoldingAmount: number
  openedAt: string | null
  closedAt: string | null
  settledAt: string | null
  notes: string | null
}

// Blacklist ticket — matches backend get_blacklist_tickets/create_blacklist_ticket
export interface BlacklistTicketResult {
  id: number
  drawId: number
  ticket: string
  restrictionType: string   // was "type"
}

// Winning ticket — matches backend get_winning_tickets/create_winning_ticket
export interface WinningTicketResult {
  id: number
  drawId: number
  ticket: string
  prizeType: string          // was "type"
}

// Agent/MasterDealer list — matches backend get_all_agents/get_all_master_dealers
// (Agent and MasterDealer are in domain.ts — update there)
```

Also update `WinningTicketDetail.type` from `'Jackpot' | 'Minor'` to `string` (backend returns `'JACKPOT' | 'MINOR'`).

### Step 1.3 — Update domain types to match backend

**File:** `frontend/src/types/domain.ts`

- **Agent:** `commission` → `commissionRate: number`; add `active: boolean`; remove `note`
- **MasterDealer:** same as Agent
- **Draw:** `openDate` → `drawName`; `cutoffTime` → remove, add `openedAt`, `closedAt`, `settledAt`; `note` → `notes`; keep `id`, `status`, `houseHoldingAmount`
- **BlacklistTicket:** `type` → `restrictionType`; add `drawId`; values `'HALF' | 'BLOCK'` stay
- **WinningTicket:** `type` → `prizeType`; add `drawId`; values change to `'JACKPOT' | 'MINOR'`
- **Batch:** `note` → `remarks`; add `batchNo`, `ticketCount`, `closedAt`; remove `totalAmount`
- **Sale:** remove `note` if backend doesn't return it (check: sale has no note field in TD)
- **Offloaded:** `note` → `notes`
- Remove dead types that are not consumed anywhere: `Offloaded` (domain.ts), `Draw` (if superseded by `OpenDrawInfo`), `Sale`, `Batch`

### Step 1.4 — Rewrite bridge interface and mock to match backend exactly

**File:** `frontend/src/api/bridge.ts`

**Interface changes (`PywebviewAPI`):**

| Method | Old signature | New signature |
|--------|--------------|---------------|
| `open_draw` | `(open_date, cutoff_time, house_holding_amount?, note?)` | `(draw_name, house_holding_amount?, notes?)` |
| `update_draw` | `(draw_id, open_date?, cutoff_time?, house_holding_amount?, note?)` | `(draw_id, draw_name?, house_holding_amount?, notes?)` |
| `create_agent` | `(id, name, commission?, jp_factor?, sp_factor?, note?)` | `(id, name, commission_rate?, jp_factor?, sp_factor?)` |
| `update_agent` | `(agent_id, name?, commission?, jp_factor?, sp_factor?, note?)` | `(agent_id, name?, commission_rate?, jp_factor?, sp_factor?, active?)` |
| `create_master_dealer` | same pattern | same pattern as agent |
| `update_master_dealer` | same pattern | same pattern as agent |
| `get_all_agents` | returns `Agent[]` | returns updated `Agent[]` (commissionRate, active, no note) |
| `get_all_master_dealers` | returns `MasterDealer[]` | returns updated `MasterDealer[]` |

**Mock implementation changes:**
- `open_draw`: accept `(draw_name, house_holding_amount?, notes?)`, store `drawName`/`notes` on the mock draw object, auto-set `openedAt` to now
- `update_draw`: accept `(draw_id, draw_name?, house_holding_amount?, notes?)`, update `drawName`/`notes`
- `create_agent`/`update_agent`: store and return `commissionRate`, `active`; drop `note`
- `create_master_dealer`/`update_master_dealer`: same
- `get_all_agents`/`get_all_master_dealers`: return shapes with `commissionRate`, `active`, no `note`
- `get_all_draws`/`get_draw`/`get_open_draw`: return `drawName`, `openedAt`, `closedAt`, `settledAt`, `notes` (NOT `openDate`, `cutoffTime`, `note`)
- `create_blacklist_ticket`: return `{ id, drawId, ticket, restrictionType }` (NOT `type`)
- `create_winning_ticket`: return `{ id, drawId, ticket, prizeType }` (NOT `type`)
- `get_blacklist_tickets`: return `{ id, drawId, ticket, restrictionType }[]`
- `get_winning_tickets`: return `{ id, drawId, ticket, prizeType }[]`
- `generate_report`: use `prizeType` values `'JACKPOT'`/`'MINOR'` in winning ticket details

### Step 1.5 — Update Draws page to use new contract

**File:** `frontend/src/pages/Draws.tsx`

- Form state: `{ openDate, cutoffTime, houseHoldingAmount, note }` → `{ drawName, houseHoldingAmount, notes }`
- Form labels: "Open Date" → "Draw Name", remove "Cutoff Time" field, "Note" → "Notes"
- `handleDrawFormSubmit`: call `api.open_draw(drawName, houseHoldingAmount, notes || undefined)` (3 args, not 4)
- `handleDrawFormSubmit` (edit): call `api.update_draw(editingDrawId, drawName, houseHoldingAmount, notes || undefined)`
- Draw list display: `d.openDate` → `d.drawName`; `d.cutoffTime` → show `d.openedAt`/`d.closedAt`/`d.settledAt` as appropriate; `d.note` → `d.notes`
- Ticket tab: `ticketForm.type` values change from `'Jackpot'`/`'Minor'` → `'JACKPOT'`/`'MINOR'`
- Ticket display: `t.type` → `t.restrictionType` (blacklist) or `t.prizeType` (winning)
- Ticket form select options: `'Jackpot'` → `'JACKPOT'`, `'Minor'` → `'MINOR'`
- `create_blacklist_ticket` call uses `ticketForm.type` — param name `ticket_type` in bridge, maps to `restriction_type` in backend
- `create_winning_ticket` call uses `ticketForm.type` — param name `ticket_type` in bridge, maps to `prize_type` in backend

### Step 1.6 — Update Partners page to use new contract

**File:** `frontend/src/pages/Partners.tsx`

- Agent form: `commission` → `commissionRate`; add `active` toggle; remove `note`
- Agent display: `a.commission` → `a.commissionRate`; show `a.active` status
- Master dealer form: same pattern
- `create_agent` call: remove `note` param; use `commission_rate` param name
- `update_agent` call: remove `note`; add `active` param; use `commission_rate` param name

### Step 1.7 — Update Sales page to use new contract

**File:** `frontend/src/pages/Sales.tsx`

- Draw reference: `openDraw?.openDate` → `openDraw?.drawName`
- Any `cutoffTime` references → remove or replace with `closedAt`
- Agent references: `commission` → `commissionRate`
- Batch display: `note` → `remarks` if applicable

### Step 1.8 — Update Risk page to use new contract

**File:** `frontend/src/pages/Risk.tsx`

- Draw reference: `openDraw?.openDate` → `openDraw?.drawName`
- Any `cutoffTime` references → remove or replace with `closedAt`
- Ticket risk display: check for `t.type` → appropriate field per context

### Step 1.9 — Update Report page to use new contract

**File:** `frontend/src/pages/Report.tsx`

- Winning ticket display: `wt.type` values are now `'JACKPOT'`/`'MINOR'` (uppercase) — update any conditional logic that checks for `'Jackpot'`/`'Minor'`
- All 7 references to `wt.type` in the report rendering (lines 130, 183, 240, 393, 449, 512) remain structurally correct but will now display uppercase values — consider a display formatter
- Agent/dealer line references: `commission` → `commissionRate`

### Step 1.10 — Update Dashboard page to use new contract

**File:** `frontend/src/pages/Dashboard.tsx`

- Check all draw/agent/dealer references for stale field names
- Update any `openDate`, `cutoffTime`, `commission`, `note`, `type` references

### Step 1.11 — Verify no stale field names remain in frontend

Run a global grep across `frontend/src` (excluding `node_modules`) for each stale field name and confirm zero remaining references:
- `openDate` (as a property access on draw objects — form local state names are fine)
- `cutoffTime`
- `.commission` (on agent/dealer objects, not computed variables)
- `.note` (on draw/agent objects where backend returns `notes`)
- `.type` (on blacklist/winning ticket objects — should be `.restrictionType`/`.prizeType`)
- `'Jackpot'` or `'Minor'` as literal values (should be `'JACKPOT'`/`'MINOR'`)

---

## Phase 2 — Settlement Integrity (P0)

**Goal:** Make draw settlement atomically persist settlement records and transition status.

### Step 2.1 — Wire `settle_and_persist` into the API

**File:** `backend/api.py` (lines 91-95)

Replace:
```python
def settle_draw(self, draw_id: int) -> dict[str, Any]:
    def _do(s: Any) -> dict[str, Any]:
        draw = DrawService(s).settle_draw(draw_id)
        return {"id": draw.id, "status": draw.status}
    return self._with_session(_do)
```

With:
```python
def settle_draw(self, draw_id: int) -> dict[str, Any]:
    def _do(s: Any) -> dict[str, Any]:
        report = ReportService(s).settle_and_persist(draw_id)
        return {"id": report["drawId"], "status": "SETTLED"}
    return self._with_session(_do)
```

### Step 2.2 — Verify `settle_and_persist` is transactional

**File:** `backend/services/report_service.py`

Review `settle_and_persist()` (line 165) to ensure:
- Settlement records, snapshots, and status transition happen in one transaction
- If any step fails, the entire settlement rolls back
- The session's `commit()` is called only after all inserts succeed

If the method currently commits incrementally, refactor to use a single atomic block.

### Step 2.3 — Add settlement tests

**File:** `tests/test_services/test_report_service.py` (new file)

- Test: settling an open draw with sales produces correct `draw_settlement_*` records
- Test: settling an already-settled draw raises an error
- Test: settling a draw with no sales produces empty settlement records
- Test: settlement records match the live calculation from `generate_report()`

---

## Phase 3 — Business Rule Hardening (P1)

**Goal:** Close gaps in validation, add missing guards, fix silent error swallowing.

### Step 3.1 — Decide and enforce zero-sale semantics

If zero IS intentional (current behavior):
- Add a docstring to `SalesService.record_sale()` documenting that zero-amount sales are valid (e.g., "placeholder entry")
- Add a comment in `TestingDatabase/testingdatabase.sql` explaining the `>= 0` constraint
- In report/risk queries, consider whether zero-amount rows should be excluded from counts

If zero should NOT be allowed:
- Change `SalesService.record_sale()` validation to `if amount <= 0`
- Change the ORM check constraint in `models.py` to `amount > 0`
- Change `TestingDatabase/testingdatabase.sql` to `CHECK(amount > 0)`
- Add a test verifying zero-amount sales are rejected

**Decision needed from stakeholder before implementing.**

### Step 3.2 — Add ticket digit validation to BlacklistService and WinningService

**File:** `backend/services/blacklist_service.py` (line 21)
**File:** `backend/services/winning_service.py` (line 21)

Add the same validation that `SalesService.record_sale()` already has:
```python
if not (ticket.isdigit() and len(ticket) == 3):
    raise ValidationError(f"Ticket must be exactly 3 numeric digits, got {ticket!r}.")
```

Place it before the existing type validation in both `create()` methods.

### Step 3.3 — Add guard for deleting settled/non-empty draws

**File:** `backend/services/draw_service.py` (line 104)

In `delete_draw()`, add after the existence check:
```python
if draw.status == "SETTLED":
    raise ValidationError(f"Cannot delete settled draw {draw_id}.")
```

Optionally check for dependent sales/offloads and provide a clear error:
```python
sale_count = self._sale_repo.count_by_draw(draw_id)  # if this method exists
if sale_count > 0:
    raise ValidationError(f"Cannot delete draw {draw_id} with {sale_count} existing sales.")
```

If a `count_by_draw` method doesn't exist on `SaleRepository`, either add it or catch the `IntegrityError` from the DB and re-raise as a `ValidationError` with a user-friendly message.

### Step 3.4 — Add guard for deleting agents/dealers with dependent records

**File:** `backend/services/agent_service.py`
**File:** `backend/services/master_dealer_service.py`

In `delete()`, check for dependent batches/sales/offloads before deleting. If foreign keys would block the delete, catch the `IntegrityError` and re-raise with a clear message.

### Step 3.5 — Fix silent risk telemetry fallback

**File:** `backend/services/risk_service.py` (line 48)

Replace:
```python
except Exception:
    return {"critical": 0, "high": 0, "medium": 0, "low": 0, ...}
```

With:
```python
except Exception as exc:
    logger.exception("Risk telemetry query failed for draw %s", draw_id)
    return {
        "critical": 0, "high": 0, "medium": 0, "low": 0,
        "updatedAt": datetime.now(timezone.utc).isoformat(),
        "degraded": True,
        "error": "Telemetry data may be incomplete.",
    }
```

Then update the frontend `RiskTelemetry` type to include the optional `degraded` and `error` fields, and display a warning banner in the Risk page when telemetry is degraded.

### Step 3.6 — Add database-level CHECK for ticket digit format

**File:** `backend/database/models.py`

On `Sale.ticket`, `BlacklistTicket.ticket`, and `WinningTicket.ticket`, strengthen the existing `CheckConstraint("length(ticket)=3")` to also enforce numeric content. In SQLite, this needs to be done carefully — SQLite CHECK constraints don't support regex, but we can use:

```python
CheckConstraint(
    "length(ticket) = 3 AND CAST(ticket AS INTEGER) BETWEEN 0 AND 999",
    name="ck_ticket_numeric"
)
```

Or alternatively, rely on the service-layer validation (which will be consistent after Step 3.2) and keep the DB constraint as length-only.

**Decision:** Service-layer validation is sufficient if direct DB access is never used. Adding complex CHECK constraints adds maintenance burden. Prefer service-layer enforcement unless there's a specific direct-DB risk.

---

## Phase 4 — Calculation Verification (P1)

**Goal:** Prove the report math is correct by encoding the `CalculationWorkflow.md` example as automated tests.

### Step 4.1 — Create calculation workflow test

**File:** `tests/test_services/test_report_service.py`

Use the worked example from `TestingDatabase/CalculationWorkflow.md`:
- Set up agents, master dealers, draws, batches, sales, offloads, blacklist tickets, and winning tickets matching the example
- Call `ReportService.generate_report(draw_id)`
- Assert:
  - Agent commission = `total_sales × commission_rate / 100`
  - Agent payout = `amount × factor × half_flag`
  - Agent line total = `subtotal - total_payout`
  - Master dealer commission = `total_offloaded × commission_rate / 100`
  - Master payout = `offloaded_amount × master_factor × half_flag`
  - Admin grand total matches the documented example: `-9,963,000`
- Test both "some winners" and "no winners" scenarios
- Test the half-blacklist flag halves the payout

### Step 4.2 — Verify `settle_and_persist` output matches `generate_report`

**File:** `tests/test_services/test_report_service.py`

- Set up identical data
- Call `generate_report()` and `settle_and_persist()` separately
- Assert that the settlement summary records match the live report numbers

---

## Phase 5 — Frontend Quality (P2)

**Goal:** Fix lint failures, extract shared components, add robust states.

### Step 5.1 — Fix ESLint failures

Run `cd frontend && npm run lint` to get the current error count and list. Fix each error:

- `react-hooks/set-state-in-effect`: Review each instance in Draws, Partners, Report, Sales, Risk pages. Restructure to avoid setting state inside effects where possible, or add proper dependency arrays.
- `no-useless-escape`: Remove unnecessary escape characters.

Target: **zero lint errors**.

### Step 5.2 — Extract shared table component

Create `frontend/src/components/DataTable.tsx` (or SCSS-only via `_tables.scss` which already exists) and migrate inline table styles from Risk.tsx, Sales.tsx, and Draws.tsx to use shared classes.

### Step 5.3 — Add loading, empty, and error states per workflow

Audit each page for missing states:
- **Sales page:** "No open draw" → prompt to open a draw; "No agents" → prompt to add an agent
- **Risk page:** "No open draw" → show empty guidance; degraded telemetry → warning banner
- **Report page:** "No settled draws" → prompt to settle a draw
- **Partners page:** "No agents" → empty state with CTA

### Step 5.4 — Add confirmation dialogs for destructive actions

**Files:** `frontend/src/pages/Draws.tsx`, `frontend/src/pages/Partners.tsx`

- Draw deletion: confirm dialog showing draw name and warning if draw has sales
- Agent/dealer deletion: confirm dialog
- Blacklist/winning ticket deletion: confirm dialog

Use a simple modal or `window.confirm()` as a first pass.

### Step 5.5 — Disable impossible actions by draw status

**File:** `frontend/src/pages/Sales.tsx`
**File:** `frontend/src/pages/Risk.tsx`

- If draw status is `CLOSED` or `SETTLED`, disable "Record Sale" button
- If draw status is `SETTLED`, disable offload actions
- Show a status badge explaining why actions are disabled

---

## Phase 6 — UI/UX Polish (P3)

**Goal:** Standardize terminology, move inline styles to SCSS, improve accessibility.

### Step 6.1 — Standardize labels and terminology

Audit all user-facing labels across pages and update:
- "Open Date" → "Draw Name"
- "Cutoff Time" → remove (backend manages timestamps automatically)
- "Note" → "Notes" (where backend uses plural)
- "Commission" → "Commission Rate" (to reflect it's a percentage)
- Blacklist type labels: keep "HALF" / "BLOCK" as display values
- Winning type labels: "JACKPOT" / "MINOR" (uppercase for consistency)

### Step 6.2 — Move remaining inline styles to SCSS

**Files:** `frontend/src/pages/Risk.tsx`, `frontend/src/pages/Sales.tsx`, `frontend/src/pages/Draws.tsx`

- Audit each page for inline `style={{...}}` objects
- Move repeated patterns into existing SCSS partials (`_tables.scss`, `_data-display.scss`, page-specific partials)
- Replace inline styles with className references
- Exception: truly dynamic styles (computed widths, conditional colors) may stay inline

### Step 6.3 — Accessibility pass

- Icon-only buttons: add `aria-label` attributes
- Tab buttons: ensure `aria-selected` reflects active state
- Error messages: add `role="alert"` and `aria-live="polite"` regions
- Ticket tables: add proper `<thead>`, `<th scope="col">`, `<th scope="row">`
- Color contrast: verify WCAG AA in both dark and light themes

---

## Implementation Order

```
Phase 1 (Contracts) ──► Phase 2 (Settlement) ──► Phase 3 (Hardening) ──► Phase 4 (Calc Tests)
                                                                              │
                                                                              ▼
                                                                       Phase 5 (Frontend Quality)
                                                                              │
                                                                              ▼
                                                                       Phase 6 (UI/UX Polish)
```

- **Phase 1 is the critical path** — all other work depends on a unified contract
- **Phase 2** is independent of Phase 1 (backend-only) and can run in parallel
- **Phase 3** depends on Phase 1 for the frontend portions; backend portions are independent
- **Phase 4** requires Phase 1 and Phase 2 to be complete
- **Phase 5** requires Phase 1 (lint fixes are in the updated files)
- **Phase 6** is pure polish, can be done anytime after Phase 1

---

## Files That Must NOT Change

- `TestingDatabase/testingdatabase.sql` — Authoritative source of truth
- `TestingDatabase/CalculationWorkflow.md` — Authoritative formula spec
- `backend/database/models.py` — Already correct (the backend rebuild target)
- `backend/database/connection.py` — Already correct (triggers, init flow)
- `backend/repositories/*` — Already correct (match ORM)
- `backend/services/draw_service.py` — Already correct (except delete guard in Phase 3)
- `backend/services/sales_service.py` — Already correct (except zero-sale decision in Phase 3)
- `frontend/src/styles/abstracts/_tokens.scss` — Design system tokens are locked
- `frontend/src/styles/components/_grid.scss` — Grid layout is locked
- `frontend/src/main.tsx` — Router structure
- `frontend/src/App.tsx` — Layout shell

---

## Verification Checklist

Before marking any phase complete:

- [ ] `pytest tests/ -v` — all tests pass
- [ ] `cd frontend && npx tsc --noEmit` — zero type errors
- [ ] `cd frontend && npm run lint` — zero lint errors
- [ ] `cd frontend && npm run build` — production build succeeds
- [ ] Manual smoke test against mock: create draw, record sales, add blacklist/winning tickets, view report
- [ ] Grep for stale field names: zero results for `openDate`, `cutoffTime`, `.commission` (on API objects), `.type` (on ticket objects), `'Jackpot'`, `'Minor'`

---

## Previous Completed Tasks

### Backend Rebuild from TestingDatabase (2026-05-31) — Complete

Rebuilt entire backend to match the TestingDatabase schema — the single source of truth for the lottery domain model. 22 files changed, all 24 tests pass.

### Frontend Sci-Fi Redesign: "Nexus Terminal" (2026-05-31) — Complete

Phase 12 UI Professional Upgrade applied. 4 commits, 16 files touched. SCSS compile, TypeScript, and Vite build all pass.
