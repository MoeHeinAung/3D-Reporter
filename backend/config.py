"""
Centralized application configuration.

All paths, URLs, and settings originate here. No other module should hardcode
paths or magic values — import from this module instead.
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = PROJECT_ROOT / "data"
DATABASE_PATH = DATA_DIR / "3d_reporter.db"
DATABASE_URL = f"sqlite:///{DATABASE_PATH.as_posix()}"

DEV_MODE = os.environ.get("VITE_DEV", "1") == "1"

FRONTEND_DIR = PROJECT_ROOT / "frontend"
DIST_DIR = FRONTEND_DIR / "dist"

# pywebview window config (referenced by main.py)
WINDOW_WIDTH = 1600
WINDOW_HEIGHT = 960
WINDOW_MIN_WIDTH = 1280
WINDOW_MIN_HEIGHT = 720

# Ensure data directory exists
DATA_DIR.mkdir(parents=True, exist_ok=True)
