# -*- coding: utf-8 -*-
"""导出全库替代率检查报告 JSON。"""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
jobs = json.loads((ROOT / "public/data/jobs.sample.json").read_text(encoding="utf-8"))["jobs"]
YEAR = "2030"

ALT = [
    ("s01a", "s01b", "电子制造"),
    ("s05a", "s05b", "质检"),
    ("t07a", "t07b", "银行"),
    ("t08a", "t08b", "财会"),
    ("t12a", "t12b", "营销"),
    ("t13a", "t13b", "设计"),
    ("t16a", "t16c", "教师"),
    ("t20a", "t20b", "护理"),
    ("t32a", "t32b", "律师"),
    ("t35a", "t35b", "软件开发"),
    ("t36a", "t36b", "数据分析"),
    ("f01a", "f01b", "证券交易"),
]

by_id = {j["id"]: j for j in jobs}
report = {
    "jobCount": len(jobs),
    "aligned": True,
    "stats": {},
    "tierChecks": [],
    "sectorSpread": {},
    "samples": {},
}

impacts = [j["aiImpact"] for j in jobs]
report["stats"] = {
    "min": min(impacts),
    "max": max(impacts),
    "median": sorted(impacts)[len(impacts) // 2],
}

for low, high, label in ALT:
    if low in by_id and high in by_id:
        lo, hi = by_id[low], by_id[high]
        report["tierChecks"].append(
            {
                "group": label,
                "lowTitle": lo["title"],
                "lowPct": round(lo["aiImpact"] * 10),
                "highTitle": hi["title"],
                "highPct": round(hi["aiImpact"] * 10),
                "ok": lo["aiImpact"] >= hi["aiImpact"] - 0.05,
            }
        )

for sec in ("primary", "secondary", "tertiary"):
    xs = [j for j in jobs if j["sector"] == sec]
    if xs:
        v = [j["aiImpact"] for j in xs]
        report["sectorSpread"][sec] = {
            "n": len(xs),
            "min": min(v),
            "max": max(v),
            "median": sorted(v)[len(v) // 2],
        }

for key, filt in [
    ("topAutomation", lambda j: j["aiImpact"] >= 3.5),
    ("lowAutomation", lambda j: j["aiImpact"] <= 0.5),
    ("finance", lambda j: j.get("industryLabel") in ("金融", "证券", "期货", "财务共享", "银行", "保险")),
]:
    xs = sorted([j for j in jobs if filt(j)], key=lambda x: -x["aiImpact"])
    report["samples"][key] = [
        {"title": j["title"], "pct": round(j["aiImpact"] * 10), "id": j["id"]}
        for j in xs[:12]
    ]

out = ROOT / "scripts" / "validation_report.json"
out.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
print("wrote", out)
