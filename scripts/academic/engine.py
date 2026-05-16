# -*- coding: utf-8 -*-
"""
学术级替代率引擎（README §7–§18 主公式）。

ReplacementRate_i(t) = Σ_j w_ij · P_ij(t) · Acceptance_ij · ROI_ij(t)

P_ij = σ(α·Coverage_ij − β·Complexity_ij − γ·Regulation_ij)

Coverage 分别对 AI 前沿、机器人前沿、协同前沿 h_k=1−(1−AI_k)(1−Robot_k) 计算。
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field

from academic.loader import TaskDef, load_frontiers, load_frontiers_meta, load_tasks
from academic.occupation_tasks import resolve_occupation_task_weights

# 模型标识
ACADEMIC_SUBSTITUTION_MODEL_ID = "task-capability-academic-v2"
SUBSTITUTION_CALIBRATION_ID = "roi-deployment-v2"
AI_IMPACT_COMPOSITION_ID = "task-weighted-hybrid-academic-v2"

# Sigmoid 参数（可写入方法论文附录）
_ALPHA = 4.4
_BETA = 2.75
_GAMMA = 3.15

# 显示标定：单调映射 [0,1]→[0,10]
_DISPLAY_KAPPA = 2.72


@dataclass
class SubstitutionShares:
    fully_automatable: float
    human_ai_collaboration: float
    human_only: float


@dataclass
class AcademicSubstitutionResult:
    embodied_10: float
    cognitive_10: float
    hybrid_10: float
    total_10: float
    shares: SubstitutionShares
    timeline: dict[str, float] = field(default_factory=dict)
    uncertainty_p5: float | None = None
    uncertainty_p50: float | None = None
    uncertainty_p95: float | None = None
    archetype: str = ""
    task_breakdown: list[dict] | None = None
    methodology: dict | None = None


def _sigmoid(x: float) -> float:
    x = max(-14.0, min(14.0, x))
    return 1.0 / (1.0 + math.exp(-x))


def _coverage(cap: dict[str, float], frontier: dict[str, float]) -> float:
    return sum(cap.get(k, 0.0) * frontier.get(k, 0.0) for k in frontier)


def _hybrid_frontier(ai: dict[str, float], robot: dict[str, float]) -> dict[str, float]:
    return {k: 1.0 - (1.0 - ai[k]) * (1.0 - robot[k]) for k in ai}


def _logistic_year_scale(year: int, meta: dict) -> float:
    r = float(meta["logistic"]["r"])
    t0 = int(meta["baseYear"]) + int(meta["logistic"]["t0_offset_years"])
    return 1.0 / (1.0 + math.exp(-r * (year - t0)))


def frontiers_at_year(year: int) -> tuple[dict[str, float], dict[str, float]]:
    """技术 S 曲线：前沿随年份 logistic 放大（README §11）。"""
    meta = load_frontiers_meta()
    base = int(meta["baseYear"])
    defs = load_frontiers()
    if year <= base:
        scale = 1.0
    else:
        scale = 0.88 + 0.38 * _logistic_year_scale(year, meta)
    ai = {k: min(1.0, defs[k].ai_2025 * scale) for k in defs}
    robot = {k: min(1.0, defs[k].robot_2025 * scale) for k in defs}
    return ai, robot


def _roi_multiplier(employment: int, salary_median: int, physical_weight: float) -> float:
    """README §13：ROI 门控（示意）。"""
    mass = math.log10(10.0 + max(0, employment))
    mass_k = 0.055 * (mass - 1.0)
    sal = min(float(salary_median), 550_000.0) / 550_000.0
    roi = 0.74 + mass_k + 0.11 * (1.0 - sal) - 0.05 * sal + 0.07 * physical_weight
    return max(0.42, min(1.15, roi))


def _task_automation_prob(
    task: TaskDef,
    frontier: dict[str, float],
    *,
    regulation_shift: float,
    roi: float,
) -> float:
    cov = _coverage(task.capabilities, frontier)
    reg = min(1.0, max(0.0, task.regulation + regulation_shift))
    base = _sigmoid(_ALPHA * cov - _BETA * task.complexity - _GAMMA * reg)
    return max(0.0, min(1.0, base * task.acceptance * roi))


def _prob_to_display10(p: float) -> float:
    p = max(0.0, min(1.0, p))
    return round(min(10.0, 10.0 * (1.0 - math.exp(-_DISPLAY_KAPPA * p))), 1)


def compute_academic_substitution(
    *,
    title: str,
    sector: str,
    education: str,
    employment: int,
    salary_median: int,
    tier: str | None = None,
    industry_label: str | None = None,
    prior_embodied_10: float | None = None,
    prior_cognitive_10: float | None = None,
    prior_blend: float = 0.12,
    year: int = 2025,
    include_breakdown: bool = False,
) -> AcademicSubstitutionResult:
    weights, arch_key, reg_shift = resolve_occupation_task_weights(
        title=title,
        sector=sector,
        tier=tier,
        industry_label=industry_label,
        education=education,
    )
    tasks = load_tasks()
    ai_f, robot_f = frontiers_at_year(year)
    hybrid_f = _hybrid_frontier(ai_f, robot_f)

    phys_w = sum(
        weights.get(tid, 0.0)
        for tid in ("T_PICK_PLACE", "T_MATERIAL_MOVE", "T_AGRI_FIELD", "T_FIELD_WORK")
    )
    roi = _roi_multiplier(employment, salary_median, phys_w)

    p_cog = p_emb = p_hyb = 0.0
    share_fully = share_collab = 0.0
    breakdown_rows: list[dict] = []

    for tid, w in weights.items():
        task = tasks[tid]
        pc = _task_automation_prob(task, ai_f, regulation_shift=reg_shift, roi=roi)
        pe = _task_automation_prob(task, robot_f, regulation_shift=reg_shift, roi=roi)
        ph = _task_automation_prob(task, hybrid_f, regulation_shift=reg_shift, roi=roi)
        p_cog += w * pc
        p_emb += w * pe
        p_hyb += w * ph
        p_star = max(pc, pe, ph)
        if p_star >= 0.82:
            share_fully += w * p_star
        elif p_star >= 0.38:
            share_collab += w * p_star
        if include_breakdown:
            breakdown_rows.append(
                {
                    "taskId": tid,
                    "weight": round(w, 4),
                    "pCognitive": round(pc, 3),
                    "pEmbodied": round(pe, 3),
                    "pHybrid": round(ph, 3),
                }
            )

    share_fully = min(1.0, share_fully)
    share_collab = min(1.0 - share_fully, share_collab)
    share_human = max(0.0, 1.0 - share_fully - share_collab)

    synergy = 0.1 * math.sqrt(max(0.0, p_cog * p_emb))
    total_p = min(1.0, p_hyb + synergy)

    e10 = _prob_to_display10(p_emb)
    c10 = _prob_to_display10(p_cog)
    h10 = _prob_to_display10(p_hyb)
    t10 = _prob_to_display10(total_p)

    if prior_embodied_10 is not None and prior_cognitive_10 is not None:
        b = max(0.0, min(1.0, prior_blend))
        e10 = round((1 - b) * e10 + b * prior_embodied_10, 1)
        c10 = round((1 - b) * c10 + b * prior_cognitive_10, 1)
        h10 = round((1 - b) * h10 + b * (prior_embodied_10 + prior_cognitive_10) / 2.0, 1)
        prior_syn = 0.1 * math.sqrt(max(0.0, prior_embodied_10 * prior_cognitive_10) / 10.0)
        prior_t10 = min(10.0, (prior_embodied_10 + prior_cognitive_10) / 2.0 + prior_syn * 10.0)
        t10 = round(min(10.0, (1 - b) * t10 + b * prior_t10), 1)

    timeline: dict[str, float] = {}
    for y in (2025, 2030, 2035, 2040):
        ai_y, robot_y = frontiers_at_year(y)
        hy_y = _hybrid_frontier(ai_y, robot_y)
        pc_y = pe_y = ph_y = 0.0
        for tid, w in weights.items():
            task = tasks[tid]
            pc_y += w * _task_automation_prob(task, ai_y, regulation_shift=reg_shift, roi=roi)
            pe_y += w * _task_automation_prob(task, robot_y, regulation_shift=reg_shift, roi=roi)
            ph_y += w * _task_automation_prob(task, hy_y, regulation_shift=reg_shift, roi=roi)
        syn_y = 0.1 * math.sqrt(max(0.0, pc_y * pe_y))
        timeline[str(y)] = _prob_to_display10(min(1.0, ph_y + syn_y))

    methodology = {
        "modelId": ACADEMIC_SUBSTITUTION_MODEL_ID,
        "formula": "sum_j w_ij * sigma(alpha*Coverage - beta*Complexity - gamma*Regulation) * Acceptance * ROI",
        "hybridFrontier": "h_k = 1 - (1-AI_k)(1-Robot_k)",
        "taskWeight": "normalize(TimeShare * Criticality * EconomicValue)",
        "references": ["O*NET-style capability space", "MMLU/SWE-Bench/ManiSkill frontier proxies"],
    }

    return AcademicSubstitutionResult(
        embodied_10=min(10.0, e10),
        cognitive_10=min(10.0, c10),
        hybrid_10=min(10.0, h10),
        total_10=min(10.0, t10),
        shares=SubstitutionShares(
            fully_automatable=round(share_fully, 3),
            human_ai_collaboration=round(share_collab, 3),
            human_only=round(share_human, 3),
        ),
        timeline=timeline,
        archetype=arch_key,
        task_breakdown=breakdown_rows if include_breakdown else None,
        methodology=methodology,
    )
