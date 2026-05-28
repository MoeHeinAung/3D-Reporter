"""
Custom exception hierarchy for the 3D Reporter backend.

All application-level errors should raise one of these exceptions.
The API layer is the only place that catches and converts them into
user-facing messages.
"""

from __future__ import annotations

from typing import Any


class AppError(Exception):
    """Base exception for all application-level errors."""

    def __init__(self, message: str, details: dict[str, Any] | None = None) -> None:
        super().__init__(message)
        self.message = message
        self.details = details or {}


class NotFoundError(AppError):
    """A requested resource does not exist."""


class ValidationError(AppError):
    """Input data failed validation (wrong type, out of range, etc.)."""


class ConflictError(AppError):
    """A business rule prevents the operation (e.g., two OPEN draws)."""


class DatabaseError(AppError):
    """A database operation failed unexpectedly."""
