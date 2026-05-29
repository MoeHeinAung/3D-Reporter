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

    def __init__(self, message: str, details: dict[str, Any] | None = None, code: str | None = None) -> None:
        super().__init__(message)
        self.message = message
        self.details = details or {}
        self.code = code or "INTERNAL_ERROR"


class NotFoundError(AppError):
    """A requested resource does not exist."""

    def __init__(self, message: str, details: dict[str, Any] | None = None) -> None:
        super().__init__(message, details, code="NOT_FOUND")


class ValidationError(AppError):
    """Input data failed validation (wrong type, out of range, etc.)."""

    def __init__(self, message: str, details: dict[str, Any] | None = None) -> None:
        super().__init__(message, details, code="VALIDATION_ERROR")


class ConflictError(AppError):
    """A business rule prevents the operation (e.g., two OPEN draws)."""

    def __init__(self, message: str, details: dict[str, Any] | None = None) -> None:
        super().__init__(message, details, code="CONFLICT")


class DatabaseError(AppError):
    """A database operation failed unexpectedly."""

    def __init__(self, message: str, details: dict[str, Any] | None = None) -> None:
        super().__init__(message, details, code="DATABASE_ERROR")
