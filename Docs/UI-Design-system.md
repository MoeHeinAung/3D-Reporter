# Design System: "Nexus Terminal" (Refined Command Center)

This document serves as the official visual and structural blueprint for the 3D Reporter frontend. It defines the "UI DNA" that governs the application's aesthetic identity and provides a detailed catalog of the core components used to create an immersive, professional-grade command-and-control interface.

**Last Updated:** 2026-05-31 (UI Professional Upgrade — IMPL-018)

---

## 1. Visual Identity & "UI DNA"

The aesthetic of 3D Reporter is rooted in **"Nexus Terminal"** — a professional orbital-station command-center aesthetic. It balances sci-fi atmosphere with corporate-grade polish. Think: advanced facility operations terminal at a Fortune 500 company, not street-level neon signs.

### 1.1 Core Principles
*   **Atmosphere:** Deep Space / Void. The interface is high-contrast, optimized for dark environments.
*   **Geometry:** Sharp, 0-radius corners. Use of trapezoids and bracketed "corner accents" for structural framing.
*   **Materiality:** Glassmorphism. Semi-transparent surfaces with `backdrop-filter: blur(16px)` and subtle 1px borders.
*   **Information Density:** High density. Designed for professional operators who require maximum telemetry in a single, non-scrolling viewport.
*   **Restraint:** Glow effects are purposeful — they indicate state (active, warning, error), not decoration. Animations are subtle and professional.

### 1.2 Color Palette (Deep Space — Professional Grade)

| Role | Token | Value | Usage |
| :--- | :--- | :--- | :--- |
| **Void** | `--color-void` | `#080C12` | Root application background (slightly warm deep). |
| **Obsidian** | `--color-obsidian` | `#0D1117` | Cards, panels, and surface backgrounds. |
| **Elevated** | `--color-bg-elevated` | `#11171E` | Table headers, sticky rows, elevated surfaces. |
| **Surface Alt** | `--color-surface-alt` | `#141B24` | Secondary surface depth layer. |
| **Primary** | `--color-primary` | `#00C8E0` | Primary actions, accents, highlights (Refined Cyan). |
| **Secondary** | `--color-secondary` | `#7B8CE0` | Secondary accents, data categorization (Refined Indigo). |
| **Warm Accent** | `--color-warm` | `#C4A35A` | Gold accent for success highlights and premium elements. |
| **Error** | `--color-error` | `#FF3366` | Risk warnings and critical failures. |
| **Success** | `--color-success` | `#00C853` | Confirmation states, healthy status. |
| **Warning** | `--color-warning` | `#D97706` | Caution states, pending actions. |
| **Info** | `--color-info` | `#38BDF8` | Informational elements. |
| **Border** | `--color-border` | `#1E2A3A` | Structural framing and dividers. |

**Glow Values (restrained):**
- `--color-accent-glow`: `rgba(0, 200, 224, 0.25)` — subtle ambient glow
- `--color-error-glow`: `rgba(255, 51, 102, 0.25)` — error state glow
- `--color-border-glow`: `rgba(0, 200, 224, 0.12)` — border illumination on hover

**Neon Shadows (3-layer depth, professional intensity):**
- `--shadow-neon-primary`: 4px/12px/24px layers at 0.4/0.15/0.06 opacity
- `--shadow-neon-secondary`: Same structure with indigo
- `--shadow-neon-error`: Same structure with error red

### 1.3 Typography (Modular Scale 1.25)
Hierarchy is established through weight, case, and controlled tracking.

*   **Structural Headers:** `Tektur` — Geometric, HUD-ready. Used for H1-H4 and Logo. UPPERCASE with `0.04em` tracking (h1-h3) or `0.08em` (h4+).
*   **Narrative/Body:** `Instrument Sans` — Humanist sans-serif for high legibility in labels and text. Default `line-height: 1.5`.
*   **Telemetry/Numbers:** `JetBrains Mono` — High-precision monospace reserved for numeric data, tickets, and IDs. Uses `tabular-nums slashed-zero` with subtle text-shadow glow (`0 0 2px`).

**Type Scale:** xs(0.64rem) → sm(0.8rem) → base(1rem) → md(1.25rem) → lg(1.563rem) → xl(1.953rem) → 2xl(2.441rem) → 3xl(3.052rem) → 4xl(3.815rem)

**Label Variants:** `.label-positive` (success green), `.label-warning` (amber)

---

## 2. Structural Hierarchy (The 12x8 Grid)

The application follows a strictly controlled, **non-scrolling viewport architecture**.

*   **Viewport Lock:** `html` and `body` are locked to `100vw` x `100vh` with `overflow: hidden`.
*   **Flex Wrapper:** `.page-layout` — flex column (navbar + main grid).
*   **Main Container:** `.main-content` — a 12-column by 8-row CSS Grid with `24px` gap.
*   **Grid Rows:** Calculated as `repeat(8, calc((100% - (7 * 24px)) / 8))`, ensuring content perfectly fits the height minus gaps.
*   **Grid Overlay:** 96-cell absolutely-positioned overlay at `0.15` opacity with hex-dot intersections.
*   **Overflow Management:** Content that exceeds card boundaries must use `.scroll-container` (internal scroll) to preserve the grid's rigidity.
*   **Navbar:** Fixed `48px` height, flex-shrink: 0, frosted glass with center trapezoid logo.

---

## 3. Core Component Catalog

### 3.1 Command Navbar
*   **Signature:** A center-cut **Trapezoid** logo container using `clip-path: polygon(0% 0%, 100% 0%, 90% 100%, 10% 100%)`.
*   **Styling:** Cyan glow on the bottom edge (3-layer `box-shadow`). Text: Tektur 20px, 900 weight, 5px letter-spacing.
*   **DNA:** 16px backdrop blur, `--color-navbar-bg` background, 1px bottom border with subtle cyan glow.
*   **Links:** 12px, bold, uppercase, 0.12em tracking. Active: cyan text + 2px bottom border. Hover: text-shadow glow.
*   **Status Dot:** 8px circle with `status-breathe` 2s animation — green (ok), amber (warning), muted (idle).

### 3.2 Operational Cards (`.card`)
*   **Signature:** Bracketed **Corner Accents** (48px L-brackets at top-left and bottom-right).
*   **DNA:** Pseudo-elements (`::before` / `::after`) create cyan brackets. Preserved exactly from the original design.
*   **Material:** `glass-panel-themed` mixin — frosted glass with `16px` blur, inner highlight, hologram radial gradient, subtle noise grain overlay (SVG at 3% opacity).
*   **Header:** HUD text with gradient bottom border (cyan → transparent at 60% width).
*   **Body:** Flex column with internal scroll. Uses `.card__section` for content grouping.
*   **Footer:** Gradient top border (inverse of header). Flex-shrink: 0.
*   **Header Variant:** `.card__header--with-status` — inline 6px status dot (ok/warn/error).
*   **Card Variants:** `--risk` (amber tint), `--active` (brighter glow), `--success` (emerald), `--highlight` (indigo), `--compact` (reduced padding, `space-4`).

### 3.3 Data Display Patterns (`.stat-group`, `.data-row`)
*   **Stat Group:** Label-above-value pattern for dashboards. Label: HUD text (xs, uppercase). Value: JetBrains Mono, md size, tabular-nums, subtle text-shadow. Optional trend line (xs, up=green/down=red).
*   **Stat Grid:** Responsive grid (`auto-fit, minmax(140px, 1fr)`) of stat groups with `space-5` gap.
*   **Data Row:** Horizontal key→value pair with baseline alignment. Key: HUD text (xs). Value: Mono (sm), right-aligned. Variants: `--accent` (cyan), `--warn` (amber), `--error` (red).
*   **Status Ring:** 48px SVG circle — background stroke + colored arc (ok=green, warn=amber, error=red) + centered mono text.

### 3.4 Shared Table (`.table`)
*   **Header:** Sticky, gradient background (`rgba(0,200,224,0.04)` → transparent) + elevated surface, 2px cyan bottom border, backdrop-blur.
*   **Rows:** Striped (even rows: `--color-table-stripe`), hover: `--color-table-hover` background + 2px cyan left-border accent.
*   **Cell Variants:** `.table__cell--numeric` (right-aligned, mono, tabular-nums), `.table__cell--mono` (JetBrains Mono), `.table__cell--accent` (cyan).
*   **Empty State:** `.table__empty` — centered flex column with 40px circle icon container + muted message.
*   **Sort Indicators:** CSS triangle arrows (asc/desc/idle) with hover reveal.

### 3.5 Operational Inputs
*   **Style:** Rectangular, sharp-edged (`border-radius: 0`).
*   **DNA:** Multi-layer box-shadow (inner highlight + soft shadow). Focus: unified double-ring (`0 0 0 2px var(--color-void), 0 0 0 4px var(--color-primary)`).
*   **Select:** Custom cyan dropdown chevron (inline SVG data URI).
*   **Placeholder:** `--color-text-muted` at 60% opacity.

### 3.6 Buttons
*   **Hierarchy:** `.btn--primary` (solid cyan fill + void text), `.btn--secondary` (outlined cyan, hover fill + glow), `.btn--special` (gradient swipe animation), `.btn--danger` (red outline, hover solid red), `.btn--ghost` (transparent, subtle border on hover).
*   **DNA:** Uppercase HUD text, inner highlight, `translateY(1px)` active press, `scale(1.01-1.02)` hover.

### 3.7 Toggle Switch
*   **Track:** 36×18px, 2px radius, `--color-border` default → `--color-primary` checked with glow.
*   **Thumb:** 12×12px, 1px radius, subtle shadow, `cubic-bezier(0.34, 1.3, 0.64, 1)` elastic transition.

### 3.8 Modals
*   **Overlay:** Fixed, full viewport, `rgba(0,0,0,0.6)` background, 8px backdrop blur.
*   **Panel:** Glass-themed, multi-layer shadow with primary glow, 250ms `modal-enter` animation (scale + fade).
*   **Header:** HUD text with gradient bottom border.
*   **Footer:** Solid top border, right-aligned action buttons.

### 3.9 Badges
*   **Style:** Sharp edges, HUD text (xs), translucent color fills.
*   **States:** `--open` (cyan), `--closed` (amber), `--settled` (muted), `--ticket` (indigo).
*   **Size:** Default + `--lg` variant.

---

## 4. Animation & Interaction "Vibe"

*   **Page Enter:** 200ms fade + 4px upward slide on route change.
*   **Card Entrance:** Staggered fade-in-up (300ms, 6px slide, 60ms stagger delay per card).
*   **Scanner Lines:** Slow vertical pulse (`scanline` animation, 2s cycle, 6% peak opacity) — loading states only.
*   **Hologram Pulse:** Subtle opacity cycle (0.95–1.0 range, 2s) on active risk cards.
*   **Digital Ping:** Button scale pulse + glow ring expansion on click — no rotation.
*   **Glow Breathe:** Subtle pulsing glow (3s cycle, restrained intensity) for active/processing states.
*   **Data Stream:** Vertical line particles for loading states.
*   **Ripple:** Expanding ring click feedback.

---

## 5. Section Dividers

*   **Report Divider:** `.report__section-divider` — 1px horizontal rule, gradient (transparent → cyan 20%–80% → transparent), 30% opacity, `space-5` vertical margin.

---

## 6. Implementation Reference (SCSS)

```scss
// The "Bracket" Signature (preserved exactly)
@mixin corner-accent($size: 48px, $bar-height: 16px, $thickness: 2px, $color: var(--color-primary), $offset: -1px) {
  position: relative;
  &::before {
    content: '';
    position: absolute;
    top: $offset; left: $offset;
    width: $size; height: $bar-height;
    border-top: $thickness solid $color;
    border-left: $thickness solid $color;
    pointer-events: none;
    z-index: 1;
  }
  &::after {
    content: '';
    position: absolute;
    bottom: $offset; right: $offset;
    width: $size; height: $bar-height;
    border-bottom: $thickness solid $color;
    border-right: $thickness solid $color;
    pointer-events: none;
    z-index: 1;
  }
}

// The "HUD" Glass Panel (theme-aware)
@mixin glass-panel-themed {
  background: var(--color-glass-bg);
  backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturation));
  -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturation));
  border: 1px solid var(--color-glass-border);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06);
  transition: border-color var(--duration-slow) var(--ease-out-expo),
              box-shadow var(--duration-slow) var(--ease-out-expo);
  &:hover { border-color: var(--color-border-glow); }
}
```

---

## 7. File Organization

```
frontend/src/styles/
  abstracts/
    _tokens.scss          — All CSS custom properties (dark + light theme)
    _functions.scss        — SCSS utility functions
    _mixins.scss           — Reusable mixins (glass-panel, corner-accent, etc.)
  base/
    _reset.scss            — CSS reset, viewport lock, body grid background
    _typography.scss       — Font imports, type scale, utility classes
    _theme.scss            — Theme toggle button, transition smoothing
  components/
    _animations.scss       — Keyframe animations and animation utility classes
    _background.scss       — 12x8 grid overlay with hex-dot intersections
    _grid.scss             — 12x8 CSS grid system (flex wrapper + grid utilities)
    _card.scss             — Glass card with corner accents and variants
    _navbar.scss           — Command navbar with trapezoid logo
    _inputs.scss           — Inputs, selects, buttons, toggle switch
    _data-display.scss     — Stat groups, data rows, status rings
    _tables.scss           — Shared table styles, cell variants, empty states
    _scroll-container.scss — Internal scrollbar theming
    _draws.scss            — Draw list, ticket tables, modals, sales input
    _report.scss           — Financial report tables, section dividers
  main.scss                — Aggregator (imports all partials in load order)
```

---

## 8. Constraints (Hard Rules)

*   **Navbar:** Trapezoid structure, link layout, and overall navbar design must not change.
*   **Corner Accents:** The 48px bracket corner accent mixin must be preserved exactly.
*   **Grid Container:** The 12×8 CSS grid (`_grid.scss`, `.main-content`, grid dimensions, gap, padding) must not change.
*   **Layer Rules:** API → Service → Repository → Database. Frontend → bridge → API. Never skip layers.
*   **Token-First:** Every visual value traces back to `_tokens.scss`; no magic numbers.
*   **Dark-First:** Dark mode is the primary experience; light mode is a functional fallback.
