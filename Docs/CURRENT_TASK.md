# CURRENT TASK — Frontend Sci-Fi Redesign: "Nexus Terminal"

**Status:** Phase 0 — Planning Complete, Implementation Pending
**Started:** 2026-05-29
**Design Direction:** "Nexus Terminal" — Professional orbital-station command-center aesthetic. Elevated from cyberpunk neon to sophisticated high-definition sci-fi. Think: advanced facility operations terminal, not street-level neon signs.

## Constraints (Hard)

- **DO NOT** modify the existing 12×8 CSS grid layout (`_grid.scss`, `.main-content`, grid dimensions, gap, padding)
- **DO NOT** alter the center division of the navigation bar (trapezoid shape, left/right link sections, overall navbar structure)
- **ALL changes** are limited to: typography, color palettes, component styling, shadows, borders, interactive states
- No new npm dependencies

---

## Phase 1: Color Palette & Design Tokens (1 file)

**File:** `frontend/src/styles/abstracts/_tokens.scss`

### Task 1.1 — Evolve the dark palette

Replace flat dark colors with deeper, layered space tones that have subtle blue undertones.

```
--color-void:       #060B0F    (was #0d1516) — deeper space black with blue undertone
--color-obsidian:   #080F1A    (was #0A1525) — richer deep navy
--color-primary:    #00E5FF    (was #00F0FF) — slightly warmer cyan, better readability
--color-secondary:  #A855F7    (was #8A2BE2) — brighter violet, more neon presence
--color-error:      #FF3366    (was #FF0055) — slightly softer red, better on eyes
--color-border:     #1E2A3A    (was #2D323E) — deeper, bluer steel
```

### Task 1.2 — Add tertiary accent colors

Add new custom properties for a richer palette:
```
--color-success:    #00E676    — emerald green for confirmations/healthy status
--color-warning:    #F59E0B    — amber for warnings/caution states
--color-info:       #38BDF8    — sky blue for informational elements
```

### Task 1.3 — Enhance derived UI roles

```
--color-bg-elevated:      #0D1520    (was #1A1D26) — deeper, bluer elevated surface
--color-text-primary:     #EDF2F7    (was #E8ECF1) — slightly brighter white
--color-text-secondary:   #7B8BA3    (was #8892A4) — bluer grey
--color-text-muted:       #4A5568    (was #545D6E) — deeper muted
--color-accent-glow:      rgba(0, 229, 255, 0.4)    (was 0.35)
--color-error-glow:       rgba(255, 51, 102, 0.4)   (was 0.35)
--color-glass-bg:         rgba(8, 15, 26, 0.75)     (was rgba(20,22,28,0.7))
--color-glass-border:     rgba(255, 255, 255, 0.06)  (was 0.08) — subtler glass edge
```

### Task 1.4 — Add multi-layered shadow tokens

Replace the single-neon shadows with layered glows for depth:
```
--shadow-neon-primary:   0 0 4px rgba(0, 229, 255, 0.6), 0 0 12px rgba(0, 229, 255, 0.3), 0 0 30px rgba(0, 229, 255, 0.1)
--shadow-neon-secondary: 0 0 4px rgba(168, 85, 247, 0.6), 0 0 12px rgba(168, 85, 247, 0.3), 0 0 30px rgba(168, 85, 247, 0.1)
--shadow-neon-error:     0 0 4px rgba(255, 51, 102, 0.6), 0 0 12px rgba(255, 51, 102, 0.3), 0 0 30px rgba(255, 51, 102, 0.1)
--shadow-surface:        0 2px 16px rgba(0, 0, 0, 0.5), 0 8px 40px rgba(0, 0, 0, 0.3)
--shadow-inner-glow:     inset 0 1px 0 rgba(255, 255, 255, 0.04)
```

### Task 1.5 — Add new token categories

```
--color-navbar-bg: rgba(4, 8, 16, 0.92)  — darker navbar for contrast
--color-table-stripe: rgba(0, 229, 255, 0.02)  — subtle stripe for data tables
--color-table-hover: rgba(0, 229, 255, 0.05)   — row hover highlight
--color-border-glow: rgba(0, 229, 255, 0.15)   — subtle border illumination
```

### Task 1.6 — Update light mode equivalents

Mirror all dark-mode token changes to the `[data-theme="light"]` and `@media (prefers-color-scheme: light)` blocks with appropriate light-mode values (softer, less neon, but still sci-fi).

---

## Phase 2: Typography Overhaul (2 files)

**Files:** `frontend/src/styles/base/_typography.scss`, `frontend/src/styles/abstracts/_tokens.scss`

### Task 2.1 — Add text glow utilities

New utility classes for HUD text glow effects:
```scss
.text-glow-primary { text-shadow: 0 0 8px rgba(0, 229, 255, 0.5); }
.text-glow-secondary { text-shadow: 0 0 8px rgba(168, 85, 247, 0.5); }
.text-glow-error { text-shadow: 0 0 8px rgba(255, 51, 102, 0.5); }
```

### Task 2.2 — Enhance heading hierarchy

- Increase `--tracking-heading` from `0.05em` to `0.08em` for more spaced-out HUD feel
- Add a `.hud-label` class: Tektur, condensed width (font-stretch: 75%), uppercase, 0.12em tracking — for compact data labels
- Add a `.hud-value` class: JetBrains Mono, tabular-nums, with subtle text-shadow glow
- Make `.telemetry` class use `text-shadow: 0 0 4px rgba(0, 229, 255, 0.3)` for illuminated data

### Task 2.3 — Improve font rendering

- Add `font-feature-settings: "calt" 0, "liga" 0` to mono for cleaner numeric display
- Add `text-rendering: optimizeLegibility` to heading elements
- Set `font-variant-numeric: tabular-nums slashed-zero` on `.telemetry` for better number differentiation

### Task 2.4 — Add type scale for data displays

```scss
.data-xxs { font-size: 0.56rem; }  // tiny metadata
.data-xxl { font-size: 4.5rem; }    // large dashboard metrics
```

---

## Phase 3: Component Styling — Cards & Panels (2 files)

**Files:** `frontend/src/styles/components/_card.scss`, `frontend/src/styles/abstracts/_mixins.scss`

### Task 3.1 — Enhanced glass panel mixin

Upgrade `glass-panel-themed` with multi-layer glass effect:
- Add a subtle inner highlight (top edge light catch) via `box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06)`
- Increase backdrop-filter blur to `16px` (was 12px)
- Add subtle border glow: `border-color` transitions on hover to `var(--color-border-glow)`

### Task 3.2 — Upgrade corner accents

- Increase bracket size from 48px to 56px for more presence
- Add subtle animated glow to brackets: `filter: drop-shadow(0 0 3px currentColor)` via a CSS animation that pulses opacity
- Add a new `corner-accent-elite` mixin with thinner lines (1px) and longer reach (64px) for premium panels

### Task 3.3 — Card surface enhancements

- Add `background-image` with subtle noise/grain texture overlay (via tiny data URI or CSS gradient noise) for depth
- Increase the hologram radial glow intensity slightly
- Add `transition` on `border-color` and `box-shadow` for subtle hover feedback
- Card header: add a subtle gradient underline instead of solid border

### Task 3.4 — Card variants polish

- `.card--active`: enhanced multi-layer glow, subtle border animation
- `.card--risk`: amber warning tint (was pure error red), as risk isn't always critical
- New `.card--success`: emerald green accent for confirmation states
- New `.card--highlight`: violet secondary accent for featured panels

---

## Phase 4: Component Styling — Buttons & Inputs (2 files)

**Files:** `frontend/src/styles/components/_inputs.scss`, `frontend/src/styles/abstracts/_mixins.scss`

### Task 4.1 — Button redesign

- Sharper button edges: remove any implicit rounding, use `border-radius: 0` explicitly
- Add subtle inner highlight to all buttons: `box-shadow: inset 0 1px 0 rgba(255,255,255,0.05)`
- `.btn--primary`: deeper cyan fill, white/void text with better contrast. Add scale(1.02) on hover with glow expansion
- `.btn--special`: enhance the gradient swipe animation — make it a 135deg sweep, add a subtle scale pulse on completion
- `.btn--danger`: deeper red, add subtle shake animation on extreme cases
- New `.btn--ghost`: transparent with subtle border, for secondary actions
- Add `:active` state with `translateY(1px)` for physical press feel

### Task 4.2 — Input field enhancements

- Add subtle inner shadow to inputs for recessed feel: `box-shadow: inset 0 1px 3px rgba(0,0,0,0.3)`
- Focus state: expand glow ring, add border-color transition with slight delay for "charging" feel
- Placeholder text: use `var(--color-text-muted)` with 50% opacity
- `.input--error`: add subtle red inner glow
- Select dropdown: custom dropdown arrow in cyan

### Task 4.3 — Checkbox & toggle upgrades

- Style native checkboxes with custom appearance (cyan checkmark on dark bg)
- `.toggle`: add glow to active track, smoother thumb transition with `cubic-bezier(0.34, 1.56, 0.64, 1)` (slight overshoot)
- Add focus-visible ring with glow to toggles

### Task 4.4 — Scrollbar theming

- Thinner scrollbar: 4px (was 6px)
- Thumb color: `var(--color-primary)` at 20% opacity, 40% on hover
- Rounder thumb: 2px radius

---

## Phase 5: Component Styling — Navigation Bar Polish (1 file)

**File:** `frontend/src/styles/components/_navbar.scss`

### Task 5.1 — Navbar background upgrade

- Darker frosted glass: `rgba(4, 8, 16, 0.92)` with 16px blur
- Add subtle bottom edge glow: `box-shadow: 0 1px 0 rgba(0, 229, 255, 0.08)`

### Task 5.2 — Nav link enhancements

- Increase letter-spacing to 0.12em (was 0.1em) for more deliberate HUD feel
- Active link: cyan text with text-shadow glow, 2px bottom border with blur
- Hover: color transition with slight text-shadow bloom
- Add subtle separator dots between nav links (small cyan dot via `::after` on non-last links)

### Task 5.3 — Trapezoid center piece polish

- Increase bottom glow line intensity: thicker box-shadow with wider spread
- Text: increase letter-spacing to 5px (was 4px), stronger drop-shadow
- Add subtle inner gradient to trapezoid background for depth

### Task 5.4 — Status indicator animation

- Add subtle breathing animation to the status dot (2s pulse cycle)
- Green/emerald for healthy, amber for warning, red for critical

---

## Phase 6: Component Styling — Data Tables & Lists (1 file)

**File:** `frontend/src/styles/components/_draws.scss`

### Task 6.1 — Table styling upgrade

- Header row: darker background, cyan bottom border (2px) instead of 1px muted
- Data rows: subtle striping with `var(--color-table-stripe)` on even rows
- Row hover: cyan tint with left-edge accent bar (2px)
- Cell padding: increase slightly for better readability
- Sticky header: add backdrop-blur for glass effect when scrolled

### Task 6.2 — List item enhancements

- Active list item: stronger left-border glow (3px cyan with blur), slightly brighter background
- Hover: smooth background transition with subtle slide-in of left accent
- Item actions: fade in with slight slide from right (transform + opacity)

### Task 6.3 — Badge redesign

- Sharper edges, more vibrant fills
- Add subtle inner glow to badges
- Open badge: cyan with 15% fill
- Closed badge: amber/gold with 15% fill (was a hardcoded #F0A500)
- Settled badge: muted with no glow
- Ticket badge: violet secondary with 15% fill

### Task 6.4 — Modal polish

- Stronger backdrop blur (8px, was 4px)
- Modal panel: multi-layer shadow with primary glow ring
- Header: subtle gradient underline
- Body: increased gap for breathing room
- Add entrance animation: `fade-in-up` with slight scale

---

## Phase 7: Component Styling — Background & Grid Overlay (2 files)

**Files:** `frontend/src/styles/base/_reset.scss`, `frontend/src/styles/components/_background.scss`

### Task 7.1 — Background grid upgrade

- Finer grid lines: `--grid-cell-size: 24px` (was 32px) for higher-density cyberspace feel
- Grid line color: `rgba(0, 229, 255, 0.04)` (was 0.05) for subtlety
- Add secondary larger grid every 4 cells at slightly higher opacity (0.06) for hierarchy

### Task 7.2 — Grid overlay enhancement

- Cells: slightly reduced opacity (15% was 20%) for subtlety
- Add subtle hex-dot pattern at cell intersections (via radial-gradient)
- Consider adding a vignette effect to the main content area (radial gradient at edges)

### Task 7.3 — Selection & focus polish

- Selection highlight: cyan at 20% (was 25%)
- Focus-visible: cyan ring with 4px blur glow
- Add smooth transitions to focus state changes

---

## Phase 8: Animations & Micro-interactions (1 file)

**File:** `frontend/src/styles/components/_animations.scss`

### Task 8.1 — New animations

```scss
// Border chase — animated border "circuit trace" effect
@keyframes border-chase { ... }  // travels around element perimeter

// Glow breathe — subtle pulsing glow for active/processing states
@keyframes glow-breathe { ... }  // 3s cycle, subtle opacity oscillation

// Data stream — vertical line particles for loading
@keyframes data-stream { ... }

// Ripple — click feedback expanding ring
@keyframes ripple { ... }
```

### Task 8.2 — Enhance existing animations

- `scanline`: faster (2s was 3s), narrower beam, slightly brighter at peak
- `pulse-hologram`: subtler range (0.95 to 1.0, was 0.85 to 1.0)
- `digital-ping`: add slight rotation (0.5deg) for more physical feel
- `glitch`: add color-shift (RGB split) for more authentic glitch effect on critical elements
- `fade-in-up`: add slight scale from 0.98 for smoother entrance

### Task 8.3 — Page transition animations

- Add staggered card entrance animation classes
- Add route transition fade effect

---

## Phase 9: Inline Styles Cleanup in TSX (5 files)

**Files:** `frontend/src/pages/Dashboard.tsx`, `frontend/src/pages/Risk.tsx`, `frontend/src/pages/Sales.tsx`, `frontend/src/pages/Draws.tsx`, `frontend/src/pages/Partners.tsx`

### Task 9.1 — Replace hardcoded colors with CSS variables

Audit all inline styles in page components. Replace any hardcoded hex colors (like `#f0a020`, `#8A2BE2`, `#00F0FF`, `#FF0055`, `#e0e0e0`, `#b0b0b0`, `#666`, `#a080d0`, `#b080e0`, `#0A0B0E`, `#ccc`) with the appropriate CSS custom property references.

### Task 9.2 — Replace inline font references

Where pages reference font families directly (e.g., `fontFamily: 'JetBrains Mono'`), replace with CSS variable references (`var(--font-mono)`) or utility classes.

### Task 9.3 — Add missing utility class usage

Where inline styles repeat patterns, extract to utility classes or SCSS component classes.

---

## Phase 10: Report Page Theming (1 file)

**File:** `frontend/src/styles/components/_report.scss`

### Task 10.1 — Replace hardcoded colors

Full audit of `_report.scss` — replace ALL hardcoded hex values with token references:
- `#00F0FF` → `var(--color-primary)`
- `#2D323E` → `var(--color-border)`
- `#8A2BE2` → `var(--color-secondary)`
- `#FF0055` → `var(--color-error)`
- `#b0b0b0`, `#e0e0e0`, `#666`, `#ccc`, `#0A0B0E`, `#a080d0`, `#b080e0` → appropriate token refs
- `rgba(20, 22, 28, 0.3)` → `var(--color-glass-bg)`

### Task 10.2 — Enhance report section styling

- Section titles: add subtle text glow
- Party cards: stronger glass effect, sharper borders
- Financial tables: better number alignment, monospaced digits
- Total rows: multi-layer text glow
- Winning ticket rows: distinctive violet accent with subtle background tint

---

## Phase 11: Verification & Polish Pass

### Task 11.1 — Visual consistency audit

- Verify all pages use the same token system (no hardcoded colors remain)
- Check contrast ratios for accessibility (WCAG AA minimum for text)
- Verify light mode renders correctly with all new tokens
- Check reduced-motion media query still disables animations

### Task 11.2 — Build verification

```bash
cd frontend && npx tsc --noEmit   # Type check
cd frontend && npm run lint        # Lint
cd frontend && npm run build       # Production build
```

---

## Implementation Order

```
Phase 1 (Tokens) ──► Phase 2 (Typography) ──► Phase 3 (Cards) ──► Phase 4 (Inputs)
                                                                        │
                                                                        ▼
                                                                 Phase 5 (Navbar)
                                                                        │
                                                                        ▼
                                                                 Phase 6 (Tables)
                                                                        │
                                                                        ▼
                                                                 Phase 7 (Background)
                                                                        │
                                                                        ▼
                                                                 Phase 8 (Animations)
                                                                        │
                                                                        ▼
                                                                 Phase 9 (TSX Cleanup)
                                                                        │
                                                                        ▼
                                                                 Phase 10 (Report)
                                                                        │
                                                                        ▼
                                                                 Phase 11 (Verify)
```

Phase 1 is the foundation — all subsequent phases depend on the new token values.
Phases 2-8 are independent of each other and can be done in any order after Phase 1.
Phases 9-10 depend on earlier phases establishing the token system.
Phase 11 is the final QA pass.

---

## Files That Must NOT Change

- `frontend/src/styles/components/_grid.scss` — Grid layout is locked
- `frontend/src/styles/abstracts/_functions.scss` — Utility functions are fine
- The navbar trapezoid center piece structure (`.navbar__trapezoid`, its clip-path, width, positioning)
- The navbar left/right link section structure (`.navbar__left`, `.navbar__right`)
- `frontend/src/main.tsx` — Router structure
- `frontend/src/App.tsx` — Layout shell, grid overlay generation
- Any `.tsx` component structural JSX — only inline style values change

---

## Key Design Principles

1. **Depth over flatness** — Multi-layer shadows, inner glows, glass effects create spatial depth
2. **Glow with purpose** — Neon effects indicate state (active, warning, error), not decoration
3. **Sharp precision** — No rounded corners, tight tracking, monospace data — this is a terminal, not a consumer app
4. **Breathing interfaces** — Subtle animations convey system aliveness without distraction
5. **Token-first** — Every visual value traces back to `_tokens.scss`; no magic numbers
6. **Dark-first, light-safe** — Dark mode is the hero; light mode is a functional fallback
