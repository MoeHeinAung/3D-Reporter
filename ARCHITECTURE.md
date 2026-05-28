# 3D Reporter — Architecture

## Overview

3D Reporter is a desktop application for managing a 3D lottery system. It uses a **pywebview** desktop shell hosting a **React** frontend backed by a **Python** backend with **SQLite3** storage.

```
main.py (entry point)
  ├── Starts Vite dev server (dev) or static HTTP server (prod)
  ├── Creates pywebview native window
  └── Initializes backend services

pywebview JS Bridge
  ┌──────────────────────────────────────┐
  │  Frontend (React + TypeScript)       │
  │  ┌─────────┐  ┌──────┐  ┌────────┐  │
  │  │  Pages   │  │ Hooks │  │ Stores │  │
  │  └────┬─────┘  └──┬───┘  └───┬────┘  │
  │       └───────────┼───────────┘       │
  │              bridge.ts                │
  └──────────────────┼───────────────────┘
                     │ window.pywebview.api
  ┌──────────────────┼───────────────────┐
  │  Backend (Python)                    │
  │  ┌──────────────┐                    │
  │  │  API Layer   │  api.py            │
  │  │  (bridge)    │  Thin delegation   │
  │  └──────┬───────┘                    │
  │  ┌──────┴───────┐                    │
  │  │  Services    │  Business logic    │
  │  │  (domain)    │  State machines    │
  │  └──────┬───────┘  Validation        │
  │  ┌──────┴───────┐                    │
  │  │  Repositories│  Data access       │
  │  │  (data)      │  CRUD operations   │
  │  └──────┬───────┘                    │
  │  ┌──────┴───────┐                    │
  │  │  Database    │  SQLAlchemy ORM    │
  │  │  (models)    │  SQLite3           │
  │  └──────────────┘                    │
  └──────────────────────────────────────┘
```

## Layer Descriptions

### 1. Database Layer (`backend/database/`)
- **`connection.py`** — Lazy-initialized SQLAlchemy engine singleton, session factory, `init_db()`
- **`models.py`** — 9 ORM models (Agent, MasterDealer, Draw, Batch, Sale, Offloaded, BlacklistTicket, WinningTicket, Preference) using SQLAlchemy 2.0 `Mapped` style
- **`schema.sql`** — Reference DDL (documentation only; triggers are enforced in services)

### 2. Repository Layer (`backend/repositories/`)
- **`base.py`** — Generic `BaseRepository[T]` with `get_by_id`, `get_all`, `create`, `update`, `delete`, `count`
- **Entity repositories** — One per entity, extending `BaseRepository` with domain-specific queries (e.g., `DrawRepository.get_open_draw()`, `BlacklistRepository.is_blocked()`)
- All database access flows through repositories; no raw SQL or ORM queries outside this layer

### 3. Service Layer (`backend/services/`)
- **`system_service.py`** — System info, uptime, server time (no DB dependency)
- **`theme_service.py`** — Theme preference CRUD via `preferences` table; auto-migrates from legacy JSON
- **`risk_service.py`** — Risk telemetry aggregation (placeholder)
- **`draw_service.py`** — Draw lifecycle state machine (`OPEN → CLOSED → SETTLED`); single-open-draw enforcement
- **`sales_service.py`** — Sales validation (draw status, cutoff, batch integrity, BLOCK blacklist, ticket format, batch total sync)

### 4. API Layer (`backend/api.py`)
- Thin delegation layer — receives calls from the JS bridge, creates services, commits/rollbacks sessions
- Error handling: `AppError` subclasses → error dicts; unhandled exceptions → generic error
- All method signatures match the pywebview bridge contract

### 5. Frontend Layer (`frontend/src/`)
- **`api/bridge.ts`** — Typed wrapper around `window.pywebview.api` with mock fallback for browser dev
- **`types/`** — Shared TypeScript interfaces (`api.ts` for request/response shapes, `domain.ts` for domain entities)
- **`stores/`** — Zustand stores (`themeStore`, `systemStore`) for global state
- **`hooks/`** — Custom hooks (`useTheme`, `useUptime`, `useSystemInfo`, `useApi`) encapsulating data fetching
- **`components/`** — Reusable UI components (currently `Navbar`)
- **`pages/`** — Route-level components rendered by react-router
- **`styles/`** — SCSS design system (abstracts, base, components)

## Data Flow

### Theme Toggle (example)
```
User clicks toggle → Navbar calls useTheme().toggleTheme()
  → themeStore.toggleTheme()
    → updates DOM (data-theme attribute)
    → calls api.set_theme_preference()
      → API._with_session()
        → ThemeService.set_theme()
          → Preference model → SQLite
```

### Sale Recording (example)
```
User submits sale form → page calls api.record_sale()
  → API._with_session()
    → SalesService.record_sale()
      → validates draw OPEN, cutoff, batch match, BLOCK blacklist, ticket format
      → SaleRepository.create()
      → recalculates batch total
    → session.commit()
```

## Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| Synchronous SQLAlchemy | pywebview bridge is sync; async adds complexity with no benefit for single-user desktop app |
| Triggers → Service layer | Business rules in triggers are invisible and hard to test; services are the single source of truth |
| Zustand over Context | Avoids provider nesting and re-render cascading; stores importable outside React tree |
| Theme in SQLite not JSON | All persistence through API→Service→Repository pipeline for consistency |
| Separate repository per entity | Each entity has unique queries; base class provides shared CRUD |
| Navbar reads stores directly | Singleton app-shell component doesn't need prop drilling |
| `_with_session` helper | DRY session lifecycle (get→execute→commit/rollback→close) in API layer |

## Database

9 tables in SQLite3 (via SQLAlchemy ORM with `Base.metadata.create_all()`):

| Table | Purpose | Key constraints |
|-------|---------|----------------|
| `agents` | Agent codes and commission factors | Natural PK (varchar(3)) |
| `master_dealers` | Master dealer codes and factors | Natural PK (varchar(3)) |
| `draws` | Lottery draw lifecycle | CHECK status, single-OPEN enforced by service |
| `batches` | Groups of sales per agent/draw | FK to draws + agents |
| `sales` | Individual ticket sales | FK to draws + agents + batches; positive amount |
| `offloaded` | Risk transferred to master dealers | FK to draws + master_dealers; positive amount |
| `blacklist_tickets` | HALF/BLOCK ticket restrictions | UNIQUE(draw_id, ticket, type) |
| `winning_tickets` | Jackpot/Minor winners | UNIQUE(draw_id, ticket, type) |
| `preferences` | Key-value settings store | TEXT PK |

## Testing

- **Framework:** pytest with in-memory SQLite
- **Fixtures:** Session-per-test with automatic rollback
- **Coverage target:** 80% on services and repositories
- **Test data:** No mocking of repositories in service tests — use real repos with in-memory DB
