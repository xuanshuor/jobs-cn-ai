# -*- coding: utf-8 -*-
"""
学术级替代率公共 API（供 generate_embodied_ai_dataset 与校验脚本调用）。
"""

from __future__ import annotations

from dataclasses import dataclass, field

from academic.engine import (
    ACADEMIC_SUBSTITUTION_MODEL_ID,
    AI_IMPACT_COMPOSITION_ID,
    SUBSTITUTION_CALIBRATION_ID,
    AcademicSubstitutionResult,
    compute_academic_substitution,
)
from academic.monte_carlo import run_monte_carlo_total_pressure
from academic.occupation_tasks import occupation_task_breakdown

# 兼容旧 import 名
TASK_SUBSTITUTION_MODEL_ID = ACADEMIC_SUBSTITUTION_MODEL_ID
MONTE_CARLO_DEFAULT_N = 2000


@dataclass
class OccupationSubstitutionResult:
    embodied_10: float
    cognitive_10: float
    hybrid_10: float
    total_10: float
    shares: object
    timeline: dict[str, float] = field(default_factory=dict)
    uncertainty_p5: float | None = None
    uncertainty_p50: float | None = None
    uncertainty_p95: float | None = None
    archetype: str = ""
    task_breakdown: dict | None = None
    methodology: dict | None = None


def compute_occupation_substitution(
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
    monte_carlo_samples: int = MONTE_CARLO_DEFAULT_N,
    include_task_breakdown: bool = False,
) -> OccupationSubstitutionResult:
    res: AcademicSubstitutionResult = compute_academic_substitution(
        title=title,
        sector=sector,
        education=education,
        employment=employment,
        salary_median=salary_median,
        tier=tier,
        industry_label=industry_label,
        prior_embodied_10=prior_embodied_10,
        prior_cognitive_10=prior_cognitive_10,
        prior_blend=prior_blend,
        include_breakdown=include_task_breakdown,
    )

    unc_p5 = unc_p50 = unc_p95 = None
    if monte_carlo_samples > 0:
        bands = run_monte_carlo_total_pressure(
            title=title,
            sector=sector,
            education=education,
            employment=employment,
            salary_median=salary_median,
            tier=tier,
            industry_label=industry_label,
            n_samples=monte_carlo_samples,
            seed=abs(hash(title)) % (2**31),
        )
        unc_p5, unc_p50, unc_p95 = bands.p5, bands.p50, bands.p95

    breakdown = None
    if include_task_breakdown:
        breakdown = occupation_task_breakdown(
            title=title,
            sector=sector,
            tier=tier,
            industry_label=industry_label,
            education=education,
        )

    return OccupationSubstitutionResult(
        embodied_10=res.embodied_10,
        cognitive_10=res.cognitive_10,
        hybrid_10=res.hybrid_10,
        total_10=res.total_10,
        shares=res.shares,
        timeline=res.timeline,
        uncertainty_p5=unc_p5,
        uncertainty_p50=unc_p50,
        uncertainty_p95=unc_p95,
        archetype=res.archetype,
        task_breakdown=breakdown,
        methodology=res.methodology,
    )
