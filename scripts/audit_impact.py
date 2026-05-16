# -*- coding: utf-8 -*-
"""审计 aiImpact：重算、排序、标出可疑职业。"""
from __future__ import annotations

import json
import sys
from pathlib import Path

_SCRIPTS = Path(__file__).resolve().parent
if str(_SCRIPTS) not in sys.path:
    sys.path.insert(0, str(_SCRIPTS))

from academic_substitution import compute_occupation_substitution

ROOT = Path(__file__).resolve().parents[1]
JSON_PATH = ROOT / "public" / "data" / "jobs.sample.json"

# 启发式：用户直觉上替代压力应偏低/偏高的关键词
LOW_EXPECT = ("教师", "护士", "医生", "法官", "警察", "消防", "社工", "心理咨询师", "律师")
HIGH_EXPECT = ("客服", "数据标注", "录入", "翻译", "柜员", "目检", "普工", "分拣", "配送末端")


def main() -> None:
    data = json.loads(JSON_PATH.read_text(encoding="utf-8"))
    jobs = data["jobs"]
    mismatches = []
    suspicious = []

    for j in jobs:
        res = compute_occupation_substitution(
            title=j["title"],
            sector=j["sector"],
            education=j["education"],
            employment=j["employment"],
            salary_median=j["salaryMedianAnnual"],
            tier=j.get("positionTier"),
            industry_label=j.get("industryLabel"),
            prior_embodied_10=None,
            prior_cognitive_10=None,
            prior_blend=0.0,
            monte_carlo_samples=0,
        )
        pure = res.total_10
        stored = j["aiImpact"]
        if abs(pure - stored) > 0.15:
            mismatches.append((j["title"], stored, pure, j.get("positionTier")))

        title = j["title"]
        impact = stored
        for kw in LOW_EXPECT:
            if kw in title and impact >= 7.5:
                suspicious.append(("HIGH_for_regulated", impact, title, j["id"]))
                break
        for kw in HIGH_EXPECT:
            if kw in title and impact <= 5.0:
                suspicious.append(("LOW_for_automatable", impact, title, j["id"]))
                break

    print(f"jobs={len(jobs)}")
    print("\n=== Top 20 aiImpact ===")
    for j in sorted(jobs, key=lambda x: -x["aiImpact"])[:20]:
        print(
            f"{j['aiImpact']:4.1f} E={j['embodiedSubstitution']} C={j['cognitiveAiSubstitution']} "
            f"| {j['title']} | {j.get('positionTier','')}"
        )
    print("\n=== Bottom 15 ===")
    for j in sorted(jobs, key=lambda x: x["aiImpact"])[:15]:
        print(f"{j['aiImpact']:4.1f} | {j['title']}")

    print(f"\n=== Recompute without prior (blend=0): mismatches >0.15: {len(mismatches)} ===")
    for t, s, p, tier in mismatches[:25]:
        print(f"  stored={s} pure={p} | {t} | {tier}")

    print(f"\n=== Heuristic suspicious: {len(suspicious)} ===")
    for kind, impact, title, jid in suspicious[:30]:
        print(f"  [{kind}] {impact:.1f} {title} ({jid})")


if __name__ == "__main__":
    main()
