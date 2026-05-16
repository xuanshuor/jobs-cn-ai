# -*- coding: utf-8 -*-
"""
任务级人力需求模型（与 engine.py 共用 w_ij、P_ij，逐任务计算自动化体系相对人效）。

三前沿（逐任务取最强自动化路径）：
  - P_cog：无实体认知 AI（LLM/Copilot/RPA/软件自动化）
  - P_emb：有实体具身与产线自动化（机械臂、AGV、人形/非人形机器人等）
  - P_hyb：协同前沿 h_k = 1 - (1 - AI_k)(1 - Robot_k)

LaborFraction_ij(p*)：完成同等产出仍所需人工工时比例 ∈ [0,1]
  - p* = max(P_cog, P_emb, P_hyb)
  - 高监管任务保留合规监工比例；协作区按复杂度/接受度决定提效 κ；接近全自动时仅余监工

AssistedRatio = Σ_j w_ij · LaborFraction_ij
ProductivityGap = Σ_j w_ij / LaborFraction_ij  （加权自动化体系相对单人效率倍数，≥1）
"""

from __future__ import annotations

from dataclasses import dataclass

from academic.engine import (
    _hybrid_frontier,
    _roi_multiplier,
    _task_automation_prob,
    frontiers_at_year,
)
from academic.loader import TaskDef, load_tasks
from academic.occupation_tasks import resolve_occupation_task_weights

# 与 engine 分档一致，用于协作区提效弹性
_COLLAB_P_LOW = 0.38
_COLLAB_P_HIGH = 0.82


@dataclass(frozen=True)
class TaskStaffingRow:
    task_id: str
    weight: float
    p_star: float
    labor_fraction: float
    productivity_gap: float


@dataclass(frozen=True)
class OccupationStaffingResult:
    year: int
    assisted_staff_ratio: float
    replaced_staff_ratio: float
    productivity_gap: float
    human_only_share: float
    collaboration_share: float
    full_auto_share: float
    task_rows: tuple[TaskStaffingRow, ...]


def _labor_fraction_for_task(p_star: float, task: TaskDef) -> float:
    """
    任务 j 在自动化概率 p* 下，相对「纯人工」基准所需工时比例。
    """
    p = max(0.0, min(1.0, p_star))
    # 监管越强，全自动后仍需人工监工/担责比例越高
    oversight = 0.04 + 0.22 * task.regulation

    if p >= _COLLAB_P_HIGH:
        return min(1.0, oversight + (1.0 - p) * (1.0 - oversight))

    if p >= _COLLAB_P_LOW:
        # 协作区：复杂度低、接受度高、经济价值高 → AI 提效更显著
        kappa = (
            (0.38 + 1.05 * (1.0 - task.complexity))
            * task.acceptance
            * (0.65 + 0.35 * task.economic_value)
        )
        productivity = 1.0 + kappa * ((p - _COLLAB_P_LOW) / (_COLLAB_P_HIGH - _COLLAB_P_LOW))
        return 1.0 / productivity

    # 低自动化区：Copilot 轻度辅助
    kappa_light = (0.08 + 0.22 * (1.0 - task.complexity)) * task.acceptance
    productivity = 1.0 + kappa_light * p
    return 1.0 / productivity


def compute_occupation_staffing(
    *,
    title: str,
    sector: str,
    education: str,
    employment: int,
    salary_median: int,
    tier: str | None = None,
    industry_label: str | None = None,
    year: int = 2030,
    include_tasks: bool = False,
) -> OccupationStaffingResult:
    weights, _arch, reg_shift = resolve_occupation_task_weights(
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

    assisted = 0.0
    gap_weighted = 0.0
    human_only = collab = full_auto = 0.0
    rows: list[TaskStaffingRow] = []

    for tid, w in weights.items():
        task = tasks[tid]
        pc = _task_automation_prob(task, ai_f, regulation_shift=reg_shift, roi=roi)
        pe = _task_automation_prob(task, robot_f, regulation_shift=reg_shift, roi=roi)
        ph = _task_automation_prob(task, hybrid_f, regulation_shift=reg_shift, roi=roi)
        p_star = max(pc, pe, ph)
        lf = _labor_fraction_for_task(p_star, task)
        pg = 1.0 / max(lf, 1e-6)

        assisted += w * lf
        gap_weighted += w * pg

        if p_star >= _COLLAB_P_HIGH:
            full_auto += w
        elif p_star >= _COLLAB_P_LOW:
            collab += w
        else:
            human_only += w

        if include_tasks:
            rows.append(
                TaskStaffingRow(
                    task_id=tid,
                    weight=round(w, 4),
                    p_star=round(p_star, 4),
                    labor_fraction=round(lf, 4),
                    productivity_gap=round(pg, 3),
                )
            )

    assisted = max(0.0, min(1.0, assisted))
    return OccupationStaffingResult(
        year=year,
        assisted_staff_ratio=round(assisted, 4),
        replaced_staff_ratio=round(1.0 - assisted, 4),
        productivity_gap=round(gap_weighted, 3),
        human_only_share=round(human_only, 4),
        collaboration_share=round(collab, 4),
        full_auto_share=round(full_auto, 4),
        task_rows=tuple(rows),
    )


def staffing_to_json(res: OccupationStaffingResult) -> dict:
    return {
        "assistedStaffRatio": res.assisted_staff_ratio,
        "replacedStaffRatio": res.replaced_staff_ratio,
        "productivityGap": res.productivity_gap,
        "humanOnlyShare": res.human_only_share,
        "collaborationShare": res.collaboration_share,
        "fullAutoShare": res.full_auto_share,
    }


def compute_occupation_staffing_timeline(
    *,
    title: str,
    sector: str,
    education: str,
    employment: int,
    salary_median: int,
    tier: str | None = None,
    industry_label: str | None = None,
    years: tuple[int, ...] = (2025, 2030, 2035, 2040),
) -> dict[str, dict]:
    return {
        str(y): staffing_to_json(
            compute_occupation_staffing(
                title=title,
                sector=sector,
                education=education,
                employment=employment,
                salary_median=salary_median,
                tier=tier,
                industry_label=industry_label,
                year=y,
            )
        )
        for y in years
    }
