"""Risk telemetry aggregation using live database views."""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import text
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)


class RiskService:
    """Aggregates risk telemetry from the database for a given draw."""

    def __init__(self, session: Session) -> None:
        self.session = session

    def get_telemetry(self, draw_id: int | None = None) -> dict[str, Any]:
        """Return risk summary from v_ticket_exposure_live."""
        try:
            if draw_id is not None:
                rows = self.session.execute(
                    text(
                        "SELECT risk_level, COUNT(*) as cnt "
                        "FROM v_ticket_exposure_live "
                        "WHERE draw_id = :did "
                        "GROUP BY risk_level"
                    ),
                    {"did": draw_id},
                ).fetchall()
            else:
                rows = self.session.execute(
                    text(
                        "SELECT risk_level, COUNT(*) as cnt "
                        "FROM v_ticket_exposure_live "
                        "GROUP BY risk_level"
                    )
                ).fetchall()

            risk_counts = {row[0]: row[1] for row in rows}
            return {
                "critical": risk_counts.get("CRITICAL", 0),
                "high": risk_counts.get("HIGH", 0),
                "medium": risk_counts.get("MEDIUM", 0),
                "low": risk_counts.get("LOW", 0),
                "updatedAt": datetime.now(timezone.utc).isoformat(),
            }
        except Exception as exc:
            logger.exception("Risk telemetry query failed for draw %s", draw_id)
            return {
                "critical": 0,
                "high": 0,
                "medium": 0,
                "low": 0,
                "updatedAt": datetime.now(timezone.utc).isoformat(),
                "degraded": True,
                "error": "Telemetry data may be incomplete.",
            }
