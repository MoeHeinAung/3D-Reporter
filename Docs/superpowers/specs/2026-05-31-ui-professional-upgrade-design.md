# UI Professional Upgrade — Design Spec

**Date:** 2026-05-31
**Status:** Approved
**Approach:** 2 — Refined Command Center

## Goal

Upgrade the "Nexus Terminal" UI to a more polished, professional look while preserving the sci-fi identity. Target aesthetic: "mission control at a Fortune 500 company" — premium, refined, intentional.

## Hard Constraints

- **Navbar design** — Must not change (structure, trapezoid logo, link styles)
- **Card corner accents** — Must not change (48px L-brackets at top-left/bottom-right)
- **Grid container** — Must not change (12x8 CSS grid, 24px gap, viewport-locked)

## Section 1: Color Palette

Refine token values in `_tokens.scss` for a more sophisticated, less "neon" feel.

| Token | Current | Proposed |
|-------|---------|----------|
| `--color-void` | `#060B0F` | `#080C12` |
| `--color-obsidian` | `#080F1A` | `#0D1117` |
| `--color-bg-elevated` | `#0D1520` | `#11171E` |
| `--color-primary` | `#00E5FF` | `#00C8E0` |
| `--color-secondary` | `#A855F7` | `#7B8CE0` |
| `--color-accent-glow` | `rgba(0,229,255,0.4)` | `rgba(0,200,224,0.25)` |
| `--color-glass-bg` | `rgba(8,15,26,0.75)` | `rgba(13,17,23,0.8)` |
| New: `--color-warm` | — | `#C4A35A` |
| New: `--color-surface-alt` | — | `#11171E` |

- Glow intensities reduced ~30% across the board
- New warm gold accent (`--color-warm`) for success states and highlights
- Corresponding light theme overrides updated

## Section 2: Typography

Refine type application in `_typography.scss`.

- Relax heading tracking from `0.08em` to `0.04em` for h1-h3
- Body line-height from `1.4` to `1.5`
- Telemetry text-shadow from `0 0 4px` to `0 0 2px`
- New utility classes: `.text-body-lg`, `.label-positive`, `.label-warning`
- Add `font-display: swap` to Google Fonts import

## Section 3: Card Interiors

Refine card content in `_card.scss` and new `_data-display.scss`.

- Header gradient border tightens to 60% width
- New `.card__header--with-status` variant with inline status dot
- New `.card__section` utility for content grouping
- New data patterns: `.stat-group` (label-above-value for dashboards), `.data-row` (horizontal key→value with trend indicator)
- Card footer gets gradient top border (inverse of header)
- `.card--compact` padding bumped from `var(--space-3)` to `var(--space-4)`
- Corner accents, glass panel mixin, and card shell unchanged

## Section 4: Tables & Data Displays

New `_tables.scss` partial, refinements to `_draws.scss` table styles.

- Header row gets subtle gradient background
- Header text size: `--text-xs` → `--text-sm`
- Stripe opacity reduced: `rgba(0,229,255,0.02)` → `rgba(0,200,224,0.015)`
- Row hover adds 2px cyan left border accent
- Standardized cell padding: `var(--space-2) var(--space-4)`
- New `.table__cell--numeric` and `.table__cell--mono` classes
- New `.table__empty` centered placeholder pattern
- Refined sort indicators (CSS triangles)

## Section 5: Inputs & Controls

Refine `_inputs.scss`.

- Inputs: softer inset shadow, inner top highlight, better placeholder contrast
- New `.btn--secondary` (outlined cyan) for button hierarchy
- Toggle switch: thinner track (18px), rounded corners (2px radius), toned-down bounce
- Unified double-ring focus: `0 0 0 2px var(--color-void), 0 0 0 4px var(--color-primary)`
- No markup changes needed

## Section 6: Animations

Refine `_animations.scss`.

- Page enter: 200ms fade + 4px upward slide
- Card entrance: 6px slide over 300ms (was 8px/250ms)
- Scanline: peak opacity 0.15 → 0.06, loading-only use
- **Remove:** `.glitch-hover` (RGB split on hover)
- **Remove:** `.border-chase` (animated circuit trace)
- Refine: `.glow-breathe` reduced intensity
- Refine: `.digital-ping` remove rotation, keep scale+glow
- New: number transition animation (`@property` with fallback)

## Section 7: Page Improvements

### Dashboard (`Dashboard.tsx`)
- System card: `dl/dt/dd` → `.stat-group` rows, add SVG status ring
- Risk Telemetry card: placeholder → top-3 risk rows with severity indicators
- Operational Status card: placeholder → draw/agents/offloads stat groups
- Quick Actions: button hierarchy (primary/secondary/ghost) with descriptions
- Loading: scanline + "Loading system data..." label

### Sales (`Sales.tsx`)
- Agent list: left-border accent on hover
- Batch table: refined chevron rotation (200ms)
- Mirror textarea: larger monospace font
- Confirmation modal: consistent column widths

### Draws (`Draws.tsx`)
- Ticket columns: `.table__cell--mono` class
- Modal form: consistent label+input spacing
- Empty states: unified `.table__empty` pattern

### Risk (`Risk.tsx`)
- Tab badges: smaller, refined
- Liability rows: subtle amber left border instead of full-row tint
- Action footer: better visual separation
- Config inputs: consistent width

### Report (`Report.tsx`)
- Numeric columns: right-aligned
- Section dividers between agent/dealer/admin
- Grand total: refined glow
- Export button: CSS download icon

### Partners (`Partners.tsx`)
- Consistent column widths
- Refined icon buttons

### Settings (`Settings.tsx`)
- Polished empty state with icon

## Files Touched

```
frontend/src/styles/
  abstracts/_tokens.scss        — Color palette + new tokens
  base/_typography.scss          — Type refinements
  components/_card.scss          — Card interior patterns
  components/_tables.scss        — NEW: shared table styles
  components/_data-display.scss  — NEW: stat-group, data-row patterns
  components/_inputs.scss        — Input/button/toggle refinements
  components/_animations.scss    — Remove glitch/border-chase, refine rest
  components/_draws.scss         — Table refinements, badge tweaks
  components/_report.scss        — Table alignment, grand total
  main.scss                      — Import new partials

frontend/src/pages/
  Dashboard.tsx    — Stat groups, status ring, placeholder → real content
  Sales.tsx        — Refined hover states, font size
  Draws.tsx        — Cell classes, empty states
  Risk.tsx         — Badge styling, liability indicators
  Report.tsx       — Column alignment, dividers
  Partners.tsx     — Column widths, icon buttons
  Settings.tsx     — Empty state polish
```

## Not Touched

- `_navbar.scss` and `Navbar.tsx` — preserved exactly
- `_grid.scss` and grid classes — preserved exactly
- `_mixins.scss` — `corner-accent`, `glass-panel-themed`, `hologram-radial` mixins unchanged
- `_background.scss` — grid overlay unchanged
- `_reset.scss` — preserved
- `_theme.scss` — theme toggle preserved
- `_functions.scss` — preserved
- `_scroll-container.scss` — preserved
- `App.tsx` — layout structure preserved
- `KalawTemplate.tsx` — preserved
- All stores, hooks, types, and `bridge.ts` — preserved
