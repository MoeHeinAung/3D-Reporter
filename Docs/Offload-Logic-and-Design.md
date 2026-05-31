# Offload Functionality: Atom-Level Decomposition

This document provides a comprehensive analysis of the offload mechanism within the Vanguard 3D system, covering logic, workflows, design patterns, and dependencies.

## 1. Underlying Logic & Decision-Making

### Risk Assessment & Partitioning
The system evaluates liability on a per-ticket basis (3-digit strings). For each ticket, the total sales volume is partitioned into three states:
- **Holding:** The portion of the liability retained by the "House". 
- **Offloaded:** The portion already transferred to a Master Dealer.
- **Pending:** The remaining liability exceeding the hold limit that is not yet offloaded.

### Variables & Constraints
- `admin_hold`: The global threshold for house retention (e.g., 5,000 Ks).
- `max_offload_amount`: The maximum amount permitted for a single ticket in one offload operation.
- `max_offload_ticket`: The maximum number of unique tickets allowed per offload page (batch size).

### Decision Branching (Blacklist Impact)
The `restriction_type` column in `blacklist_tickets` controls retention logic:
- **Normal Ticket:** `effective_admin_hold = admin_hold` (from `draws.house_holding_amount`).
- **BLOCK Ticket:** `effective_admin_hold = 0`. Forces 100% of the sales volume into the "Pending" state for immediate offloading.
- **HALF Ticket:** Does not affect hold. Reduces prize payouts by 50% at settlement time.

### Risk Level Classification
The `v_ticket_exposure_live` SQL view classifies each ticket's pending liability:
- **CRITICAL:** pending >= 100,000
- **HIGH:** pending >= 50,000
- **MEDIUM:** pending >= 10,000
- **LOW:** pending < 10,000

### Prioritization
The system prioritizes offloading based on **descending pending liability**. Tickets with the highest at-risk volume are presented first to ensure the most significant liabilities are mitigated first.

---

## 2. Computational Workflows

### Mathematical Formulas
1. **Individual Ticket Risk:**
   - `Holding = min(TotalSales, effective_admin_hold)`
   - `Pending = max(TotalSales - effective_admin_hold - AlreadyOffloaded, 0)`

2. **Offload Batch Calculation:**
   - `OffloadAmount = min(Pending, max_offload_amount)`
   - *Note: If a ticket's pending amount exceeds the limit, only the limit is offloaded in the current batch, leaving the remainder for subsequent pages.*

### Data Transformation Workflow
1. **Aggregation:** `sales` and `offloads` arrays are reduced into a `summary` object keyed by `ticket`.
2. **Merging:** Blacklist status is joined to the summary.
3. **Projection:** The `riskAggregates` memoized selector calculates `holding`, `offloaded`, and `pending` for every ticket.
4. **Slicing:** `templateBatch` takes the top `max_offload_ticket` items from the filtered `Pending` list.
5. **Grid Mapping:** The batch is mapped into a 4-column x 15-row grid for the "KALAW" document layout.

---

## 3. UI/UX Design Patterns & Stylistics

### The "KALAW" Template
- **Aesthetic:** High-fidelity simulation of a professional, monospaced physical ledger.
- **Typography:** Uses `Instrument` for numerical data and currency to ensure readability and alignment.
- **Structural Layout:**
    - Header: Large "KALAW" brand mark, draw date, and auto-incrementing page number.
    - Body: 4-column grid with alternating row highlights (`bg-black/[0.015]`).
    - Subtotals: Every column features a sub-calculation at the bottom.
    - Footer: Security verification reference (Draw ID) and a prominent "Total Amount Offloaded" with italicized currency units.

### Interaction Patterns
- **Status Tabs:** A 4-way toggle (Holding, Offloaded, Pending, History) allows users to audit different risk segments.
- **Real-time Configuration:** Sliders/Inputs for `Hold Amt` and `Max Offload` update the `templateBatch` preview instantly via React state.
- **Export Workflow:** Clicking "Perform Offload" triggers a sequence:
    1. Python Bridge call to record the transaction.
    2. `html2canvas` capture of the hidden-rendered DOM node.
    3. Programmatic PNG download.
    4. Auto-increment of the page number for the next batch.

---

## 4. Architectural & Operational Dependencies

### Operational Bridge
- **Technology:** `pywebview` Bridge API.
- **Interaction:** Frontend calls `create_offload(draw_id, master_dealer_id, input_text, notes)`.

### Backend Components
- **`OffloadService`:** Handles database persistence, risk partitioning, and aggregation for history views. Uses `admin_hold` from draw's `house_holding_amount` and blacklist `restriction_type` for effective hold calculation.
- **`SaleRepository` / `OffloadedRepository`:** Provide ticket-level aggregation queries joining through Batch for draw-scoped totals.

### Data Schema (SQLite)
- **`offloaded`:** Stores individual offload transaction lines with `page_no` (TEXT), `notes`, `created_at`, and FKs to `draws` and `master_dealers`.
- **`preferences`:** Key-value store persisting user preferences for `admin_hold`, `max_offload_amount`, `max_offload_ticket` across sessions.
- **`blacklist_tickets`:** Dependency for calculating `effective_admin_hold` via `restriction_type` column.

### External Libraries
- **`html2canvas`:** Critical for generating the "KALAW" PNG artifacts.
- **`lucide-react`:** Provides the visual iconography for the Risk Management interface.
