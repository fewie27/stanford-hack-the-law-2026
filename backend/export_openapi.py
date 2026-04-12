#!/usr/bin/env python3
"""Regenerate ../openapi/openapi.json from the FastAPI app.

    cd backend && python export_openapi.py
"""

import json
import sys
from pathlib import Path

import yaml

_BACKEND = Path(__file__).resolve().parent
if str(_BACKEND) not in sys.path:
    sys.path.insert(0, str(_BACKEND))

from app.main import app  # noqa: E402


def main() -> None:
    root = Path(__file__).resolve().parents[1]
    spec = app.openapi()
    out_dir = root / "openapi"
    out_dir.mkdir(parents=True, exist_ok=True)
    json_path = out_dir / "openapi.json"
    json_path.write_text(json.dumps(spec, indent=2), encoding="utf-8")
    yaml_path = out_dir / "openapi.yaml"
    yaml_path.write_text(yaml.dump(spec, sort_keys=False, allow_unicode=True), encoding="utf-8")
    print(f"Wrote {json_path}")
    print(f"Wrote {yaml_path}")


if __name__ == "__main__":
    main()
