"""
Structured logging configuration.

Call `setup_logging()` once from `main.py` before any other module uses logging.
In dev mode logs go to stdout; in production they go to a rotating file.
"""

from __future__ import annotations

import logging
import sys
from logging.handlers import RotatingFileHandler

from backend.config import DATA_DIR, DEV_MODE

LOG_FILE = DATA_DIR / "app.log"
LOG_FORMAT = "[%(asctime)s] [%(levelname)-7s] [%(name)s] %(message)s"
DATE_FORMAT = "%Y-%m-%d %H:%M:%S"

_MAX_BYTES = 1_048_576  # 1 MB
_BACKUP_COUNT = 3


def setup_logging(level: int = logging.DEBUG) -> None:
    root = logging.getLogger()
    root.setLevel(level)

    formatter = logging.Formatter(fmt=LOG_FORMAT, datefmt=DATE_FORMAT)

    if DEV_MODE:
        handler: logging.Handler = logging.StreamHandler(sys.stdout)
    else:
        handler = RotatingFileHandler(
            str(LOG_FILE), maxBytes=_MAX_BYTES, backupCount=_BACKUP_COUNT
        )
    handler.setFormatter(formatter)
    root.addHandler(handler)

    # Silence noisy third-party loggers
    logging.getLogger("PIL").setLevel(logging.WARNING)
    logging.getLogger("urllib3").setLevel(logging.WARNING)
