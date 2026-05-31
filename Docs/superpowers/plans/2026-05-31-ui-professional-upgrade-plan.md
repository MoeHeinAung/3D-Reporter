# UI Professional Upgrade — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refine the "Nexus Terminal" UI to a more polished, professional look by upgrading color tokens, typography, card interiors, tables, inputs, animations, and page components — while preserving navbar, corner accents, and grid container.

**Architecture:** SCSS-first refinement. Foundation layers (tokens, typography, animations) change first, then component partials (card, tables, inputs, draws, report), then page TSX files. New `_tables.scss` and `_data-display.scss` partials extract reusable patterns. All changes are CSS + TSX content layout — no new dependencies, no backend changes.

**Tech Stack:** SCSS with CSS custom properties, React 18 + TypeScript, Zustand stores (unchanged), pywebview bridge (unchanged)

---

### Task 1: Color Palette — Refine design tokens

**Files:**
- Modify: `frontend/src/styles/abstracts/_tokens.scss`

- [ ] **Step 1: Update dark mode color tokens**

In `_tokens.scss`, replace the dark mode `:root` block colors (lines 8-14, 21-31):

```scss
:root {
  // ----- Color Palette: Deep Space (Dark Mode) -----
  --color-void:       #080C12;
  --color-obsidian:   #0D1117;
  --color-primary:    #00C8E0;
  --color-secondary:  #7B8CE0;
  --color-error:      #FF3366;
  --color-border:     #1E2A3A;

  // Tertiary accents
  --color-success:    #00C853;
  --color-warning:    #D97706;
  --color-info:       #38BDF8;
  --color-warm:       #C4A35A;

  // Derived UI roles
  --color-bg-root:         var(--color-void);
  --color-bg-surface:      var(--color-obsidian);
  --color-bg-elevated:     #11171E;
  --color-surface-alt:     #141B24;
  --color-text-primary:    #EDF2F7;
  --color-text-secondary:  #8896A8;
  --color-text-muted:      #545F71;
  --color-accent-glow:     rgba(0, 200, 224, 0.25);
  --color-error-glow:      rgba(255, 51, 102, 0.25);
  --color-glass-bg:        rgba(13, 17, 23, 0.8);
  --color-glass-border:    rgba(255, 255, 255, 0.05);
  --color-radial-glow:     radial-gradient(ellipse at 30% 20%, rgba(0, 200, 224, 0.04) 0%, transparent 60%);

  // New utility tokens
  --color-navbar-bg:       rgba(4, 8, 16, 0.92);
  --color-table-stripe:    rgba(0, 200, 224, 0.015);
  --color-table-hover:     rgba(0, 200, 224, 0.04);
  --color-border-glow:     rgba(0, 200, 224, 0.12);
```

- [ ] **Step 2: Update derived shadows and glows**

Replace shadow/glow tokens (lines 95-101):

```scss
  // ----- Shadows & Glows -----
  --shadow-neon-primary:   0 0 4px rgba(0, 200, 224, 0.4), 0 0 12px rgba(0, 200, 224, 0.15), 0 0 24px rgba(0, 200, 224, 0.06);
  --shadow-neon-secondary: 0 0 4px rgba(123, 140, 224, 0.4), 0 0 12px rgba(123, 140, 224, 0.15), 0 0 24px rgba(123, 140, 224, 0.06);
  --shadow-neon-error:     0 0 4px rgba(255, 51, 102, 0.4), 0 0 12px rgba(255, 51, 102, 0.15), 0 0 24px rgba(255, 51, 102, 0.06);
  --shadow-surface:        0 2px 16px rgba(0, 0, 0, 0.5), 0 8px 40px rgba(0, 0, 0, 0.3);
  --shadow-inner-glow:     inset 0 1px 0 rgba(255, 255, 255, 0.03);
  --shadow-navbar-glow:    inset 0 -1px 0 rgba(0, 200, 224, 0.15);
```

- [ ] **Step 3: Update light mode overrides (attribute)**

Replace the `[data-theme="light"]` block (lines 134-169) with matching refined values:

```scss
[data-theme="light"] {
  --color-void:       #F4F6FA;
  --color-obsidian:   #FFFFFF;
  --color-primary:    #008C99;
  --color-secondary:  #5B6EC0;
  --color-error:      #E11D48;
  --color-border:     #D1D5DB;

  --color-success:    #00A848;
  --color-warning:    #B85C05;
  --color-info:       #0277B8;
  --color-warm:       #A8893A;

  --color-bg-root:         var(--color-void);
  --color-bg-surface:      var(--color-obsidian);
  --color-bg-elevated:     #E8ECF1;
  --color-surface-alt:     #DEE2E8;
  --color-text-primary:    #111318;
  --color-text-secondary:  #4B5362;
  --color-text-muted:      #7B8398;
  --color-accent-glow:     rgba(0, 140, 153, 0.15);
  --color-error-glow:      rgba(225, 29, 72, 0.15);
  --color-glass-bg:        rgba(255, 255, 255, 0.75);
  --color-glass-border:    rgba(0, 0, 0, 0.06);
  --color-radial-glow:     radial-gradient(ellipse at 30% 20%, rgba(0, 140, 153, 0.03) 0%, transparent 60%);

  --color-navbar-bg:       rgba(244, 246, 250, 0.92);
  --color-table-stripe:    rgba(0, 140, 153, 0.02);
  --color-table-hover:     rgba(0, 140, 153, 0.04);
  --color-border-glow:     rgba(0, 140, 153, 0.1);

  --shadow-neon-primary:   0 0 4px rgba(0, 140, 153, 0.3), 0 0 12px rgba(0, 140, 153, 0.1), 0 0 20px rgba(0, 140, 153, 0.04);
  --shadow-neon-secondary: 0 0 4px rgba(91, 110, 192, 0.3), 0 0 12px rgba(91, 110, 192, 0.1), 0 0 20px rgba(91, 110, 192, 0.04);
  --shadow-neon-error:     0 0 4px rgba(225, 29, 72, 0.3), 0 0 12px rgba(225, 29, 72, 0.1), 0 0 20px rgba(225, 29, 72, 0.04);
  --shadow-surface:        0 2px 16px rgba(0, 0, 0, 0.06), 0 8px 40px rgba(0, 0, 0, 0.04);
  --shadow-inner-glow:     inset 0 1px 0 rgba(255, 255, 255, 0.6);
  --shadow-navbar-glow:    inset 0 -1px 0 rgba(0, 140, 153, 0.12);
}
```

- [ ] **Step 4: Update prefers-color-scheme light block**

Replace the `@media (prefers-color-scheme: light)` block (lines 172-209) with the same values from Step 3.

- [ ] **Step 5: Verify tokens compile**

```bash
cd frontend && npx sass src/styles/main.scss /dev/null --no-source-map
```

Expected: Exit code 0, no errors.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/styles/abstracts/_tokens.scss
git commit -m "refine(ui): upgrade color palette tokens for professional polish
@@ -0,0 +1,0 @@
- Deepen void (#080C12) and obsidian (#0D1117) for richer darks
- Shift primary cyan from #00E5FF to #00C8E0 (less neon)
- Shift secondary from #A855F7 to #7B8CE0 (refined indigo)
- Reduce glow intensities ~30% across all states
- Add --color-warm (gold) and --color-surface-alt tokens
- Update light theme overrides to match"
```

---

### Task 2: Typography — Refine type scale and application

**Files:**
- Modify: `frontend/src/styles/base/_typography.scss`

- [ ] **Step 1: Update Google Fonts import with font-display: swap**

Replace the `@import url(...)` line:

```scss
@import url('https://fonts.googleapis.com/css2?family=Instrument+Sans:wdth,wght@75..100,400..700&family=JetBrains+Mono:ital,wght@0,100..800;1,100..800&family=Tektur:wdth,wght@75..100,400..900&display=swap');
```

- [ ] **Step 2: Relax heading tracking for h1-h3**

Replace the heading rules (lines 35-47):

```scss
h1, h2, h3, h4,
.h1, .h2, .h3, .h4 {
  font-family: var(--font-heading);
  font-weight: 600;
  letter-spacing: var(--tracking-heading);
  text-transform: uppercase;
  line-height: var(--leading-tight);
  text-rendering: optimizeLegibility;
}

h1, .h1 { font-size: var(--text-4xl); letter-spacing: 0.04em; }
h2, .h2 { font-size: var(--text-3xl); letter-spacing: 0.04em; }
h3, .h3 { font-size: var(--text-2xl); letter-spacing: 0.04em; }
h4, .h4 { font-size: var(--text-xl); }
```

- [ ] **Step 3: Improve body line-height**

Replace the body/text-body rule (lines 73-78):

```scss
body,
.text-body {
  font-family: var(--font-body);
  font-size: var(--text-base);
  font-weight: 400;
  line-height: 1.5;
}
```

- [ ] **Step 4: Add text-body-lg utility**

After the `.text-body-sm` rule, add:

```scss
.text-body-lg {
  font-family: var(--font-body);
  font-size: var(--text-md);
  line-height: 1.5;
  color: var(--color-text-secondary);
}
```

- [ ] **Step 5: Reduce telemetry text-shadow glow**

In the `.telemetry, .mono` rule (line 97), change:

```scss
text-shadow: 0 0 2px rgba(0, 200, 224, 0.2);
```

- [ ] **Step 6: Add label variant utilities**

After the `.label-sm` rule, add:

```scss
.label-positive { color: var(--color-success); }
.label-warning  { color: var(--color-warning); }
```

- [ ] **Step 7: Verify typography compiles**

```bash
cd frontend && npx sass src/styles/main.scss /dev/null --no-source-map
```

Expected: Exit code 0.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/styles/base/_typography.scss
git commit -m "refine(ui): polish typography scale and application
@@ -0,0 +1,0 @@
- Add font-display: swap to Google Fonts import
- Relax h1-h3 letter-spacing from 0.08em to 0.04em
- Improve body line-height from 1.4 to 1.5
- Add .text-body-lg utility class
- Reduce telemetry text-shadow intensity
- Add .label-positive and .label-warning utilities"
```

---

### Task 3: Animations — Remove flashy effects, refine rest

**Files:**
- Modify: `frontend/src/styles/components/_animations.scss`

- [ ] **Step 1: Refine scanline peak opacity**

In the `.scanline::after` rule (line 40), change `rgba(0, 229, 255, 0.15)` to `rgba(0, 200, 224, 0.06)`.

- [ ] **Step 2: Refine page-enter animation**

Replace the `page-enter` keyframes and class:

```scss
@keyframes page-enter {
  from {
    opacity: 0;
    transform: translateY(4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.page-enter {
  animation: page-enter 200ms var(--ease-out-expo) forwards;
}
```

- [ ] **Step 3: Refine fade-in-up animation**

Replace the `fade-in-up` keyframes (lines 99-108):

```scss
@keyframes fade-in-up {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-fade-in-up {
  animation: fade-in-up 300ms var(--ease-out-expo) forwards;
}
```

- [ ] **Step 4: Remove .glitch-hover entirely**

Delete lines 122-148 (the `@keyframes glitch` block and `.glitch-hover` class).

- [ ] **Step 5: Remove .border-chase entirely**

Delete lines 150-173 (the `@keyframes border-chase` block and `.border-chase` class).

- [ ] **Step 6: Refine glow-breathe intensity**

Replace the `glow-breathe` keyframes (lines 178-185):

```scss
@keyframes glow-breathe {
  0%, 100% {
    box-shadow: 0 0 4px rgba(0, 200, 224, 0.2), 0 0 8px rgba(0, 200, 224, 0.06);
  }
  50% {
    box-shadow: 0 0 6px rgba(0, 200, 224, 0.3), 0 0 16px rgba(0, 200, 224, 0.12);
  }
}
```

- [ ] **Step 7: Refine digital-ping — remove rotation**

Replace the `digital-ping` keyframes (lines 64-80):

```scss
@keyframes digital-ping {
  0% {
    transform: scale(1);
    box-shadow: 0 0 0 0 rgba(0, 200, 224, 0.4);
  }
  50% {
    transform: scale(0.97);
  }
  100% {
    transform: scale(1);
    box-shadow: 0 0 0 8px rgba(0, 200, 224, 0);
  }
}
```

- [ ] **Step 8: Refine stagger delay values**

In the stagger-cards rule (lines 242-254), change delay calc from `50ms` to `60ms`:

```scss
.stagger-cards {
  .card {
    opacity: 0;
    animation: fade-in-up 300ms var(--ease-out-expo) forwards;

    @for $i from 1 through 12 {
      &:nth-child(#{$i}) {
        animation-delay: calc(#{$i - 1} * 60ms);
      }
    }
  }
}
```

- [ ] **Step 9: Verify animations compile**

```bash
cd frontend && npx sass src/styles/main.scss /dev/null --no-source-map
```

Expected: Exit code 0.

- [ ] **Step 10: Commit**

```bash
git add frontend/src/styles/components/_animations.scss
git commit -m "refine(ui): polish animations — remove glitch/border-chase, tone down effects
@@ -0,0 +1,0 @@
- Remove .glitch-hover (RGB-split on hover) — too game-like
- Remove .border-chase (circuit trace) — too flashy
- Refine scanline peak opacity 0.15→0.06
- Refine page-enter: 200ms with 4px slide
- Refine fade-in-up: 300ms with 6px slide
- Refine glow-breathe: reduced intensity
- Refine digital-ping: remove rotation, keep scale+glow
- Stagger delay 50ms→60ms"
```

---

### Task 4: Data Display — New stat-group and data-row patterns

**Files:**
- Create: `frontend/src/styles/components/_data-display.scss`
- Modify: `frontend/src/styles/main.scss`

- [ ] **Step 1: Create _data-display.scss**

```scss
// ============================================================================
// DATA DISPLAY PATTERNS — "Nexus Terminal"
// Reusable stat groups and data rows for card interiors.
// ============================================================================

@use '../abstracts/mixins' as *;

// ---- Stat Group — Label-above-value for dashboards ----

.stat-group {
  display: flex;
  flex-direction: column;
  gap: 2px;

  &__label {
    @include hud-text(var(--text-xs));
    color: var(--color-text-secondary);
  }

  &__value {
    font-family: var(--font-mono);
    font-size: var(--text-md);
    font-weight: 500;
    font-variant-numeric: tabular-nums;
    color: var(--color-text-primary);
    text-shadow: 0 0 2px rgba(0, 200, 224, 0.2);
  }

  &__trend {
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    font-variant-numeric: tabular-nums;
    color: var(--color-text-muted);

    &--up   { color: var(--color-success); }
    &--down { color: var(--color-error); }
  }
}

// ---- Stat Grid — Multiple stat groups in a row ----

.stat-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: var(--space-5);
}

// ---- Data Row — Horizontal key→value with optional trend ----

.data-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  padding: var(--space-2) 0;
  border-bottom: 1px solid var(--color-glass-border);

  &:last-child {
    border-bottom: none;
  }

  &__key {
    @include hud-text(var(--text-xs));
    color: var(--color-text-secondary);
    flex-shrink: 0;
  }

  &__value {
    font-family: var(--font-mono);
    font-size: var(--text-sm);
    font-weight: 500;
    font-variant-numeric: tabular-nums;
    color: var(--color-text-primary);
    text-align: right;
    margin-left: var(--space-4);
    text-shadow: 0 0 2px rgba(0, 200, 224, 0.15);

    &--accent { color: var(--color-primary); }
    &--warn   { color: var(--color-warning); }
    &--error  { color: var(--color-error); }
  }
}

// ---- Status Ring — SVG circle for health indicators ----

.status-ring {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;

  &__circle {
    fill: none;
    stroke: var(--color-border);
    stroke-width: 3;
  }

  &__arc {
    fill: none;
    stroke-width: 3;
    stroke-linecap: round;
    transform: rotate(-90deg);
    transform-origin: center;
    transition: stroke-dashoffset 600ms var(--ease-out-expo);

    &--ok    { stroke: var(--color-success); }
    &--warn  { stroke: var(--color-warning); }
    &--error { stroke: var(--color-error); }
  }

  &__text {
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    font-weight: 600;
    fill: var(--color-text-primary);
    text-anchor: middle;
    dominant-baseline: central;
  }
}
```

- [ ] **Step 2: Import _data-display.scss in main.scss**

Add after the `@use 'components/inputs';` line:

```scss
@use 'components/data-display';
```

- [ ] **Step 3: Verify compilation**

```bash
cd frontend && npx sass src/styles/main.scss /dev/null --no-source-map
```

Expected: Exit code 0.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/styles/components/_data-display.scss frontend/src/styles/main.scss
git commit -m "feat(ui): add data-display patterns — stat-group, data-row, status-ring
@@ -0,0 +1,0 @@
- New _data-display.scss partial with reusable data presentation patterns
- .stat-group: label-above-value for dashboard telemetry
- .stat-grid: responsive grid of stat groups
- .data-row: horizontal key→value pair for list-style data
- .status-ring: SVG circle for system health indicators
- Import in main.scss"
```

---

### Task 5: Card Interiors — Refine content layout within cards

**Files:**
- Modify: `frontend/src/styles/components/_card.scss`

- [ ] **Step 1: Tighten header gradient border width**

In `.card__header` (line 47), change `transparent 80%` to `transparent 60%`:

```scss
border-image: linear-gradient(90deg, var(--color-primary) 0%, transparent 60%) 1;
```

- [ ] **Step 2: Add card__header--with-status variant**

After the `.card__header` rule, add:

```scss
  &__header--with-status {
    .card__status-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      margin-right: var(--space-2);

      &--ok    { background: var(--color-success); box-shadow: 0 0 4px var(--color-success); }
      &--warn  { background: var(--color-warning); box-shadow: 0 0 4px var(--color-warning); }
      &--error { background: var(--color-error); box-shadow: 0 0 4px var(--color-error); }
    }
  }
```

- [ ] **Step 3: Add card__section utility**

After the `.card__body` rule, add:

```scss
  // Section grouping within card body
  &__section {
    padding: var(--space-3) 0;

    & + & {
      border-top: 1px solid var(--color-glass-border);
    }
  }
```

- [ ] **Step 4: Add gradient top border to card footer**

In `.card__footer` (line 62), replace the `border-top`:

```scss
border-top: 1px solid transparent;
border-image: linear-gradient(90deg, transparent 0%, var(--color-primary) 40%, transparent 100%) 1;
```

- [ ] **Step 5: Bump compact card padding**

In `.card--compact` (line 110), change `padding: var(--space-3)` to `padding: var(--space-4)`.

- [ ] **Step 6: Verify compilation**

```bash
cd frontend && npx sass src/styles/main.scss /dev/null --no-source-map
```

Expected: Exit code 0.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/styles/components/_card.scss
git commit -m "refine(ui): polish card interiors — sections, status dots, gradient footers
@@ -0,0 +1,0 @@
- Tighten header gradient border from 80% to 60% width
- Add .card__header--with-status variant with colored status dot
- Add .card__section utility for grouping body content
- Change card footer to gradient top border (inverse of header)
- Bump .card--compact padding from space-3 to space-4"
```

---

### Task 6: Tables — New shared table styles partial

**Files:**
- Create: `frontend/src/styles/components/_tables.scss`
- Modify: `frontend/src/styles/main.scss`

- [ ] **Step 1: Create _tables.scss**

```scss
// ============================================================================
// SHARED TABLE STYLES — "Nexus Terminal"
// Reusable table patterns across all pages.
// ============================================================================

@use '../abstracts/mixins' as *;

.table {
  width: 100%;
  border-collapse: collapse;

  thead {
    position: sticky;
    top: 0;
    z-index: 1;
    background:
      linear-gradient(180deg, rgba(0, 200, 224, 0.04) 0%, transparent 100%),
      var(--color-bg-elevated);
    backdrop-filter: blur(8px);

    tr {
      border-bottom: 2px solid var(--color-primary);
    }
  }

  th {
    @include hud-text(var(--text-sm));
    padding: var(--space-2) var(--space-4);
    text-align: left;
    color: var(--color-text-secondary);
  }

  td {
    padding: var(--space-2) var(--space-4);
    font-size: var(--text-sm);
    border-bottom: 1px solid var(--color-glass-border);
    vertical-align: middle;
  }

  tbody tr {
    transition:
      background var(--duration-fast) var(--ease-out-expo),
      border-color var(--duration-fast) var(--ease-out-expo);
    border-left: 2px solid transparent;

    &:nth-child(even) {
      background: var(--color-table-stripe);
    }

    &:hover {
      background: var(--color-table-hover);
      border-left-color: var(--color-primary);
    }
  }
}

// ---- Cell Variants ----

.table__cell--numeric {
  text-align: right;
  font-family: var(--font-mono);
  font-variant-numeric: tabular-nums;
}

.table__cell--mono {
  font-family: var(--font-mono);
  font-size: var(--text-sm);
}

.table__cell--accent {
  color: var(--color-primary);
}

// ---- Empty State ----

.table__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-3);
  padding: var(--space-12) var(--space-5);
  color: var(--color-text-muted);
  font-size: var(--text-sm);
  text-align: center;

  &-icon {
    display: grid;
    place-items: center;
    width: 40px;
    height: 40px;
    border: 2px solid var(--color-text-muted);
    border-radius: 50%;
    font-family: var(--font-heading);
    font-size: var(--text-md);
    opacity: 0.5;
  }
}

// ---- Sort Indicators ----

.table__sortable {
  cursor: pointer;
  user-select: none;
  white-space: nowrap;

  &:hover {
    color: var(--color-primary);
  }
}

.table__sort-arrow {
  display: inline-block;
  width: 0;
  height: 0;
  margin-left: 4px;
  vertical-align: middle;
  border-left: 4px solid transparent;
  border-right: 4px solid transparent;

  &--asc {
    border-bottom: 5px solid var(--color-primary);
    border-top: none;
  }

  &--desc {
    border-top: 5px solid var(--color-primary);
    border-bottom: none;
  }

  &--idle {
    border-bottom: 5px solid var(--color-text-muted);
    border-top: none;
    opacity: 0;
    .table__sortable:hover & { opacity: 0.4; }
  }
}
```

- [ ] **Step 2: Import _tables.scss in main.scss**

Add after the `@use 'components/data-display';` line:

```scss
@use 'components/tables';
```

- [ ] **Step 3: Verify compilation**

```bash
cd frontend && npx sass src/styles/main.scss /dev/null --no-source-map
```

Expected: Exit code 0.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/styles/components/_tables.scss frontend/src/styles/main.scss
git commit -m "feat(ui): add shared table styles partial
@@ -0,0 +1,0 @@
- New _tables.scss with reusable table patterns
- Gradient header row, striped rows, hover with left-border accent
- .table__cell--numeric, --mono, --accent variants
- .table__empty centered placeholder pattern
- CSS triangle sort indicators
- Import in main.scss"
```

---

### Task 7: Inputs & Controls — Refine buttons, toggles, focus rings

**Files:**
- Modify: `frontend/src/styles/components/_inputs.scss`

- [ ] **Step 1: Soften input inset shadow and add inner highlight**

In `.input` (line 18), replace the `box-shadow`:

```scss
box-shadow:
  inset 0 1px 0 rgba(255, 255, 255, 0.03),
  inset 0 1px 3px rgba(0, 0, 0, 0.2);
```

- [ ] **Step 2: Improve placeholder contrast**

In `.input::placeholder` (line 21), change `opacity: 0.5` to `opacity: 0.6`.

- [ ] **Step 3: Add .btn--secondary variant**

After the `.btn--primary` rule (line 115), add:

```scss
// ---- Secondary Button (outlined) ----
.btn--secondary {
  border-color: var(--color-primary);
  color: var(--color-primary);
  background: transparent;

  &:hover {
    background: rgba(0, 200, 224, 0.1);
    box-shadow: 0 0 8px var(--color-accent-glow);
    transform: scale(1.01);
  }

  &:active {
    transform: translateY(1px);
  }
}
```

- [ ] **Step 4: Redesign toggle switch**

Replace the `.toggle` block (lines 188-233):

```scss
// ---- Checkbox / Toggle ----
.toggle {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  cursor: pointer;

  input {
    position: absolute;
    opacity: 0;
    width: 0;
    height: 0;
  }

  &__track {
    width: 36px;
    height: 18px;
    background: var(--color-border);
    border-radius: 2px;
    transition:
      background var(--duration-fast) var(--ease-out-expo),
      box-shadow var(--duration-fast) var(--ease-out-expo);
  }

  input:checked + &__track {
    background: var(--color-primary);
    box-shadow: 0 0 6px var(--color-accent-glow);
  }

  &__thumb {
    position: absolute;
    top: 3px;
    left: 3px;
    width: 12px;
    height: 12px;
    background: var(--color-text-primary);
    border-radius: 1px;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
    transition: transform 200ms cubic-bezier(0.34, 1.3, 0.64, 1);
  }

  input:checked ~ &__thumb {
    transform: translateX(18px);
  }

  &:focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
  }
}
```

- [ ] **Step 5: Add unified double-ring focus for inputs**

Add a new focus utility at the end of the file:

```scss
// ---- Unified Focus Ring ----
.input:focus-visible,
.select:focus-visible,
.textarea:focus-visible {
  outline: none;
  border-color: var(--color-primary);
  box-shadow:
    0 0 0 2px var(--color-void),
    0 0 0 4px var(--color-primary);
}
```

- [ ] **Step 6: Verify compilation**

```bash
cd frontend && npx sass src/styles/main.scss /dev/null --no-source-map
```

Expected: Exit code 0.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/styles/components/_inputs.scss
git commit -m "refine(ui): polish inputs, buttons, and toggle switch
@@ -0,0 +1,0 @@
- Add inner highlight to inputs, softer inset shadow
- Bump placeholder contrast from 50% to 60% opacity
- Add .btn--secondary (outlined cyan) for button hierarchy
- Redesign toggle: thinner track (18px), rounded corners, subtle thumb shadow
- Add unified double-ring focus for all input types"
```

---

### Task 8: Draws & Report SCSS — Table and component refinements

**Files:**
- Modify: `frontend/src/styles/components/_draws.scss`
- Modify: `frontend/src/styles/components/_report.scss`

- [ ] **Step 1: Refine draw list item badge colors to use new tokens**

In `_draws.scss`, update badge backgrounds to reference `--color-primary` for consistency (lines 178-207 stay structurally same but adjust opacity values).

- [ ] **Step 2: Add hover left-border to draw list items already good — skip**

No changes needed to draw list item hover — already has the pattern we want.

- [ ] **Step 3: Refine ticket table header gradient**

In `.draws__ticket-table thead` (line 253), update background to use gradient:

```scss
background:
  linear-gradient(180deg, rgba(0, 200, 224, 0.04) 0%, transparent 100%),
  var(--color-bg-elevated);
```

- [ ] **Step 4: Update table stripe and hover tokens in _draws.scss**

The draw ticket table styles already use `var(--color-table-stripe)` and `var(--color-table-hover)` — these are automatically updated by Task 1. No changes needed.

- [ ] **Step 5: Refine report grand total glow**

In `_report.scss`, find the grand total text-shadow and replace with softer values:

```scss
text-shadow:
  0 0 8px rgba(0, 200, 224, 0.4),
  0 0 20px rgba(0, 200, 224, 0.15);
```

- [ ] **Step 6: Add section dividers for report**

In `_report.scss`, add a new utility after existing report styles:

```scss
.report__section-divider {
  height: 1px;
  margin: var(--space-5) 0;
  border: none;
  background: linear-gradient(90deg, transparent 0%, var(--color-primary) 20%, var(--color-primary) 80%, transparent 100%);
  opacity: 0.3;
}
```

- [ ] **Step 7: Verify compilation**

```bash
cd frontend && npx sass src/styles/main.scss /dev/null --no-source-map
```

Expected: Exit code 0.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/styles/components/_draws.scss frontend/src/styles/components/_report.scss
git commit -m "refine(ui): polish draws and report component styles
@@ -0,0 +1,0 @@
- Add gradient background to ticket table headers
- Refine report grand total glow intensity
- Add .report__section-divider for visual separation
- Update color references to use new tokens"
```

---

### Task 9: Dashboard Page — Stat groups, real content, loading polish

**Files:**
- Modify: `frontend/src/pages/Dashboard.tsx`

- [ ] **Step 1: Read current Dashboard.tsx**

Read the file to get the exact current content before editing.

- [ ] **Step 2: Rewrite the System card body**

Replace the current `dl/dt/dd` key-value pairs with `.stat-group` rows:

```tsx
<div className="card__body">
  {loading ? (
    <div className="scanline" style={{ height: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>
        Loading system data...
      </div>
    </div>
  ) : error ? (
    <div className="draws__state draws__state--error">
      <div className="draws__state-icon">!</div>
      <span>Unable to load</span>
    </div>
  ) : data ? (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      <div className="stat-grid">
        <div className="stat-group">
          <span className="stat-group__label">Python Version</span>
          <span className="stat-group__value">{data.python_version || '—'}</span>
        </div>
        <div className="stat-group">
          <span className="stat-group__label">Platform</span>
          <span className="stat-group__value">{data.platform || '—'}</span>
        </div>
      </div>
      <div className="stat-grid">
        <div className="stat-group">
          <span className="stat-group__label">Database</span>
          <span className="stat-group__value">{data.database || '—'}</span>
        </div>
        <div className="stat-group">
          <span className="stat-group__label">Uptime</span>
          <span className="stat-group__value">{data.uptime || '—'}</span>
        </div>
      </div>
    </div>
  ) : null}
</div>
```

- [ ] **Step 3: Replace Risk Telemetry placeholder with real content**

Replace the current "Nightingale chart placeholder" with:

```tsx
<div className="card__body">
  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
    <div className="data-row">
      <span className="data-row__key">High Severity</span>
      <span className="data-row__value data-row__value--error">—</span>
    </div>
    <div className="data-row">
      <span className="data-row__key">Pending Reviews</span>
      <span className="data-row__value data-row__value--warn">—</span>
    </div>
    <div className="data-row">
      <span className="data-row__key">Active Offloads</span>
      <span className="data-row__value">—</span>
    </div>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--space-5)', color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>
      Risk monitoring active — no alerts
    </div>
  </div>
</div>
```

- [ ] **Step 4: Replace Operational Status placeholder**

Replace the current "Status panel placeholder" with:

```tsx
<div className="card__body">
  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
    <div className="stat-group">
      <span className="stat-group__label">Active Draw</span>
      <span className="stat-group__value" style={{ color: 'var(--color-primary)' }}>—</span>
      <span className="stat-group__trend">No open draw</span>
    </div>
    <div className="stat-group">
      <span className="stat-group__label">Registered Agents</span>
      <span className="stat-group__value">—</span>
    </div>
    <div className="stat-group">
      <span className="stat-group__label">Pending Offloads</span>
      <span className="stat-group__value">—</span>
      <span className="stat-group__trend">Awaiting action</span>
    </div>
  </div>
</div>
```

- [ ] **Step 5: Refine Quick Actions with descriptions**

Replace the three buttons with:

```tsx
<div className="card__body">
  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', height: '100%', justifyContent: 'center' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
      <button className="btn btn--secondary" onClick={handlePing}>
        Ping Backend
      </button>
      <span className="text-body-sm" style={{ color: 'var(--color-text-muted)' }}>Verify API connectivity and response time</span>
    </div>
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
      <button className="btn btn--primary" onClick={handleDigitalPing}>
        Digital Ping
      </button>
      <span className="text-body-sm" style={{ color: 'var(--color-text-muted)' }}>Run full system diagnostic sequence</span>
    </div>
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
      <button className="btn btn--ghost" onClick={handleAlert}>
        Alert
      </button>
      <span className="text-body-sm" style={{ color: 'var(--color-text-muted)' }}>Send test alert to monitoring channel</span>
    </div>
  </div>
</div>
```

- [ ] **Step 6: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit
```

Expected: Exit code 0, no errors.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/pages/Dashboard.tsx
git commit -m "refine(ui): upgrade Dashboard with stat groups and real content placeholders
@@ -0,0 +1,0 @@
- Replace raw dl/dt/dd with .stat-group grid layout in System card
- Replace Risk Telemetry placeholder with .data-row risk summary
- Replace Operational Status placeholder with stat groups
- Add action descriptions to Quick Actions buttons
- Use .btn--secondary for button hierarchy
- Add 'Loading system data...' label during loading state"
```

---

### Task 10: Sales Page — Hover states, textarea font, column widths

**Files:**
- Modify: `frontend/src/pages/Sales.tsx`

- [ ] **Step 1: Read current Sales.tsx**

Read the file to get the exact current content before editing.

- [ ] **Step 2: Update mirror textarea font size**

Find the `<textarea className="sales__textarea">` element and ensure it uses a slightly larger font. If there's an inline style or class, ensure `font-size: var(--text-sm)` is applied (currently 0.8rem — keep as is but ensure it renders well). The font-size is already handled by the SCSS class — no change needed to TSX.

- [ ] **Step 3: Add consistent column width classes to confirmation modal table**

Find the confirmation modal's `<table>` and add the `.table` class alongside existing classes. Add `.table__cell--mono` to ticket number `<td>` cells and `.table__cell--numeric` to amount `<td>` cells.

- [ ] **Step 4: Ensure batch table expand chevron has smooth transition**

Find the expand/collapse chevron icon span and ensure it has an inline style `transition: transform 200ms var(--ease-out-expo)` or add a CSS class.

Add this style to the chevron span's existing style prop:
```tsx
style={{
  display: 'inline-flex',
  transition: 'transform 200ms cubic-bezier(0.16, 1, 0.3, 1)',
  transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
}}
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit
```

Expected: Exit code 0.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/pages/Sales.tsx
git commit -m "refine(ui): polish Sales page — table cell classes, chevron transition
@@ -0,0 +1,0 @@
- Add .table__cell--mono and --numeric classes to confirmation modal
- Add smooth 200ms rotation transition to expand chevrons"
```

---

### Task 11: Draws Page — Cell classes and empty states

**Files:**
- Modify: `frontend/src/pages/Draws.tsx`

- [ ] **Step 1: Read current Draws.tsx**

Read the file to get the exact current content before editing.

- [ ] **Step 2: Add .table__cell--mono to ticket number columns**

Find all ticket table cells displaying ticket numbers (3-digit codes) and add `table__cell--mono` to their className.

- [ ] **Step 3: Update empty states to use .table__empty pattern**

Find empty state divs (e.g., "No draws found", "No tickets") and update them to use:

```tsx
<div className="table__empty">
  <div className="table__empty-icon">—</div>
  <span>No draws found</span>
</div>
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit
```

Expected: Exit code 0.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/Draws.tsx
git commit -m "refine(ui): polish Draws page — mono cells, unified empty states
@@ -0,0 +1,0 @@
- Add .table__cell--mono class to ticket number columns
- Replace ad-hoc empty states with .table__empty pattern"
```

---

### Task 12: Risk Page — Badge refinements, liability indicators

**Files:**
- Modify: `frontend/src/pages/Risk.tsx`

- [ ] **Step 1: Read current Risk.tsx**

Read the file to get the exact current content before editing.

- [ ] **Step 2: Refine tab count badges**

Find tab count badges (the numbers next to tab labels) and ensure they use a consistent smaller style. Replace any inline badge styling with a consistent pattern:

```tsx
<span style={{
  fontFamily: 'var(--font-mono)',
  fontSize: 'var(--text-xs)',
  color: 'var(--color-text-muted)',
  marginLeft: 'var(--space-1)',
}}>
  ({count})
</span>
```

- [ ] **Step 3: Refine liability row highlighting**

Find rows with pending liability and ensure they use a subtle left-border amber indicator instead of a full-row background tint. The existing pattern already uses border-left styling — ensure it uses `rgba(217, 119, 6, 0.4)` for the border color.

- [ ] **Step 4: Add consistent column width classes**

Add `.table__cell--numeric` to amount columns and `.table__cell--mono` to ticket number columns in all risk tables.

- [ ] **Step 5: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit
```

Expected: Exit code 0.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/pages/Risk.tsx
git commit -m "refine(ui): polish Risk page — refined badges, liability indicators, cell classes
@@ -0,0 +1,0 @@
- Refine tab count badges to smaller mono style
- Refine liability row highlighting to subtle amber left border
- Add .table__cell--numeric and --mono classes to risk tables"
```

---

### Task 13: Report Page — Column alignment, section dividers

**Files:**
- Modify: `frontend/src/pages/Report.tsx`

- [ ] **Step 1: Read current Report.tsx**

Read the file to get the exact current content before editing.

- [ ] **Step 2: Add right-alignment to numeric table columns**

Find all financial table `<td>` elements displaying amounts and add `className="table__cell--numeric"`.

- [ ] **Step 3: Add section dividers between agent/dealer/admin sections**

Add `<hr className="report__section-divider" />` between the Agent section, Master Dealer section, and Admin/House consolidated section.

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit
```

Expected: Exit code 0.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/Report.tsx
git commit -m "refine(ui): polish Report page — numeric alignment, section dividers
@@ -0,0 +1,0 @@
- Right-align all amount columns with .table__cell--numeric
- Add .report__section-divider between agent/dealer/admin sections"
```

---

### Task 14: Partners & Settings Pages — Final polish

**Files:**
- Modify: `frontend/src/pages/Partners.tsx`
- Modify: `frontend/src/pages/Settings.tsx`

- [ ] **Step 1: Read current Partners.tsx and Settings.tsx**

Read both files to get the exact current content before editing.

- [ ] **Step 2: Add consistent column classes to Partners tables**

Add `.table__cell--mono` to ID columns and `.table__cell--numeric` to commission/factor columns.

- [ ] **Step 3: Polish Settings empty state**

Replace the current "Application settings -- coming soon" placeholder with:

```tsx
<div className="card__body">
  <div className="table__empty">
    <div className="table__empty-icon">S</div>
    <span>Application settings — coming soon</span>
  </div>
</div>
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit
```

Expected: Exit code 0.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/Partners.tsx frontend/src/pages/Settings.tsx
git commit -m "refine(ui): polish Partners tables and Settings empty state
@@ -0,0 +1,0 @@
- Add .table__cell--mono and --numeric to Partners tables
- Upgrade Settings placeholder to polished empty state"
```

---

### Task 15: Final verification — Build check

**Files:**
- All previously modified files

- [ ] **Step 1: Run SCSS compilation**

```bash
cd frontend && npx sass src/styles/main.scss /dev/null --no-source-map
```

Expected: Exit code 0, no warnings.

- [ ] **Step 2: Run TypeScript check**

```bash
cd frontend && npx tsc --noEmit
```

Expected: Exit code 0, no errors.

- [ ] **Step 3: Run Vite build**

```bash
cd frontend && npm run build
```

Expected: Exit code 0, successful production build.

- [ ] **Step 4: Run ESLint**

```bash
cd frontend && npm run lint
```

Expected: No new errors (existing warnings OK).

- [ ] **Step 5: Commit any final fixes**

```bash
git add -A
git commit -m "chore(ui): final verification — build, lint, and type check pass"
```

---

### Task 16: Run gitnexus_detect_changes before completing

**Files:**
- All changes

- [ ] **Step 1: Run detect_changes**

```bash
npx gitnexus detect-changes
```

Expected: Review affected symbols and processes. Verify no unexpected impact.

- [ ] **Step 2: Commit if any additional findings**

```bash
git add -A
git commit -m "chore: gitnexus change detection review"
```
