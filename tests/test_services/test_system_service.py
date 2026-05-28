"""Verify SystemService returns correct data structures."""

from __future__ import annotations

from backend.services.system_service import SystemService


def test_get_system_info_has_required_keys(start_time: float) -> None:
    svc = SystemService(start_time)
    info = svc.get_system_info()
    assert "platform" in info
    assert "platformRelease" in info
    assert "arch" in info
    assert "pythonVersion" in info
    assert "hostname" in info
    assert isinstance(info["hostname"], str)


def test_get_uptime_seconds_increases(start_time: float) -> None:
    svc = SystemService(start_time)
    uptime = svc.get_uptime_seconds()
    assert uptime >= 3600  # start_time fixture is 1 hour ago
    assert isinstance(uptime, int)


def test_get_server_time_is_iso_format(start_time: float) -> None:
    svc = SystemService(start_time)
    time_str = svc.get_server_time()
    assert "T" in time_str
    assert time_str.endswith("+00:00") or time_str.endswith("Z")
