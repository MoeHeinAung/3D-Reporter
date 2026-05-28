"""Risk telemetry aggregation for the Nightingale chart."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any


class RiskService:
    """Aggregates risk telemetry data. Currently returns placeholder structure."""

    def get_telemetry(self) -> dict[str, Any]:
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
