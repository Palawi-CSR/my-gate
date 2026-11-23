"""Vercel entry point: serves the FastAPI app in backend/main.py as a Python function.

vercel.json rewrites every /api/* request here; FastAPI still sees the original path
(e.g. /api/visits), so routes are the same as when running locally.
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "backend"))

from main import app  # noqa: E402

__all__ = ["app"]  # Vercel looks for a module-level `app`
