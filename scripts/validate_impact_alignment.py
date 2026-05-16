# -*- coding: utf-8 -*-
"""校验 aiImpact 与 2030 replacedStaffRatio 一致。"""
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
JSON_PATH = ROOT / "public" / "data" / "jobs.sample.json"
YEAR = "2030"


def main() -> int:
    jobs = json.loads(JSON_PATH.read_text(encoding="utf-8"))["jobs"]
    bad: list[str] = []
    for j in jobs:
        st = j.get("aiLaborStaffing", {}).get(YEAR)
        if not st:
            bad.append(f"{j['id']}: missing staffing {YEAR}")
            continue
        expected = round(float(st["replacedStaffRatio"]) * 10.0, 1)
        if abs(j["aiImpact"] - expected) > 0.05:
            bad.append(
                f"{j['id']} {j['title'][:24]}: aiImpact={j['aiImpact']} expected={expected}"
            )
    impacts = [j["aiImpact"] for j in jobs]
    print(f"jobs={len(jobs)} misaligned={len(bad)}")
    print(f"range: min={min(impacts):.1f} max={max(impacts):.1f} median={sorted(impacts)[len(impacts)//2]:.1f}")
    for line in bad[:20]:
        print(" ", line)
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main())
