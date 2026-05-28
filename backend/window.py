"""
Window configuration for pywebview.

Matched to the "Futuristic Precision" design system:
- Dark background (#0A0B0E)
- Sharp geometry, no native chrome
- Minimum dimensions to support the 12x8 grid at acceptable density
"""

from __future__ import annotations

WINDOW_CONFIG: dict = {
    "width": 1600,
    "height": 960,
    "min_size": (1280, 720),
    "resizable": True,
    "fullscreen": False,
    "frameless": False,  # Keep native chrome for window management; the app
                          # design system handles the interior aesthetic.
    "easy_drag": True,
    "background_color": "#0A0B0E",
    "text_select": True,
    "confirm_close": False,
}

# Window title; displayed in the title bar and taskbar
WINDOW_TITLE = "3D Reporter"
