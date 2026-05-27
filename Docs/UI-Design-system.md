# Design System: "Futuristic Precision"

This document serves as the official visual and structural blueprint for the 3D-Striker-Net frontend. It defines the "UI DNA" that governs the application's aesthetic identity and provides a detailed catalog of the core components used to create an immersive, high-performance command-and-control interface.

---

## 1. Visual Identity & "UI DNA"

The aesthetic of 3D-Striker-Net is rooted in **"Futuristic Precision"** (also known as **"Quantum Admin"**). It balances professional functionality with an immersive, sci-fi "HUD" (Heads-Up Display) feel.

### 1.1 Core Principles
*   **Atmosphere:** Deep Space / Void. The interface is high-contrast, optimized for dark environments.
*   **Geometry:** Sharp, 0-radius corners. Use of trapezoids and bracketed "corner accents" for structural framing.
*   **Materiality:** Glassmorphism. Semi-transparent surfaces with `backdrop-filter: blur(10px)` and 1px borders.
*   **Information Density:** High density. Designed for professional operators who require maximum telemetry in a single, non-scrolling viewport.

### 1.2 Color Palette (Deep Space)
The system uses a "Deep Space" background with "Neon Hyper-Link" accents.

| Role | Color | Hex | Usage |
| :--- | :--- | :--- | :--- |
| **Void Black** | Background | `#0A0B0E` | Root application background. |
| **Obsidian** | Surface | `#14161C` | Cards, sidebars, and panel surfaces. |
| **Striker Blue** | Primary | `#00F0FF` | Primary actions, neon highlights (Cyan). |
| **Neural Violet**| Secondary | `#8A2BE2` | Accents and specific data categorization. |
| **Alert Red** | Error | `#FF0055` | Risk warnings and critical failures. |
| **Steel Grey** | Borders | `#2D323E` | Structural framing and dividers. |

### 1.3 Typography (Modular Scale 1.25)
Hierarchy is established through weight and case rather than just size.

*   **Structural Headers:** `Tektur` — Geometric, HUD-ready. Used for H1-H4 and Logo. Usually **UPPERCASE** with `0.05em` tracking.
*   **Narrative/Body:** `Instrument Sans` — Humanist sans-serif for high legibility in labels and text.
*   **Telemetry/Numbers:** `JetBrains Mono` — High-precision monospace reserved for numeric data, tickets, and IDs.

---

## 2. Structural Hierarchy (The 12x8 Grid)

The application follows a strictly controlled, **non-scrolling viewport architecture**.

*   **Viewport Lock:** `html` and `body` are locked to `100vw` x `100vh` with `overflow: hidden`.
*   **Main Container:** A 12-column by 8-row CSS Grid.
*   **Grid Rows:** Calculated as `repeat(8, calc((100% - (7 * 24px)) / 8))`, ensuring content perfectly fits the height minus gaps.
*   **Overflow Management:** Content that exceeds card boundaries must use a `.scroll-container` (internal scroll) to preserve the grid's rigidity.

---

## 3. Core Component Catalog

### 3.1 Command Navbar
*   **Signature:** A center-cut **Trapezoid** logo container using `clip-path`.
*   **Styling:** Cyan neon glow on the bottom edge (`box-shadow` + `2px` solid highlight).
*   **DNA:** Backdrop blur of `12px` and `rgba(2, 6, 23, 0.9)` background.

### 3.2 Operational Cards (`.card`)
*   **Signature:** Bracketed **Corner Accents**.
*   **DNA:** Pseudo-elements (`::before` / `::after`) create 48px cyan brackets at the Top-Left and Bottom-Right.
*   **Material:** `glass-panel` mixin with subtle internal radial gradients for a "hologram" feel.

### 3.3 Risk Telemetry (Nightingale Chart)
*   **Type:** Rose-type area pie chart.
*   **DNA:** Utilizes the "Neural Violet" to "Striker Blue" spectrum for data slices. Contained within a `card` with 0.8 opacity.

### 3.4 Operational Inputs
*   **Style:** Rectangular, sharp-edged.
*   **DNA:** Focus states trigger a `0 0 8px` neon glow.
*   **Special Buttons:** Use the `btn-special` mixin—a linear-gradient "swipe" animation on hover that signifies a "Digital Ping."

---

## 4. Animation & Interaction "Vibe"

*   **Scanner Lines:** A slow, vertical horizontal pulse (`scanline` animation) applied to loading panels.
*   **Hologram Pulse:** Subtle opacity cycles (`pulse-hologram`) on active risk cards.
*   **Digital Ping:** Buttons scale slightly and flash cyan upon clicking to provide haptic-like visual feedback.

---

## 5. Implementation Reference (SCSS)

```scss
// The "Bracket" Signature
@mixin corner-accent {
  position: relative;
  &::before {
    content: '';
    position: absolute;
    top: -1px; left: -1px;
    width: 48px; height: 16px;
    border-top: 2px solid #00F0FF;
    border-left: 2px solid #00F0FF;
  }
}

// The "HUD" Glass Panel
@mixin glass-panel {
  background: rgba(20, 22, 28, 0.7);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.1);
}
```
