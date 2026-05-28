"""Theme preference persistence via the preferences table."""

from __future__ import annotations

import json
import logging
from pathlib import Path

from sqlalchemy.orm import Session

from backend.config import DATA_DIR
from backend.database.models import Preference

logger = logging.getLogger(__name__)

_LEGACY_PREFS_FILE = DATA_DIR / "preferences.json"


class ThemeService:
    """Manages theme preference (dark / light) using the preferences table."""

    VALID_THEMES = {"dark", "light"}

    def __init__(self, session: Session) -> None:
        self.session = session
        self._migrate_if_needed()

    def _migrate_if_needed(self) -> None:
        """One-time migration: import theme from legacy JSON file if the DB is empty."""
        existing = self.session.get(Preference, "theme")
        if existing is not None:
            return
        if not _LEGACY_PREFS_FILE.exists():
            return
        try:
            data = json.loads(_LEGACY_PREFS_FILE.read_text(encoding="utf-8"))
            theme = data.get("theme", "dark")
            self.session.add(Preference(key="theme", value=theme))
            self.session.flush()
            _LEGACY_PREFS_FILE.unlink()
            logger.info("Migrated theme preference from JSON to database: %s", theme)
        except (OSError, json.JSONDecodeError) as exc:
            logger.warning("Failed to migrate legacy preferences: %s", exc)

    def get_theme(self) -> str:
        pref = self.session.get(Preference, "theme")
        return pref.value if pref else "dark"

    def set_theme(self, theme: str) -> None:
        if theme not in self.VALID_THEMES:
            raise ValueError(f"Invalid theme: {theme!r}. Must be 'dark' or 'light'.")
        pref = self.session.get(Preference, "theme")
        if pref:
            pref.value = theme
        else:
            self.session.add(Preference(key="theme", value=theme))
        self.session.flush()
