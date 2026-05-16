# -*- coding: utf-8 -*-
from __future__ import annotations

import json
import sys
from pathlib import Path

_SCRIPTS = Path(__file__).resolve().parent
sys.path.insert(0, str(_SCRIPTS))

from academic_substitution import compute_occupation_substitution

ROOT = Path(__file__).resolve().parents[1]
jobs = json.loads((ROOT / "public/data/jobs.sample.json").read_text(encoding="utf-8"))["jobs"]

CHECK_IDS = [
    "t16b",
    "t17",
    "t16a",
    "t20a",
    "t20b",
    "t19",
    "t55",
    "t02",
    "t03",
    "t37",
    "t07a",
    "t35a",
    "t35b",
    "s01a",
    "s01b",
    "p01",
    "z0098",
]


def find_job(jid: str):
    for j in jobs:
        if j["id"] == jid:
            return j
    return None


def recompute(j, blend: float, e_prior=None, c_prior=None):
    res = compute_occupation_substitution(
        title=j["title"],
        sector=j["sector"],
        education=j["education"],
        employment=j["employment"],
        salary_median=j["salaryMedianAnnual"],
        tier=j.get("positionTier"),
        industry_label=j.get("industryLabel"),
        prior_embodied_10=e_prior,
        prior_cognitive_10=c_prior,
        prior_blend=blend,
        monte_carlo_samples=0,
    )
    return res


def main():
    print("id | title | stored | model-only | with-prior(0.12)")
    for jid in CHECK_IDS:
        j = find_job(jid)
        if not j:
            continue
        m0 = recompute(j, 0.0)
        m12 = recompute(j, 0.12, j.get("embodiedSubstitution"), j.get("cognitiveAiSubstitution"))
        # priors from generate are embedded in stored - get from re-running generate priors is hard
        # use stored E/C as proxy for blended output components
        print(
            f"{jid} | {j['title'][:28]} | {j['aiImpact']:.1f} | "
            f"{m0.total_10:.1f} (E{m0.embodied_10}/C{m0.cognitive_10}) | "
            f"{m12.total_10:.1f}"
        )

    print("\n--- Education & health (all) ---")
    for j in sorted(jobs, key=lambda x: x["aiImpact"]):
        if "教育" in j.get("industryLabel", "") or "医疗" in j.get("industryLabel", ""):
            m0 = recompute(j, 0.0)
            print(f"{j['aiImpact']:.1f} -> model {m0.total_10:.1f} | {j['title']}")


if __name__ == "__main__":
    main()
