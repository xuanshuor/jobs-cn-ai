# -*- coding: utf-8 -*-
"""校验 jobs.sample.json：碎裂职名、空行业、分数范围等。"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
JSON_PATH = ROOT / "public" / "data" / "jobs.sample.json"

_BROKEN_PATTERNS = re.compile(
    r"^(KTV|4S|110|服务员|审核员|点云）|BIM$|ETC$|AGV$|仓储$)$"
    r"|^店"
    r"|^）"
    r"|（$",
)
_SHORT_OK = frozenset({"社工", "导游", "焊工", "电工", "木工", "油漆", "钳工"})
_GENERIC = "商务与生活服务"


def main() -> int:
    data = json.loads(JSON_PATH.read_text(encoding="utf-8"))
    jobs = data["jobs"]
    issues: list[str] = []

    for j in jobs:
        t = j["title"]
        if _BROKEN_PATTERNS.search(t) or (len(t) <= 2 and t not in _SHORT_OK):
            issues.append(f"broken_title: {j['id']} | {t}")
        if j.get("industryLabel") == _GENERIC:
            issues.append(f"generic_industry: {j['id']} | {t}")
        if not (0 <= j["aiImpact"] <= 10):
            issues.append(f"bad_impact: {j['id']} {j['aiImpact']}")
        mf = j.get("mergedFrom")
        if mf is not None and (not isinstance(mf, list) or len(mf) < 2):
            issues.append(f"bad_merge: {j['id']} mergedFrom={mf}")

    print(f"jobs={len(jobs)} issues={len(issues)}")
    for line in issues[:40]:
        print(line)
    if len(issues) > 40:
        print(f"... +{len(issues) - 40} more")
    return 1 if issues else 0


if __name__ == "__main__":
    sys.exit(main())
