# CURRENT TASK — Dynamic Financial Report Page

**Status:** Completed (2026-05-29)
**Source:** User specification (2026-05-29)

## Summary

Replace the placeholder `Report.tsx` with a full-stack dynamic financial report page. The report generates per-draw settlement summaries with three sections (Agent, Master Dealer, Admin/House), conditional winning ticket integration, and an "Export as Image" feature using html2canvas.

## Core Logic

### Conditional Rendering System

```
if winning_tickets.length === 0:
    → Show ONLY sales + commission data (no payout columns)
if winning_tickets.length > 0:
    → Show full report with winning ticket details and payout calculations
```

### Data Flow

```
User selects Draw → API fetches report data → Backend aggregates:
  1. Sales by agent (SUM amount, GROUP BY agent_id, ticket)
  2. Offloads by master dealer (SUM amount, GROUP BY master_dealer_id, ticket)
  3. Winning tickets for the draw
  4. Blacklist tickets (HALF affects payout)
  
Backend computes per-agent, per-dealer, and consolidated sections
  → Returns structured ReportData
  → Frontend renders sections conditionally
  → User can export as PNG via html2canvas
```

---

## Report Sections Detail

### Section 1: Agent Section (per Agent)

| Row | Description | Source |
|-----|-------------|--------|
| Total Sale Amount | SUM of `sales.amount` WHERE `agent_id` = agent AND `draw_id` = draw | `sales` table |
| Commission Paid | `Total Sale Amount * agent.commission / 100` (percentage) | `agents.commission` |
| Subtotal | `Total Sale Amount - Commission Paid` | Calculated |
| Winning Ticket Details | Only if winning tickets declared AND agent sold a winning ticket | `winning_tickets` + `sales` |
| — Ticket ID/Info | The winning ticket number + type (Jackpot/Minor) | |
| — Amount | The sale amount for this ticket by this agent | |
| — Payout | `Amount * agent.jp_factor` (Jackpot) or `Amount * agent.sp_factor` (Minor), halved if HALF blacklisted | `agents.jp_factor`, `agents.sp_factor`, `blacklist_tickets` |
| Total | `Subtotal - SUM of all Payouts for this agent` | Calculated |

### Section 2: Master Dealer Section (per Master Dealer)

| Row | Description | Source |
|-----|-------------|--------|
| Total Offloaded Amount | SUM of `offloaded.amount` WHERE `master_dealer_id` = dealer AND `draw_id` = draw | `offloaded` table |
| Commission Paid to Admin/House | `Total Offloaded Amount * dealer.commission / 100` | `master_dealers.commission` |
| Subtotal | `Total Offloaded Amount - Commission Paid` | Calculated |
| Winning Ticket Details | Only if winning tickets declared AND ticket was offloaded to this dealer | `winning_tickets` + `offloaded` |
| — Ticket ID/Info | The winning ticket number + type | |
| — Amount | The offloaded amount for this ticket to this dealer | |
| — Payout | `Amount * dealer.jp_factor` (Jackpot) or `Amount * dealer.sp_factor` (Minor), halved if HALF | |
| Total | `Subtotal - SUM of all Payouts for this dealer` | Calculated |

### Section 3: Admin/House Section (Consolidated)

| Row | Description |
|-----|-------------|
| Total Sales Amount | SUM of all Agent "Total Sale Amount" |
| Total Commission Payable | SUM of all Agent "Commission Paid" |
| Subtotal A | `Total Sales Amount - Total Commission Payable` |
| Total Offloaded Amount | SUM of all MD "Total Offloaded Amount" |
| Total Commission from MDs | SUM of all MD "Commission Paid to Admin" |
| Subtotal B | `Total Offloaded Amount - Total Commission from MDs` |
| Winning Ticket Details | Tickets held by Admin/House (sold but NOT fully offloaded) |
| — Ticket ID/Info | Winning ticket number + type |
| — Amount | The HOUSE's portion of the winning ticket (total sales - offloaded amount for that ticket) |
| — Payout | Calculated using Admin's effective rate, halved if HALF |
| Grand Total | `Subtotal A + Subtotal B + Commission from MDs - All Payouts` |

---

## Winning Ticket Attribution Logic

For each winning ticket, determine who "holds" it:

```
1. Find all sales for the winning ticket number in this draw
2. Find all offloads for the winning ticket number in this draw
3. For each sale:
   a. If the full amount was offloaded to a master dealer → dealer holds it
   b. If partially offloaded → remaining amount is held by Admin/House
   c. If not offloaded at all → held by the Agent (who sold it)
```

Actually, let me simplify: the "holder" of a winning ticket liability follows the money:

- **Agent holds**: A winning ticket the agent sold that was NOT offloaded (the sale stays with agent)
- **Master Dealer holds**: A winning ticket that was offloaded to them
- **Admin/House holds**: A winning ticket where the sale amount exceeds the offloaded amount (the "gap"), or tickets sold by agents that were never offloaded but where the house has direct liability

**Simplified rule**: 
- If a ticket was sold by an agent → appears in that Agent's section (for the sale amount)
- If a ticket was offloaded to a MD → appears in that MD's section (for the offloaded amount)
- The remaining/house portion = sale amount - offloaded amount (if any), shown in Admin section

> **OPEN QUESTION for user**: Should a winning ticket appear in MULTIPLE sections (e.g., agent section for the sold portion AND dealer section for the offloaded portion)? Or should it appear ONLY where the liability ultimately lies?

---

## Implementation Plan

### Backend

#### 1. New Repository Query Methods

**`backend/repositories/sale_repository.py`** — Add:
- `get_sales_grouped_by_agent(draw_id)` → `list[tuple[str, int]]` (agent_id, total_amount)
- `get_sales_by_ticket_and_agent(draw_id, ticket)` → `list[Sale]` (for winning ticket attribution)

**`backend/repositories/offloaded_repository.py`** — Add:
- `get_offloads_grouped_by_dealer(draw_id)` → `list[tuple[str, int]]` (dealer_id, total_amount)
- `get_offloads_by_ticket_and_dealer(draw_id, ticket)` → `list[Offloaded]` (for winning ticket attribution)

#### 2. New ReportService

**`backend/services/report_service.py`** (NEW):
- `__init__(session)` — inject SaleRepository, OffloadedRepository, AgentRepository, MasterDealerRepository, WinningRepository, BlacklistRepository, DrawRepository
- `generate_report(draw_id)` → `ReportData` named tuple
  - Validates draw exists
  - Fetches all agents and master dealers
  - Aggregates sales by agent
  - Aggregates offloads by dealer
  - Fetches winning tickets and blacklist
  - Computes per-agent sections with commission and payout
  - Computes per-dealer sections with commission and payout
  - Computes consolidated admin section
  - Returns structured `ReportData`

**Named Tuples / Types:**

```python
class AgentReportLine(NamedTuple):
    agent_id: str
    agent_name: str
    total_sale_amount: int
    commission_paid: int
    subtotal: int
    winning_tickets: list[WinningTicketDetail]  # empty if no winners
    total: int

class DealerReportLine(NamedTuple):
    dealer_id: str
    dealer_name: str
    total_offloaded_amount: int
    commission_to_admin: int
    subtotal: int
    winning_tickets: list[WinningTicketDetail]
    total: int

class AdminReportSection(NamedTuple):
    total_sales_amount: int
    total_commission_payable: int
    subtotal_sales: int
    total_offloaded_amount: int
    total_commission_from_md: int
    subtotal_offloads: int
    winning_tickets: list[WinningTicketDetail]
    grand_total: int

class WinningTicketDetail(NamedTuple):
    ticket: str
    type: str  # 'Jackpot' or 'Minor'
    amount: int  # sale/offload amount relevant to this holder
    payout: int  # calculated payout
    is_half_blacklisted: bool

class ReportData(NamedTuple):
    draw_id: int
    draw_status: str
    has_winning_tickets: bool  # drives conditional rendering
    agents: list[AgentReportLine]
    dealers: list[DealerReportLine]
    admin: AdminReportSection
```

#### 3. API Bridge Methods

**`backend/api.py`** — Add:
- `generate_report(draw_id: int)` → `dict` — delegates to `ReportService.generate_report()`, serializes named tuples to camelCase dicts

### Frontend

#### 4. TypeScript Types

**`frontend/src/types/api.ts`** — Add:
```typescript
interface WinningTicketDetail {
  ticket: string
  type: 'Jackpot' | 'Minor'
  amount: number
  payout: number
  isHalfBlacklisted: boolean
}

interface AgentReportLine {
  agentId: string
  agentName: string
  totalSaleAmount: number
  commissionPaid: number
  subtotal: number
  winningTickets: WinningTicketDetail[]
  total: number
}

interface DealerReportLine {
  dealerId: string
  dealerName: string
  totalOffloadedAmount: number
  commissionToAdmin: number
  subtotal: number
  winningTickets: WinningTicketDetail[]
  total: number
}

interface AdminReportSection {
  totalSalesAmount: number
  totalCommissionPayable: number
  subtotalSales: number
  totalOffloadedAmount: number
  totalCommissionFromMd: number
  subtotalOffloads: number
  winningTickets: WinningTicketDetail[]
  grandTotal: number
}

interface ReportData {
  drawId: number
  drawStatus: string
  hasWinningTickets: boolean
  agents: AgentReportLine[]
  dealers: DealerReportLine[]
  admin: AdminReportSection
}
```

#### 5. Frontend Bridge

**`frontend/src/api/bridge.ts`** — Add:
- `generate_report(draw_id: number): Promise<ApiResult<ReportData>>` — typed method
- Mock implementation returning sample data for development (all 3 sections, with and without winning tickets based on mock state)

#### 6. Frontend Page

**`frontend/src/pages/Report.tsx`** — Full rewrite:

**Layout (12x8 grid):**
- Row 1 (span 12): Draw selector dropdown + "Export as Image" button
- Row 2-8 (span 12): Report content card with internal scroll

**Report Content (inside card):**
- **No winners state**: Simple table layout showing only Agent section + Admin consolidated (sales/commission only)
- **Winners declared state**: Full three-section report

**Conditional Sections:**
```
{!reportData.hasWinningTickets ? (
  <SimpleReport />   // Agent sales + commission only
) : (
  <FullReport />     // All 3 sections with winning details
)}
```

**Export as Image:**
- Use `html2canvas` pattern from Risk.tsx (already imported)
- Hidden-rendered clean report template (no grid background, white/print-friendly)
- Capture → auto-download as PNG with draw ID in filename

**States:**
- Loading: scanline animation placeholder
- Error: inline error banner with retry
- Empty: "Select a draw to generate report"
- No sales: "No sales data for this draw"
- Normal: rendered report

#### 7. SCSS Styles

**`frontend/src/styles/components/_report.scss`** (NEW):
- `.report__section` — glassmorphism card within the main card
- `.report__table` — monospaced financial table (JetBrains Mono)
- `.report__total-row` — highlighted summary rows with cyan accent
- `.report__winning-row` — Neural Violet highlight for winning ticket rows
- `.report__export-template` — clean white background for html2canvas capture
- `.report__grand-total` — prominent final total with Striker Blue glow

---

## Files Checklist

| Layer | File | Action |
|-------|------|--------|
| Repository | `backend/repositories/sale_repository.py` | Add 2 query methods |
| Repository | `backend/repositories/offloaded_repository.py` | Add 2 query methods |
| Service | `backend/services/report_service.py` | **CREATE** — all report calculation logic |
| API | `backend/api.py` | Add `generate_report()` bridge method |
| Types | `frontend/src/types/api.ts` | Add 5 new interfaces |
| Bridge | `frontend/src/api/bridge.ts` | Add `generate_report()` + mock |
| Page | `frontend/src/pages/Report.tsx` | Full rewrite from placeholder |
| Styles | `frontend/src/styles/components/_report.scss` | **CREATE** — report-specific styles |
| Styles | `frontend/src/styles/main.scss` | Import `_report.scss` |

---

## Confirmed Business Rules (2026-05-29)

1. **Commission formula**: `amount * commission / 100` (percentage). E.g., commission=5 means 5%.
2. **Payout formula**: `amount * jp_factor` for Jackpot, `amount * sp_factor` for Minor (multipliers). HALF blacklist = 50% reduction on payout.
3. **Winning ticket attribution**: A winning ticket appears in **ALL** sections that touched it (agent, dealer, admin).
4. **Admin payout rate**: Admin uses the **agent's** `jp_factor`/`sp_factor` (the agent who sold that ticket).
5. **Grand Total**: `Subtotal A + Subtotal B + Commission from MDs - ALL Payouts` (net Admin/House position).
6. **Draw filter**: Report works for any draw status (OPEN, CLOSED, SETTLED). On SETTLED it becomes final.
