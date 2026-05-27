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

## 5. UX & Aesthetic Integrity
**Challenge:** Adherence to the "Futuristic Precision" design system.

*   **Layout Overflow**
    *   **Context:** Content expansion breaking the "HUD" aesthetic by introducing global scrollbars.
    *   **Resolution:** Enforce a strict non-scrolling viewport architecture (`100vh`). Utilize localized scroll containers (`.scroll-container`) within rigid grid cards to manage content overflow.
*   **Aesthetic Drift**
    *   **Context:** Introduction of standard UI elements that clash with the sci-fi theme.
    *   **Resolution:** Strictly follow the `design-system.md` specifications. Use the centralized SCSS theme for "Void Black" backgrounds and "Neon" accents, maintaining a consistent 12x8 grid layout.
