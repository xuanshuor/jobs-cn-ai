# -*- coding: utf-8 -*-
"""
蒙特卡洛不确定性（README §12，默认 N=2000）。

对前沿增长率、法规、接受度、ROI 扰动进行采样，输出 P5/P50/P95。
"""

from __future__ import annotations

import random
from dataclasses import dataclass

from academic.engine import (
    _ALPHA,
    _BETA,
    _GAMMA,
    _coverage,
    _hybrid_frontier,
    _prob_to_display10,
    _roi_multiplier,
    _sigmoid,
    frontiers_at_year,
)
from academic.loader import load_frontiers_meta, load_tasks
from academic.occupation_tasks import resolve_occupation_task_weights


@dataclass
class UncertaintyBands:
    p5: float
    p50: float
    p95: float


def run_monte_carlo_total_pressure(
    *,
    title: str,
    sector: str,
    education: str,
    employment: int,
    salary_median: int,
    tier: str | None,
    industry_label: str | None,
    year: int = 2025,
    n_samples: int = 2000,
    seed: int | None = None,
) -> UncertaintyBands:
    if seed is not None:
        random.seed(seed)

    weights, _, reg_shift = resolve_occupation_task_weights(
        title=title,
        sector=sector,
        tier=tier,
        industry_label=industry_label,
        education=education,
    )
    tasks = load_tasks()
    meta = load_frontiers_meta()
    ai_base, robot_base = frontiers_at_year(year)

    phys_w = sum(weights.get(tid, 0.0) for tid in ("T_PICK_PLACE", "T_MATERIAL_MOVE"))
    roi_base = _roi_multiplier(employment, salary_median, phys_w)

    samples: list[float] = []
    for _ in range(n_samples):
        frontier_noise = random.gauss(0, 0.045)
        reg_noise = random.gauss(0, 0.04)
        acc_noise = random.gauss(0, 0.03)
        roi_noise = random.gauss(0, 0.05)

        ai = {k: min(1.0, max(0.0, v * (1.0 + frontier_noise))) for k, v in ai_base.items()}
        robot = {k: min(1.0, max(0.0, v * (1.0 + frontier_noise * 0.9))) for k, v in robot_base.items()}
        hybrid = _hybrid_frontier(ai, robot)
        roi = max(0.35, min(1.2, roi_base * (1.0 + roi_noise)))

        p_total = 0.0
        for tid, w in weights.items():
            task = tasks[tid]
            cov = _coverage(task.capabilities, hybrid)
            reg = min(1.0, max(0.0, task.regulation + reg_shift + reg_noise))
            acc = min(1.0, max(0.0, task.acceptance * (1.0 + acc_noise)))
            p = _sigmoid(_ALPHA * cov - _BETA * task.complexity - _GAMMA * reg) * acc * roi
            p_total += w * p

        samples.append(_prob_to_display10(min(1.0, p_total)))

    samples.sort()
    n = len(samples)
    return UncertaintyBands(
        p5=round(samples[int(0.05 * n)], 1),
        p50=round(samples[int(0.50 * n)], 1),
        p95=round(samples[int(0.95 * n)], 1),
    )
