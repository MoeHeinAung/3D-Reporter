Executive Summary
Critical / High-Priority Findings
Frontend production build currently fails.

npm run build fails on TypeScript errors in frontend/src/api/bridge.ts, frontend/src/pages/Draws.tsx, and frontend/src/pages/Partners.tsx.

The mock API object includes internal mock-state properties that are not part of PywebviewAPI, causing a TypeScript excess-property error. 

ESLint currently fails with 19 errors.

The dominant issue is React 19 / eslint-plugin-react-hooks set-state-in-effect violations across data-loading effects and synchronization effects. 

Database initialization does not apply important schema features from backend/schema.sql.

Runtime initialization uses only Base.metadata.create_all(get_engine()), so SQL triggers, views, PRAGMAs, and several raw-SQL constraints are not installed. 

Live inspection showed PRAGMA foreign_keys = 0, journal_mode = delete, triggers = 0, and views = 0, despite schema.sql defining foreign keys, WAL mode, triggers, and views. 

SQLite foreign-key enforcement is disabled for connections.

SQLAlchemy creates an engine with check_same_thread=False, but does not execute PRAGMA foreign_keys=ON per connection. 

This can allow orphaned sales, batches, offloads, blacklist entries, and winning-ticket rows even though models declare foreign keys. 

Time comparison logic is fragile and likely incorrect for date-only + time-only cutoffs.

SalesService.record_sale() compares datetime.utcnow().isoformat() to draw.cutoff_time as strings. 

OffloadService.create_offload() uses the same string comparison. 

The frontend default cutoff is just '14:00', and the draw form sends date and cutoff separately. 

A timestamp string like "2026-05-29T06:..." is lexicographically greater than "14:00", meaning sales/offloads can be rejected unexpectedly.

Report generation contains avoidable N+1 query patterns.

For each winning ticket and each agent/dealer path, the service queries grouped ticket totals repeatedly. 

Risk/offload creation repeatedly recomputes all ticket totals inside a loop.

For every offload entry, create_offload() calls get_ticket_totals() for all sales and all offloads, then scans for one ticket. 

This is O(entries × grouped-query-cost) and can degrade quickly as volume grows.

Validation / Checks Performed
✅ python -m compileall -q backend main.py tests

Python syntax compilation passed.

✅ python -m pytest -q

Test suite passed: 22 passed in 0.77s.

❌ cd frontend && npm run build

Failed with TypeScript errors:

frontend/src/api/bridge.ts: _mockDraws is not a known property of PywebviewAPI.

frontend/src/pages/Draws.tsx: string | null passed where string | undefined is expected.

frontend/src/pages/Partners.tsx: same null vs undefined issue.

❌ cd frontend && npm run lint

Failed with 19 errors and 1 warning, mostly React hooks set-state-in-effect rule violations.

✅ python -m pip install --dry-run -r requirements.txt

Requirements parsing/install dry-run succeeded in this environment.

⚠️ npx gitnexus --help

Failed due npm registry 403 Forbidden; GitNexus CLI was unavailable in this environment.

Backend Architecture and Logic Audit
Strengths
The project has a clear layering intent:

API bridge delegates to services. 

Services encapsulate business rules. 

Repositories centralize data access. 

The API bridge wraps database operations in a consistent transactional helper with commit, rollback, and error mapping. 

Domain concepts are reasonably separated: draws, sales, offloads, reports, blacklist, winning tickets, partners, and theme/system services.

Critical Logic Issues
1. Cutoff validation compares incompatible strings
record_sale() does:

if datetime.utcnow().isoformat() > draw.cutoff_time:
This compares a full timestamp to whatever is stored in cutoff_time. 

create_offload() repeats the same pattern. 

The frontend defaults cutoffTime to '14:00', and openDate is a separate date value. 

Impact: if cutoff_time is stored as "14:00", a current ISO timestamp like "2026-05-29T06:..." will compare greater as a string because "2" is greater than "1", causing sales/offloads to close immediately.

Recommendation:

Store either:

a single timezone-aware cutoff_at timestamp, or

separate open_date and cutoff_time with validation that combines them into a datetime.

Use timezone-aware datetime.now(UTC) instead of deprecated/naive datetime.utcnow().

Add tests for:

before cutoff,

exactly at cutoff,

after cutoff,

timezone boundary cases,

malformed cutoff values.

2. API bridge hides unexpected exceptions behind generic internal errors
_with_session() returns generic {"error": "An internal error occurred."} for all non-AppError exceptions. 

This is safe for end users, but the frontend does not receive actionable validation details for JSON parse errors, type mismatches, or unexpected nulls.

Recommendation:

Keep generic user-facing messages, but include structured error codes:

VALIDATION_ERROR

CONFLICT

INTEGRITY_ERROR

INTERNAL_ERROR

For json.JSONDecodeError in create_offload(), return a validation-style error rather than generic internal error. 

3. Partner update/delete semantics cannot clear notes
AgentService.update() only writes note if note is not None. 

The API type accepts note?: string; frontend attempted to send null to clear notes, but TypeScript rejects it because the bridge expects undefined. 

Impact: there is no clean distinction between “leave unchanged” and “clear note.”

Recommendation:

Define a patch DTO where omitted means unchanged and null means clear.

Update TypeScript API signatures to accept string | null where backend supports clearing.

Update service methods to explicitly support null-clearing.

4. Draw update has weak business validation
DrawService.update_draw() permits updates to open date, cutoff, house holding amount, and note without checking status or validating format. 

Risks:

A settled draw’s date/cutoff may be mutated after financial reporting.

Negative house_holding_amount can be stored because the ORM model does not enforce positivity. 

Invalid dates/times can break cutoff logic.

Recommendation:

Restrict draw edits by status:

OPEN: allow date/cutoff/hold/note edits.

CLOSED: maybe allow note only.

SETTLED: immutable except administrative notes.

Validate open_date as ISO date and cutoff_time as either HH:MM or a full timestamp, depending on chosen schema.

Add checks for non-negative hold amounts.

5. Sales and offload validation should verify related entities explicitly
SalesService.get_or_create_batch() verifies the draw exists, but does not verify the agent exists before creating a batch. 

With SQLite foreign keys currently disabled at runtime, this can create invalid batches. 

OffloadService.create_offload() relies on foreign-key enforcement to validate master_dealer_id, but foreign keys are off. 

Recommendation:

Enable SQLite foreign keys per connection.

Also validate related entities at the service layer for better user errors:

agent_id exists before batch creation.

master_dealer_id exists before offloading.

6. Risk telemetry is still placeholder data
RiskService.get_telemetry() returns fixed zero-value categories unrelated to real draw liability. 

Recommendation:

Either label it clearly as system telemetry placeholder in the UI, or replace it with actual risk metrics:

total open draw sales,

total pending offload,

top risk tickets,

blocked-ticket exposure,

cutoff proximity,

unsettled draw count.

Database Schema and Query Performance Audit
Critical Database Initialization Issue
The ORM models define tables and indexes, but the raw SQL schema defines additional behavior:

PRAGMA foreign_keys = ON. 

PRAGMA journal_mode = WAL. 

triggers enforcing:

one open draw,

status transitions,

sales cutoff/open status,

batch/draw/agent match,

block-listed tickets,

batch total synchronization,

offload/winning-ticket draw status checks. 

views for current draw sales/offloads. 

But runtime initialization only does:

Base.metadata.create_all(get_engine())

Observed live DB state:

foreign_keys = 0

journal_mode = delete

triggers = 0

views = 0

Impact: The documented schema is not the actual runtime schema. Business invariants rely almost entirely on Python services, and direct database manipulation or disabled FK enforcement can corrupt data.

Recommendations
1. Make the ORM and SQL schema converge
Choose one migration path:

Option A: SQLAlchemy/Alembic-first

Define all constraints in ORM/migrations.

Use Alembic migrations to create triggers/views where needed.

Remove or mark schema.sql as reference-only.

Option B: SQL-first

Execute schema.sql and views.sql during initialization/migration.

Ensure SQLAlchemy models match the installed tables exactly.

Given requirements.txt includes Alembic, the best long-term path is Alembic. requirements.txt includes alembic==1.18.4.

2. Enable SQLite PRAGMAs on every connection
PRAGMA foreign_keys=ON must be applied per SQLite connection, not only once in a file. Add a SQLAlchemy connect event listener.

Also consider:

PRAGMA journal_mode=WAL

PRAGMA busy_timeout=5000

PRAGMA synchronous=NORMAL

3. Add missing ORM constraints
The raw schema has checks not represented in the ORM models:

agents.id and master_dealers.id length <= 3 in SQL. 

ticket format checks in SQL. 

The ORM models do not define those ticket-format and ID-length checks. 

4. Add uniqueness for one batch per draw/agent
get_or_create_batch() assumes one batch per draw/agent. 

But neither the ORM model nor SQL schema defines a unique constraint on (draw_id, agent_id). 

Recommendation:

Add UNIQUE(draw_id, agent_id).

Make get_or_create_batch() robust against race conditions.

5. Optimize report queries
Current report generation repeatedly recomputes grouped maps:

Agent winning-ticket calculations call get_by_ticket_grouped_by_agent() for each winner. 

Dealer winning-ticket calculations call get_by_ticket_grouped_by_dealer() for each winner. 

Admin section repeatedly calls total sales/offloads helper methods that each recompute all grouped totals. 

Recommendation:

Fetch all required aggregates once:

sales by agent,

sales by ticket,

sales by (ticket, agent),

offloads by dealer,

offloads by ticket,

offloads by (ticket, dealer).

Pass precomputed dictionaries into report section builders.

6. Optimize offload validation
create_offload() currently calls sales/offload grouped-total queries inside the entry loop. 

Recommendation:

Precompute:

sales_totals = dict(get_ticket_totals(draw_id))

offload_totals = dict(get_ticket_totals(draw_id))

blocked_tickets = set(...)

As each entry is validated, update an in-memory pending/offloaded map so multiple entries for the same ticket cannot exceed pending liability in aggregate.

Frontend UI / UX and TypeScript Audit
Build-Breaking Issues
1. Mock API typing is invalid
getAPI() returns PywebviewAPI, but the mock object includes _mockDraws, _nextDrawId, and other state fields not defined in PywebviewAPI. 

Recommendation:

Type mock implementation as PywebviewAPI & MockState.

Or create a separate const mockApi: PywebviewAPI & MockState = { ... } and return it as PywebviewAPI.

Or move mock state into closure variables rather than object properties.

2. null is passed where the API expects undefined
Examples:

api.update_draw(..., note || null) conflicts with note?: string. 

api.update_agent(..., form.note || null) conflicts with note?: string. 

Recommendation:

Use note || undefined if empty means unchanged.

Prefer a true patch contract if empty should clear the note.

Lint / React Hook Issues
The project uses modern React hooks linting that flags synchronous state updates in effects. Several pages load data in effects and then update state as part of the called function.

Examples:

Draws initial fetch and selected-draw sync. 

Partners initial fetch. 

Sales initial fetch and sync. 

Report draw loading. 

Risk initialization and reset-selection effects. 

Recommendation options:

Adopt a data-fetching library such as TanStack Query.

Create project-standard async resource hooks.

Adjust eslint configuration if this rule is too strict for the current architecture.

Avoid derived-state sync effects where possible; derive selected IDs from current data or update selection inside the same event/response path that changes the list.

UX Findings
1. Dashboard contains placeholders and non-feedback actions
Dashboard shows “Nightingale chart placeholder” and “Status panel placeholder,” and Ping Backend calls api.ping() without displaying a result. 

Recommendation:

Replace placeholders with real status:

active draw,

today’s total sales,

pending offload exposure,

unsettled draw warning,

last report generated.

Make quick actions navigate to workflows or display toast feedback.

2. Navigation is desktop-oriented and may not adapt well
Navbar is a fixed set of links split left/right around a trapezoid brand. 

Recommendation:

Add responsive behavior for narrow windows:

compact menu,

horizontal scroll,

icon+label variants,

keyboard focus styling.

Ensure active route and focus states are visually distinct in both dark and light themes.

3. Heavy reliance on inline styles
Many pages use inline layout styles for grid placement and internal spacing, for example Dashboard cards. 

Recommendation:

Move layout classes into SCSS modules/partials.

Use design tokens consistently.

This will improve maintainability and reduce scattered visual logic.

4. Accessibility risks
The UI uses many icon buttons and stylized controls. Some icons are SVG-only helper components. 

Recommendation:

Ensure every icon-only button has an aria-label.

Confirm modal dialogs trap focus and close on Escape.

Ensure color-only statuses have text labels.

Verify contrast in light theme; token overrides exist but should be checked on actual UI. 

5. BrowserRouter may be fragile for desktop/static serving
The app uses BrowserRouter. 

For a Vite app served through a minimal static server in pywebview, direct deep links like /sales may 404 unless the static server falls back to index.html. The current static server uses SimpleHTTPRequestHandler with no SPA fallback. 

Recommendation:

Use HashRouter for a desktop app, or

implement an SPA fallback handler for production static serving.

Security / Robustness Observations
No authentication/authorization.

Acceptable for local desktop-only pywebview, but risky if API exposure changes.

Generic error handling is safe but not observable.

Add structured logging context: method name, draw ID, agent/dealer ID, and correlation ID.

No input size limits.

Sales multiline input and offload JSON should have reasonable limits to prevent UI freezes or huge transactions.

No migrations.

Existing data/3d_reporter.db may drift from models/schema over time.

Deletion behavior is not carefully modeled.

Foreign keys exist in model declarations, but no explicit ondelete rules are defined. 

With FK enforcement disabled, deletes may orphan related records.

Recommended Remediation Plan
Phase 1 — Make the app build and lint clean
Fix TypeScript build errors:

Mock API typing.

null vs undefined API call arguments.

Decide whether to satisfy or disable React 19 set-state-in-effect rule.

Add CI commands:

python -m compileall -q backend main.py tests

python -m pytest -q

cd frontend && npm run build

cd frontend && npm run lint

Phase 2 — Fix database correctness
Enable SQLite foreign keys per connection.

Decide whether schema.sql is authoritative.

Add migrations for:

PRAGMAs / connection events,

missing constraints,

unique (draw_id, agent_id),

triggers or equivalent service tests,

views if still needed.

Add tests that verify:

FK enforcement is on,

one open draw invariant,

batch cannot reference missing agent/draw,

deleting referenced entities behaves as intended.

Phase 3 — Fix core business logic
Replace cutoff string comparisons with real datetime parsing.

Validate draw date/cutoff/house-hold inputs.

Validate partner IDs, commission, JP/SP factors.

Ensure offload batch validation accounts for multiple selected entries for the same ticket.

Clarify whether settled/closed records are immutable.

Phase 4 — Query and performance optimization
Precompute aggregate maps in ReportService.

Precompute sales/offload totals once in OffloadService.create_offload().

Add database indexes for combined access patterns if needed:

sales(draw_id, agent_id)

offloaded(draw_id, master_dealer_id)

possibly winning_tickets(draw_id, ticket)

Add lightweight query-count tests for report generation.

Phase 5 — UX improvements
Replace Dashboard placeholders with operational widgets.

Add toasts/inline feedback for actions like ping, save, export, delete.

Add confirmation dialogs for destructive actions.

Add accessibility pass:

labels,

focus,

keyboard navigation,

contrast,

reduced-motion support.

Testing
✅ python -m compileall -q backend main.py tests

✅ python -m pytest -q

❌ cd frontend && npm run build

❌ cd frontend && npm run lint

✅ python -m pip install --dry-run -r requirements.txt

⚠️ npx gitnexus --help — GitNexus package access failed with npm registry 403 Forbidden.