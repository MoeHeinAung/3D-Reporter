"""System information and telemetry — no database dependencies."""

from __future__ import annotations

import platform
import time
from datetime import datetime, timezone


class SystemService:
    """Provides system info, uptime, and server time."""

    def __init__(self, start_time: float) -> None:
        self._start_time = start_time

    def get_system_info(self) -> dict[str, str]:
        return {
            "platform": platform.system(),
            "platformRelease": platform.release(),
            "arch": platform.machine(),
            "pythonVersion": platform.python_version(),
            "hostname": platform.node(),
        }

    def get_uptime_seconds(self) -> int:
        return int(time.time() - self._start_time)

    def get_server_time(self) -> str:
        return datetime.now(timezone.utc).isoformat()
