"""
3D Reporter — Desktop Application Entry Point
==============================================
Launches the React frontend inside a pywebview window with a Python backend
API bridge. Supports dev mode (Vite dev server) and production mode (static
build served via a lightweight HTTP server).
"""

from __future__ import annotations

import http.server
import os
import subprocess
import sys
import threading
import time
from pathlib import Path
from typing import Any

import webview

from backend.api import API
from backend.window import WINDOW_CONFIG, WINDOW_TITLE

PROJECT_ROOT = Path(__file__).resolve().parent
FRONTEND_DIR = PROJECT_ROOT / "frontend"
DIST_DIR = FRONTEND_DIR / "dist"

DEV_SERVER_PORT = 5173
PROD_SERVER_PORT = 8080

# On Windows, npm/npx are .cmd batch files; plain Popen won't resolve them
_NPM = "npm.cmd" if sys.platform == "win32" else "npm"
_NPX = "npx.cmd" if sys.platform == "win32" else "npx"


def _run_static_server(port: int) -> None:
    """Serve the Vite production build from frontend/dist/."""

    class Handler(http.server.SimpleHTTPRequestHandler):
        def __init__(self, *args: Any, **kwargs: Any) -> None:
            super().__init__(*args, directory=str(DIST_DIR), **kwargs)

        def log_message(self, fmt: str, *args: Any) -> None:
            pass

    server = http.server.HTTPServer(("127.0.0.1", port), Handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()


def _start_vite_dev() -> subprocess.Popen[str]:
    """Launch Vite dev server as a subprocess. Returns the Popen handle."""

    node_modules = FRONTEND_DIR / "node_modules"
    if not node_modules.exists():
        print("[3D-Reporter] Installing frontend dependencies...")
        subprocess.run([_NPM, "install"], cwd=str(FRONTEND_DIR), check=True)

    proc = subprocess.Popen(
        [_NPX, "vite", "--port", str(DEV_SERVER_PORT), "--strictPort"],
        cwd=str(FRONTEND_DIR),
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1,
    )

    # Read stdout in a background thread so the Vite process never blocks on
    # a full pipe buffer; use an event to signal readiness.
    ready = threading.Event()
    failed = threading.Event()

    def _reader() -> None:
        assert proc.stdout is not None
        for line in proc.stdout:
            print(f"[vite] {line}", end="")
            if "Local:" in line:
                ready.set()
            elif "error" in line.lower() or "Error" in line:
                failed.set()

    threading.Thread(target=_reader, daemon=True).start()

    # Wait up to 30s, but fail fast if Vite reports an error
    deadline = time.time() + 30
    while not ready.is_set() and time.time() < deadline:
        if failed.is_set() or proc.poll() is not None:
            print("[3D-Reporter] Vite dev server failed to start")
            raise SystemExit(1)
        time.sleep(0.5)

    if not ready.is_set():
        print("[3D-Reporter] Warning: Vite may not have started within timeout")

    return proc


def main() -> None:
    dev_mode = os.environ.get("VITE_DEV", "1") == "1"

    if dev_mode:
        print("[3D-Reporter] Starting Vite dev server...")
        vite_proc = _start_vite_dev()
        url = f"http://localhost:{DEV_SERVER_PORT}"
    else:
        if not DIST_DIR.exists():
            print(
                "[3D-Reporter] No production build found. "
                "Run: cd frontend && npm run build"
            )
            sys.exit(1)
        _run_static_server(PROD_SERVER_PORT)
        url = f"http://127.0.0.1:{PROD_SERVER_PORT}"

    api = API()

    print(f"[3D-Reporter] Opening window at {url}")
    webview.create_window(
        title=WINDOW_TITLE,
        url=url,
        js_api=api,
        **WINDOW_CONFIG,
    )

    webview.start(debug=dev_mode, http_server=False)

    # Cleanup: terminate the Vite process when the window closes
    if dev_mode:
        try:
            vite_proc.terminate()
            vite_proc.wait(timeout=5)
        except Exception:
            pass


if __name__ == "__main__":
    main()
