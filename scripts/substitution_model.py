# -*- coding: utf-8 -*-
"""
替代压力模型（可复现、参数集中）

────────────────────────────────────────────────────────────────
符号
────────────────────────────────────────────────────────────────
- ``e``, ``c`` ∈ [0, 10]：具身替代强度、认知/软件替代强度（一位小数）。
- ``employment``：就业人数，单位 **万人**。
- ``salary_median``：年薪中位数，单位 **元**。
- ``sector`` ∈ {primary, secondary, tertiary}：产业。
- ``tier`` ∈ {低端, 中端, 高端} 或 ``None``：岗位层级。
- ``education``：学历描述字符串（子串匹配）。

流水线（严谨分层）
────────────────────────────────────────────────────────────────
1. **先验分项**（数据集手工维护）：``e₀``, ``c₀``。
2. **校准算子** ``𝒞``：``(e₀, c₀, h) ↦ (e₁, c₁)``。在元数据 ``h`` 下分别计算
   具身强度 ``α_emb(h)`` 与认知强度 ``α_cog(h)``，再独立做凸拉近
   ``x₁ = x₀ + (10 − x₀) · α``（``α`` 截断在合法区间），体现
   「规模摊薄固定成本 / 用工成本 proxy / 产业与层级调制」等**经济—技术**示意，
   且 **α_emb ≠ α_cog**（两通道不对称）。
3. **合成算子** ``𝒮``：``(e₁, c₁, h) ↦ a``。产业/层级/学历决定基权向量
   ``(w_e, w_c)``，经分项主导偏置归一化后得线性项，再加双通道协同项。

本模块为 **单一真源**：``generate_embodied_ai_dataset.py`` 与前端
``src/core/substitutionModel.ts`` 应与此处保持数值一致。
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Literal

# 元数据标识（写入 JSON meta；学术级核心见 academic_substitution.py）
from academic_substitution import (  # noqa: E402
    AI_IMPACT_COMPOSITION_ID,
    SUBSTITUTION_CALIBRATION_ID,
    TASK_SUBSTITUTION_MODEL_ID,
    compute_occupation_substitution,
)

TASK_MODEL_ID = TASK_SUBSTITUTION_MODEL_ID


Sector = Literal["primary", "secondary", "tertiary"]
Tier = Literal["低端", "中端", "高端"]


@dataclass(frozen=True)
class CalibrationConfig:
    """𝒞：向 10 渐近的强度上下界与共享项系数。"""

    emb_intensity_min: float = 0.07
    emb_intensity_max: float = 0.44
    cog_intensity_min: float = 0.09
    cog_intensity_max: float = 0.48

    emb_base: float = 0.16
    cog_base: float = 0.19

    mass_log_offset: float = 10.0
    mass_k_scale: float = 0.058

    salary_cap_yuan: float = 550_000.0
    cost_damp_coef: float = 0.045
    cost_boost_coef: float = 0.07


@dataclass(frozen=True)
class CompositionConfig:
    """𝒮：加权 + 协同项系数。"""

    diff_weight: float = 0.12
    synergy_coef: float = 0.55


CAL = CalibrationConfig()
CMP = CompositionConfig()


def _clamp10(x: float) -> float:
    return max(0.0, min(10.0, float(x)))


def push_toward_ceiling(x: float, intensity: float) -> float:
    """``x₁ = x + (10−x)·α``，``α∈[0,1]``。"""
    x = _clamp10(x)
    a = max(0.0, min(1.0, float(intensity)))
    return x + (10.0 - x) * a


def _employment_mass_term(employment: int, cfg: CalibrationConfig = CAL) -> float:
    """``k_m = scale · (log₁₀(N+δ) − log₁₀(δ))`` 的简化平移形式。"""
    m = math.log10(cfg.mass_log_offset + float(max(0, employment)))
    return cfg.mass_k_scale * (m - 1.0)


def _salary_terms(salary_median: int, cfg: CalibrationConfig = CAL) -> tuple[float, float]:
    """返回 ``(cost_damp, cost_boost)``，均 ∈ [0, ~0.07]。"""
    sal = min(float(salary_median), cfg.salary_cap_yuan) / cfg.salary_cap_yuan
    damp = cfg.cost_damp_coef * sal
    boost = cfg.cost_boost_coef * (1.0 - sal)
    return damp, boost


def embodied_calibration_intensity(
    *,
    employment: int,
    salary_median: int,
    sector: str,
    tier: str | None,
    education: str,
    cfg: CalibrationConfig = CAL,
) -> float:
    """
    ``α_emb(h)``：具身通道校准强度。

    经济—技术叙事：二产/一产 + 大体量就业 → 更利于摊薄机器人与自动化产线 Capex；
    低端 + 偏低学历 → 现场可编程、可复制的动作包更多；高薪略收敛（责任/稀缺缓冲）。
    """
    mass_k = _employment_mass_term(employment, cfg)
    cost_damp, cost_boost = _salary_terms(salary_median, cfg)

    alpha = cfg.emb_base + mass_k + cost_boost - cost_damp

    if sector == "secondary":
        alpha += 0.11
    elif sector == "primary":
        alpha += 0.09
    else:
        alpha += 0.06

    if tier == "低端":
        alpha += 0.10
    elif tier == "中端":
        alpha += 0.045
    elif tier == "高端":
        alpha += 0.022

    if any(x in education for x in ("初中", "中专", "高中")):
        alpha += 0.055
    elif "大专" in education:
        alpha += 0.035
    elif "研究生" in education:
        alpha -= 0.018

    return max(cfg.emb_intensity_min, min(cfg.emb_intensity_max, alpha))


def cognitive_calibration_intensity(
    *,
    employment: int,
    salary_median: int,
    sector: str,
    tier: str | None,
    education: str,
    cfg: CalibrationConfig = CAL,
) -> float:
    """
    ``α_cog(h)``：认知通道校准强度。

    与 ``α_emb`` 分离：三产 + 低端流程岗更利于 LLM/RPA/编排渗透；
    研究生略减（研究/合规缓冲的示意）；规模与薪资项仍进入但可与具身不同权。
    """
    mass_k = _employment_mass_term(employment, cfg)
    cost_damp, cost_boost = _salary_terms(salary_median, cfg)

    alpha = cfg.cog_base + mass_k + cost_boost - cost_damp

    if sector == "secondary":
        alpha += 0.08
    elif sector == "primary":
        alpha += 0.06
    else:
        alpha += 0.12

    if tier == "低端":
        alpha += 0.12
    elif tier == "中端":
        alpha += 0.055
    elif tier == "高端":
        alpha += 0.028

    if any(x in education for x in ("初中", "中专", "高中")):
        alpha += 0.065
    elif "大专" in education:
        alpha += 0.045
    elif "研究生" in education:
        alpha -= 0.012

    return max(cfg.cog_intensity_min, min(cfg.cog_intensity_max, alpha))


def calibrate_embodied_cognitive(
    embodied: float,
    cognitive: float,
    *,
    employment: int,
    salary_median: int,
    sector: str,
    tier: str | None,
    education: str,
) -> tuple[float, float]:
    """算子 ``𝒞``：独立校准两通道。"""
    ae = embodied_calibration_intensity(
        employment=employment,
        salary_median=salary_median,
        sector=sector,
        tier=tier,
        education=education,
    )
    ac = cognitive_calibration_intensity(
        employment=employment,
        salary_median=salary_median,
        sector=sector,
        tier=tier,
        education=education,
    )
    e1 = push_toward_ceiling(embodied, ae)
    c1 = push_toward_ceiling(cognitive, ac)
    return round(min(10.0, e1), 1), round(min(10.0, c1), 1)


def compute_ai_impact(
    embodied: float,
    cognitive: float,
    *,
    sector: str,
    education: str,
    tier: str | None,
    cfg: CompositionConfig = CMP,
) -> float:
    """
    算子 ``𝒮``：加权期望 + 双通道协同。

    步骤：基权 ``(w_e⁰,w_c⁰)`` → 层级/学历修正 → 分项主导偏置
    ``Δw ∝ (e−c)/10`` → 归一化 → 线性项 + ``β·√(ec/100)``。
    """
    e = _clamp10(embodied)
    c = _clamp10(cognitive)

    if sector == "primary":
        w_e, w_c = 0.58, 0.42
    elif sector == "secondary":
        w_e, w_c = 0.52, 0.48
    else:
        w_e, w_c = 0.34, 0.66

    if tier == "低端":
        w_e -= 0.06
        w_c += 0.06
    elif tier == "高端":
        w_e += 0.08
        w_c -= 0.08
    elif tier == "中端":
        w_e += 0.02
        w_c -= 0.02

    if "研究生" in education:
        w_e -= 0.05
        w_c += 0.05
    elif "本科" in education:
        w_e -= 0.03
        w_c += 0.03
    elif "大专" in education:
        w_e += 0.02
        w_c -= 0.02
    elif any(x in education for x in ("初中", "中专", "高中")):
        w_e += 0.06
        w_c -= 0.06

    diff = (e - c) / 10.0
    w_e += cfg.diff_weight * diff
    w_c -= cfg.diff_weight * diff

    s = max(1e-9, w_e + w_c)
    w_e, w_c = w_e / s, w_c / s

    linear = w_e * e + w_c * c
    both = math.sqrt(max(0.0, (e / 10.0) * (c / 10.0)))
    synergy = cfg.synergy_coef * both

    return round(min(10.0, linear + synergy), 1)
