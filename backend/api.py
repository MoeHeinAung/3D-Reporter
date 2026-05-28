"""
API Bridge — Python methods exposed to the React frontend via pywebview.

Every public method on this class becomes callable from JavaScript as:
    window.pywebview.api.<method_name>(...args)

All methods must be JSON-serializable in their return values.
"""

from __future__ import annotations

import json
import platform
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


class API:
    """
    Backend API exposed to the frontend via pywebview's JS bridge.

    Public methods are callable as `window.pywebview.api.<method>()` from
    JavaScript. Private methods (prefixed with _) are hidden from the bridge.
    """

    def __init__(self) -> None:
        self._start_time = time.time()
        self._data_dir = Path(__file__).resolve().parent.parent / "data"
        self._data_dir.mkdir(exist_ok=True)

    # ------------------------------------------------------------------
    # System / Telemetry
    # ------------------------------------------------------------------

    def get_system_info(self) -> dict[str, str]:
        """Return host system information for the HUD display."""
        return {
            "platform": platform.system(),
            "platformRelease": platform.release(),
            "arch": platform.machine(),
            "pythonVersion": platform.python_version(),
            "hostname": platform.node(),
        }

    def get_uptime_seconds(self) -> float:
        """Return backend uptime in seconds (for the navbar clock/status)."""
        return round(time.time() - self._start_time, 1)

    def get_server_time(self) -> str:
        """Return current UTC datetime as ISO-8601 string."""
        return datetime.now(timezone.utc).isoformat()

    # ------------------------------------------------------------------
    # Data Access
    # ------------------------------------------------------------------

    def read_json(self, filename: str) -> dict[str, Any] | None:
        """
        Read a JSON file from the data directory.

        Args:
            filename: Name of the file (e.g. "config.json").

        Returns:
            Parsed JSON content, or None if the file doesn't exist.
        """
        filepath = self._data_dir / filename
        if not filepath.exists():
            return None
        return json.loads(filepath.read_text(encoding="utf-8"))

    def write_json(self, filename: str, data: dict[str, Any]) -> bool:
        """
        Write a JSON object to the data directory.

        Args:
            filename: Name of the file.
            data: Data to serialize.

        Returns:
            True on success, False on failure.
        """
        try:
            filepath = self._data_dir / filename
            filepath.write_text(
                json.dumps(data, indent=2, default=str),
                encoding="utf-8",
            )
            return True
        except OSError:
            return False

    # ------------------------------------------------------------------
    # Risk / Telemetry Data (Nightingale Chart)
    # ------------------------------------------------------------------

    def get_risk_telemetry(self) -> dict[str, Any]:
        """
        Return risk telemetry data as a dictionary structured for the
        Nightingale (rose) chart.
        """
        # Placeholder structure — extend as data sources are wired in.
        return {
            "categories": [
                {"label": "Network", "value": 0.0, "threshold": 0.7},
                {"label": "Storage", "value": 0.0, "threshold": 0.8},
                {"label": "Compute", "value": 0.0, "threshold": 0.6},
                {"label": "Memory", "value": 0.0, "threshold": 0.75},
                {"label": "IO", "value": 0.0, "threshold": 0.65},
                {"label": "Security", "value": 0.0, "threshold": 0.5},
            ],
            "overall": 0.0,
            "updatedAt": datetime.now(timezone.utc).isoformat(),
        }

    # ------------------------------------------------------------------
    # Theme Persistence
    # ------------------------------------------------------------------

    def get_theme_preference(self) -> str:
        """Return the persisted theme preference ('dark' or 'light')."""
        data = self.read_json("preferences.json")
        if data and "theme" in data:
            return data["theme"]
        return "dark"

    def set_theme_preference(self, theme: str) -> bool:
        """Persist the theme preference."""
        data = self.read_json("preferences.json") or {}
        data["theme"] = theme
        return self.write_json("preferences.json", data)

    # ------------------------------------------------------------------
    # Command / Action
    # ------------------------------------------------------------------

    def echo(self, message: str) -> str:
        """Echo back a message (health-check / connectivity test)."""
        return f"[backend] {message}"

    def ping(self) -> str:
        """Lightweight connectivity check."""
        return "pong"
