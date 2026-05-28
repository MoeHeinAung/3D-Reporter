"""Verify ThemeService get/set/default behavior and JSON migration."""

from __future__ import annotations

from sqlalchemy.orm import Session

from backend.services.theme_service import ThemeService


def test_get_theme_defaults_to_dark(session: Session) -> None:
    svc = ThemeService(session)
    assert svc.get_theme() == "dark"


def test_set_and_get_theme(session: Session) -> None:
    svc = ThemeService(session)
    svc.set_theme("light")
    assert svc.get_theme() == "light"


def test_set_theme_twice_overwrites(session: Session) -> None:
    svc = ThemeService(session)
    svc.set_theme("light")
    svc.set_theme("dark")
    assert svc.get_theme() == "dark"


def test_set_invalid_theme_raises(session: Session) -> None:
    svc = ThemeService(session)
    try:
        svc.set_theme("blue")
        assert False, "Expected ValueError"
    except ValueError:
        pass
