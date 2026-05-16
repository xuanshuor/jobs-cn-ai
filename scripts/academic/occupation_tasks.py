# -*- coding: utf-8 -*-
"""
职业→任务分解（README §4–§5）。

TaskWeight_ij = normalize(TimeShare × Criticality × EconomicValue)，
再经产业/层级/职名/行业微调。
"""

from __future__ import annotations

from typing import Any

from academic.loader import TaskDef, load_occupation_archetypes, load_tasks


def _normalize(weights: dict[str, float]) -> dict[str, float]:
    w = {k: max(1e-6, v) for k, v in weights.items() if v > 0}
    s = sum(w.values()) or 1.0
    return {k: v / s for k, v in w.items()}


def resolve_occupation_task_weights(
    *,
    title: str,
    sector: str,
    tier: str | None,
    industry_label: str | None,
    education: str,
) -> tuple[dict[str, float], str, float]:
    """
    返回 (task_id -> weight, archetype_key, regulation_shift)。
    """
    arch_raw = load_occupation_archetypes()
    tasks = load_tasks()
    sector_default = arch_raw["sector_default"]
    archetypes = arch_raw["archetypes"]

    arch_key = sector_default.get(sector, "tertiary_office_low")
    if industry_label and industry_label in arch_raw.get("industry_archetype_map", {}):
        arch_key = arch_raw["industry_archetype_map"][industry_label]

    # title keyword overrides
    for rule in arch_raw.get("title_keyword_overrides", []):
        if any(kw in title for kw in rule["keywords"]):
            arch_key = rule.get("archetype", arch_key)
            break

    arch = archetypes[arch_key]
    regulation_shift = float(arch.get("regulation_shift", 0.0))

    # w_ij ∝ time × criticality × economic (from task priors in archetype)
    priors: dict[str, float] = {}
    for tid, share in arch["task_priors"].items():
        if tid not in tasks:
            continue
        t = tasks[tid]
        priors[tid] = share * t.time_share * t.criticality * t.economic_value

    weights = _normalize(priors)

    # tier overrides
    tier_rules = arch_raw.get("tier_overrides", {})
    if tier and tier in tier_rules:
        tr = tier_rules[tier]
        amt = float(tr.get("amount", 0.05))
        for tid in tr.get("boost", []):
            if tid in weights:
                weights[tid] += amt
        for tid in tr.get("dampen", []):
            if tid in weights:
                weights[tid] = max(1e-6, weights[tid] - amt)
        weights = _normalize(weights)

    # title keyword boost (second pass)
    for rule in arch_raw.get("title_keyword_overrides", []):
        if any(kw in title for kw in rule["keywords"]):
            amt = 0.06
            for tid in rule.get("boost", []):
                if tid in weights:
                    weights[tid] += amt
            weights = _normalize(weights)
            break

    if "研究生" in education:
        for tid in ("T_EXPERT_DECISION", "T_ANALYTICS", "T_COMPLIANCE"):
            if tid in weights:
                weights[tid] += 0.04
        weights = _normalize(weights)

    return weights, arch_key, regulation_shift


def occupation_task_breakdown(
    *,
    title: str,
    sector: str,
    tier: str | None,
    industry_label: str | None,
    education: str,
) -> dict[str, Any]:
    """供 JSON 导出：职业的任务分解表（学术审计用）。"""
    weights, arch_key, _ = resolve_occupation_task_weights(
        title=title,
        sector=sector,
        tier=tier,
        industry_label=industry_label,
        education=education,
    )
    tasks = load_tasks()
    rows = []
    for tid, w in sorted(weights.items(), key=lambda x: -x[1]):
        t = tasks[tid]
        rows.append(
            {
                "taskId": tid,
                "taskName": t.name,
                "weight": round(w, 4),
                "complexity": t.complexity,
                "regulation": t.regulation,
            }
        )
    return {"archetype": arch_key, "tasks": rows}
