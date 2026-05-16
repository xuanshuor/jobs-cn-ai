/**
 * 替代压力模型（与 `scripts/substitution_model.py` 数值一致的单一代码真源）。
 *
 * 流水线：先验分项 → 校准 𝒞 → 合成 𝒮。常量与系数勿在此处与 Python 分叉。
 */
import type { IndustrySector, PositionTier } from "./types";

/** 写入 JSON meta，与 Python `SUBSTITUTION_CALIBRATION_ID` 一致 */
export const SUBSTITUTION_CALIBRATION_ID = "cost-mass-v1";
/** 与 Python `AI_IMPACT_COMPOSITION_ID` 一致 */
export const AI_IMPACT_COMPOSITION_ID = "adaptive-v1";

const CAL = {
  embIntensityMin: 0.07,
  embIntensityMax: 0.44,
  cogIntensityMin: 0.09,
  cogIntensityMax: 0.48,
  embBase: 0.16,
  cogBase: 0.19,
  massLogOffset: 10,
  massKScale: 0.058,
  salaryCapYuan: 550_000,
  costDampCoef: 0.045,
  costBoostCoef: 0.07,
} as const;

const CMP = {
  diffWeight: 0.12,
  synergyCoef: 0.55,
} as const;

function clamp10(x: number): number {
  return Math.min(10, Math.max(0, x));
}

/** x₁ = x + (10−x)·α，α∈[0,1] */
export function pushTowardCeiling(x: number, intensity: number): number {
  const cx = clamp10(x);
  const a = Math.min(1, Math.max(0, intensity));
  return cx + (10 - cx) * a;
}

function employmentMassTerm(employment: number): number {
  const m = Math.log10(CAL.massLogOffset + Math.max(0, employment));
  return CAL.massKScale * (m - 1);
}

function salaryTerms(salaryMedian: number): { damp: number; boost: number } {
  const sal = Math.min(salaryMedian, CAL.salaryCapYuan) / CAL.salaryCapYuan;
  return {
    damp: CAL.costDampCoef * sal,
    boost: CAL.costBoostCoef * (1 - sal),
  };
}

/** α_emb(h) */
export function embodiedCalibrationIntensity(opts: {
  employment: number;
  salaryMedian: number;
  sector: IndustrySector;
  positionTier?: PositionTier | null;
  education: string;
}): number {
  const massK = employmentMassTerm(opts.employment);
  const { damp, boost } = salaryTerms(opts.salaryMedian);
  let alpha = CAL.embBase + massK + boost - damp;
  const { sector } = opts;
  if (sector === "secondary") alpha += 0.11;
  else if (sector === "primary") alpha += 0.09;
  else alpha += 0.06;

  const tier = opts.positionTier;
  if (tier === "低端") alpha += 0.1;
  else if (tier === "中端") alpha += 0.045;
  else if (tier === "高端") alpha += 0.022;

  const edu = opts.education;
  if (["初中", "中专", "高中"].some((x) => edu.includes(x))) alpha += 0.055;
  else if (edu.includes("大专")) alpha += 0.035;
  else if (edu.includes("研究生")) alpha -= 0.018;

  return Math.min(CAL.embIntensityMax, Math.max(CAL.embIntensityMin, alpha));
}

/** α_cog(h) */
export function cognitiveCalibrationIntensity(opts: {
  employment: number;
  salaryMedian: number;
  sector: IndustrySector;
  positionTier?: PositionTier | null;
  education: string;
}): number {
  const massK = employmentMassTerm(opts.employment);
  const { damp, boost } = salaryTerms(opts.salaryMedian);
  let alpha = CAL.cogBase + massK + boost - damp;
  const { sector } = opts;
  if (sector === "secondary") alpha += 0.08;
  else if (sector === "primary") alpha += 0.06;
  else alpha += 0.12;

  const tier = opts.positionTier;
  if (tier === "低端") alpha += 0.12;
  else if (tier === "中端") alpha += 0.055;
  else if (tier === "高端") alpha += 0.028;

  const edu = opts.education;
  if (["初中", "中专", "高中"].some((x) => edu.includes(x))) alpha += 0.065;
  else if (edu.includes("大专")) alpha += 0.045;
  else if (edu.includes("研究生")) alpha -= 0.012;

  return Math.min(CAL.cogIntensityMax, Math.max(CAL.cogIntensityMin, alpha));
}

/** 算子 𝒞：独立校准两通道 */
export function calibrateEmbodiedCognitive(
  embodied: number,
  cognitive: number,
  opts: {
    employment: number;
    salaryMedian: number;
    sector: IndustrySector;
    positionTier?: PositionTier | null;
    education: string;
  },
): [number, number] {
  const ae = embodiedCalibrationIntensity(opts);
  const ac = cognitiveCalibrationIntensity(opts);
  const e1 = pushTowardCeiling(embodied, ae);
  const c1 = pushTowardCeiling(cognitive, ac);
  return [
    Math.round(Math.min(10, e1) * 10) / 10,
    Math.round(Math.min(10, c1) * 10) / 10,
  ];
}

/**
 * 算子 𝒮：加权 + 双通道协同（与 Python `compute_ai_impact` 一致）。
 */
export function computeAiImpactFromScores(
  embodied: number,
  cognitive: number,
  opts: {
    sector: IndustrySector;
    education: string;
    positionTier?: PositionTier | null;
  },
): number {
  const e = clamp10(embodied);
  const c = clamp10(cognitive);

  let wE: number;
  let wC: number;
  if (opts.sector === "primary") {
    wE = 0.58;
    wC = 0.42;
  } else if (opts.sector === "secondary") {
    wE = 0.52;
    wC = 0.48;
  } else {
    wE = 0.34;
    wC = 0.66;
  }

  const tier = opts.positionTier;
  if (tier === "低端") {
    wE -= 0.06;
    wC += 0.06;
  } else if (tier === "高端") {
    wE += 0.08;
    wC -= 0.08;
  } else if (tier === "中端") {
    wE += 0.02;
    wC -= 0.02;
  }

  const edu = opts.education;
  if (edu.includes("研究生")) {
    wE -= 0.05;
    wC += 0.05;
  } else if (edu.includes("本科")) {
    wE -= 0.03;
    wC += 0.03;
  } else if (edu.includes("大专")) {
    wE += 0.02;
    wC -= 0.02;
  } else if (["初中", "中专", "高中"].some((x) => edu.includes(x))) {
    wE += 0.06;
    wC -= 0.06;
  }

  const diff = (e - c) / 10;
  wE += CMP.diffWeight * diff;
  wC -= CMP.diffWeight * diff;

  const s = Math.max(1e-9, wE + wC);
  wE /= s;
  wC /= s;

  const linear = wE * e + wC * c;
  const both = Math.sqrt(Math.max(0, (e / 10) * (c / 10)));
  const synergy = CMP.synergyCoef * both;

  return Math.round(Math.min(10, linear + synergy) * 10) / 10;
}
