# CURRENT TASK — Offload Functionality (Risk Page)

**Status:** Completed (2026-05-29)
**Source:** `Docs/Offload-Logic-and-Design.md`

## Summary

Implement the complete offload workflow into the Risk page, replacing the placeholder with: risk calculation (per-ticket Holding/Offloaded/Pending partitioning), 4-tab status view, master dealer selection, configurable thresholds, KALAW template export with html2canvas PNG download, and offload history tracking.

## Core Logic (from Offload-Logic-and-Design.md)

```
Per-ticket risk assessment:
  effective_hold = 0 if BLOCK-listed else admin_hold
  holding  = min(total_sales, effective_hold)
  pending  = max(total_sales - effective_hold - already_offloaded, 0)

Batch offload:
  OffloadAmount = min(Pending, max_offload_amount)

Prioritization: descending pending liability (highest risk first)
Grid: 4-column x 15-row KALAW template
```

## Implementation Steps

### 1. Backend Repository Layer
- [x] `SaleRepository.get_ticket_totals(draw_id)` — aggregate sales by ticket
- [x] `OffloadedRepository.get_ticket_totals(draw_id)` — aggregate offloads by ticket
- [x] `OffloadedRepository.get_max_page_no(draw_id)` — highest page number

### 2. Backend Service Layer
- [x] `OffloadService` (new) — constructor injection pattern matching `SalesService`
  - [x] `get_risk_breakdown(draw_id, admin_hold, max_offload_ticket)` → `RiskBreakdown`
  - [x] `create_offload(draw_id, master_dealer_id, entries, page_no, admin_hold, note)` → `list[Offloaded]`
  - [x] `get_offload_history(draw_id)` → `list[Offloaded]`
  - [x] `get_offloads_by_dealer(master_dealer_id)` → `list[Offloaded]`

### 3. Backend API Layer
- [x] `get_risk_breakdown(draw_id)` — bridge method
- [x] `create_offload(draw_id, master_dealer_id, entries_json, page_no, note)` — bridge method
- [x] `get_offload_history(draw_id)` — bridge method
- [x] `get_offload_config()` — read preferences (admin_hold, max_offload_amount, max_offload_ticket, offload_page_number)
- [x] `update_offload_config(key, value)` — write single preference
- [x] `_read_offload_config(session)` — helper with defaults (5000, 500000, 60, 1)

### 4. Frontend Types
- [x] `TicketRisk`, `RiskBreakdown`, `OffloadConfig`, `OffloadRecord`, `OffloadResult`
- [x] `createdAt` added to `Offloaded` domain interface

### 5. Frontend Bridge
- [x] 5 new typed method signatures on `PywebviewAPI` interface
- [x] Full mock implementations with `_mockOffloads`, `_mockOffloadConfig` state

### 6. Frontend Components
- [x] `KalawTemplate.tsx` (new) — hidden-rendered 4-col x 15-row ledger
  - Header: "KALAW" brand, draw date, page number
  - Body: monospaced table (No., Ticket, Amount, Remark)
  - Subtotals row, footer with Draw ID + Total Amount
- [x] `Risk.tsx` (rewrite) — full offload management page
  - Config bar: Master Dealer dropdown, Draw status, Hold Amt, Max Offload Amt, Max Tickets
  - 4 tabs: Pending (with selection/editable amounts), Holding, Offloaded, History
  - Export workflow: create_offload → html2canvas capture → PNG download → page increment

### 7. Dependencies
- [x] `html2canvas` added to package.json

## Files Created
| File | Purpose |
|------|---------|
| `backend/services/offload_service.py` | Core risk calculation + offload creation |
| `frontend/src/components/KalawTemplate.tsx` | KALAW ledger for html2canvas export |

## Files Modified
| File | Change |
|------|--------|
| `backend/repositories/sale_repository.py` | Added `get_ticket_totals()` |
| `backend/repositories/offloaded_repository.py` | Added `get_ticket_totals()`, `get_max_page_no()` |
| `backend/api.py` | Added 5 bridge methods + `_read_offload_config()` |
| `frontend/src/types/api.ts` | Added 5 new types |
| `frontend/src/types/domain.ts` | Added `createdAt` to `Offloaded` |
| `frontend/src/api/bridge.ts` | Added 5 bridge methods + mocks |
| `frontend/src/pages/Risk.tsx` | Full rewrite from placeholder |
| `frontend/package.json` | Added `html2canvas` |

## Architectural Decisions
- **Settings persistence:** `admin_hold`, `max_offload_amount`, `max_offload_ticket`, `offload_page_number` stored in `preferences` table (key-value), following `ThemeService` pattern.
- **`house_holding_amount` on Draw** is NOT used for per-ticket admin_hold. The global `admin_hold` preference is the per-ticket threshold.
- **Risk calculation lives in backend** (`OffloadService`), not in a frontend selector (follows 5-layer rule: domain logic in service layer).
- **`RiskService` / `get_risk_telemetry()`** left untouched for future Nightingale chart feature.

## Verification
- Backend tests: 22/22 passed
- TypeScript: zero type errors (`tsc --noEmit`)
- Python imports: all modules load cleanly
- Lint: 3 `set-state-in-effect` warnings (pre-existing pattern used by all pages)
