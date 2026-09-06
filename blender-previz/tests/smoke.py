"""End-to-end smoke test: every shot spec builds, renders and encodes.

Run it after touching the library or the renderer:
    LIBGL_ALWAYS_SOFTWARE=1 python tests/smoke.py
"""
from __future__ import annotations

import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from previz.cli import main  # noqa: E402
from previz.render import PASSES  # noqa: E402


def run() -> int:
    shots = sorted((ROOT / "shots").glob("*.json"))
    if not shots:
        print("no shot specs found")
        return 1
    failures = 0
    with tempfile.TemporaryDirectory() as tmp:
        for shot in shots:
            code = main([str(shot), "--out", tmp, "--res", "160x90",
                         "--frames", "2", "--passes", ",".join(PASSES),
                         "--no-video"])
            out = Path(tmp) / shot.stem
            missing = [p for p in PASSES
                       if len(list((out / p).glob("*.png"))) != 2]
            if code != 0 or missing:
                print(f"FAIL {shot.name}: exit={code} incomplete passes={missing}")
                failures += 1
            elif not (out / f"{shot.stem}_brief.md").exists():
                print(f"FAIL {shot.name}: no brief written")
                failures += 1
            else:
                print(f"PASS {shot.name}")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(run())
