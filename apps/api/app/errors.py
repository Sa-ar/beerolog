"""Typed exceptions for expected failure paths.

Keeps auth/validation/config/dependency failures distinct from generic
500s so operators can correlate logs to a specific failure mode.

See docs/ops/checklists/request-correlation-drill.md (issue #59).
"""

from __future__ import annotations


class BeerologError(Exception):
    """Base for all typed app errors."""

    error_type: str = "dependency"
    status_code: int = 500

    def __init__(self, detail: str) -> None:
        super().__init__(detail)
        self.detail = detail


class AuthError(BeerologError):
    error_type = "auth"
    status_code = 401


class ValidationError(BeerologError):
    error_type = "validation"
    status_code = 400


class ConfigError(BeerologError):
    error_type = "config"
    status_code = 503


class DependencyError(BeerologError):
    error_type = "dependency"
    status_code = 503
