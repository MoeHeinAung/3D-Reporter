# 3D Reporter — Coding Standards

## Python (Backend)

### Type Hints
- **All function signatures must be fully annotated** (parameters and return types).
- Use `from __future__ import annotations` in every file.
- Use `| None` (not `Optional`) for nullable types where possible (Python 3.10+).
- Use `dict[str, Any]` not `Dict`; use `list[T]` not `List[T]`.

### Docstrings
- Every public function, class, and method must have a docstring.
- Use Google-style: one-line summary, blank line, then Args/Returns/Raises as needed.
- Internal/private helpers (`_prefixed`) may skip docstrings if the name is self-documenting.

### Imports
- Order: stdlib → third-party → local (separated by blank lines).
- Use absolute imports within the `backend` package (e.g., `from backend.config import DATABASE_URL`).

### Exception Handling
- Never use bare `except:`.
- Raise custom exceptions from `backend.errors` (`NotFoundError`, `ValidationError`, `ConflictError`, `DatabaseError`).
- Only the API layer catches exceptions and converts them to user-facing messages.
- Use `logger.exception()` in except blocks to capture stack traces.

### Architecture Rules (hard constraints)
1. **No business logic in the API layer.** `api.py` delegates to services only.
2. **No database access outside repositories.** Use `BaseRepository` subclasses for all queries.
3. **All domain logic in services.** Validation, state machines, calculations — services only.
4. **No layer skipping.** API → Service → Repository → Database. Frontend never touches the DB directly.
5. **Configuration from `backend.config` only.** No hardcoded paths, URLs, or magic values.

### SQLAlchemy
- Use 2.0 style: `Mapped` + `mapped_column` + `DeclarativeBase`.
- Use `session.flush()` for intermediate saves within a transaction; `session.commit()` only at the boundary.
- Define indexes and constraints as `__table_args__` on the model class.

### Logging
- Use `logging.getLogger(__name__)` in every module.
- DEBUG: detailed flow (SQL queries, parameter values).
- INFO: key operations (draw opened, sale recorded).
- WARNING: recoverable issues (legacy migration failed, retry succeeded).
- ERROR: failures that need attention.

### Line Length
- 100 characters maximum.

---

## TypeScript (Frontend)

### Types
- Prefer `interface` over `type` for object shapes.
- Use `type` only for unions, intersections, and mapped types.
- Use `import type { ... }` for type-only imports.
- Never use `any`. Use `unknown` when the type is truly uncertain.
- Define proper interfaces for all API responses in `types/api.ts`.

### Imports
- Use `@/` path alias for all imports within `src/` (e.g., `import { api } from '@/api/bridge'`).
- Never use relative imports beyond one directory level (no `../../../`).
- Order: React/third-party → local modules → styles.

### Components
- One default export per component file.
- Co-locate types and constants in the same file if only used by that component.
- Components should only render JSX and call hooks — no direct API calls or business logic.
- Extract data fetching into custom hooks.

### State Management (Zustand)
- One store per domain concern.
- Keep actions simple and co-located with state.
- Use selectors for derived state to prevent unnecessary re-renders.
- Stores are importable anywhere — use them directly in singleton components (like Navbar).

### Hooks
- Extract all data fetching and effect logic into custom hooks in `hooks/`.
- Hook naming: `use<Thing>` (e.g., `useTheme`, `useUptime`).
- Handle loading, error, and data states in every data-fetching hook.

### CSS/SCSS
- Use BEM naming for component classes (`.navbar`, `.navbar__link`, `.navbar__link--active`).
- Never use IDs for styling.
- Use CSS custom properties (design tokens) for all colors, spacing, and typography values.
- Define new tokens in `styles/abstracts/_tokens.scss`.
- Use the Sass module system: `@use 'sass:math'` when using `math.div()`.
- Prefer `@if`/`@else` over the legacy `if()` function.

---

## Testing

### Backend (pytest)
- **Framework:** pytest with in-memory SQLite.
- **Fixtures:** `conftest.py` provides engine, session, and sample data.
- **Session scope:** Each test gets a fresh session that rolls back after the test.
- **No mocking of repositories in service tests:** Use real repositories backed by in-memory SQLite. This catches actual SQL/ORM bugs.
- **Coverage targets:** 80% on services and repositories, 60% overall.
- **Test naming:** `test_<unit>_<scenario>_<expected_result>`.
  - Example: `test_open_draw_when_draw_already_open_raises_conflict_error`
- **Test both paths:** Every service method must have tests for success and at least one failure path.
- **Run:** `pytest tests/ -v`
- **Run with coverage:** `pytest tests/ --cov=backend --cov-report=term-missing`

### Frontend (future)
- Component tests with React Testing Library.
- Hook tests with `renderHook`.
- Store tests as plain unit tests (zustand stores are plain functions).

---

## Git

### Commits
Use [Conventional Commits](https://www.conventionalcommits.org/):

| Prefix | Usage |
|--------|-------|
| `feat:` | New feature |
| `fix:` | Bug fix |
| `refactor:` | Code restructuring without behavior change |
| `docs:` | Documentation only |
| `test:` | Adding or updating tests |
| `chore:` | Maintenance, dependencies, config |
| `style:` | Formatting, whitespace (no code change) |

### Branches
- `feature/<description>` — new features
- `fix/<description>` — bug fixes
- `refactor/<description>` — refactoring

### What Not to Commit
- Generated files: `__pycache__/`, `node_modules/`, `.venv/`, `dist/`
- Environment files: `.env`, `.env.local`
- IDE files: `.idea/`, `.vscode/`
- Database files: `*.db`, `*.sqlite3`

---

## Project Commands

```bash
# Backend
python main.py                          # Run the desktop app (dev mode)
python main.py VITE_DEV=0               # Run in production mode
pytest tests/ -v                        # Run all tests
pytest tests/ --cov=backend             # Run tests with coverage

# Frontend
cd frontend && npm run dev              # Vite dev server (standalone)
cd frontend && npm run build            # Production build
cd frontend && npm run lint             # ESLint
```
