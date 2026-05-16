import type { JobOccupation } from "./types";
import { LABOR_BALANCE_SCENARIO_YEAR } from "./laborForce";

/** 职业沉淀窗口（年） */
export const CAREER_SEDIMENT_YEARS = 20;

/** 工资路径：线性台阶/工龄 vs 指数型人力资本复利 */
export type CareerSedimentPath = "linear" | "exponential";

const BASE_DISCOUNT = 0.025;
const SUBSTITUTION_DISCOUNT_K = 0.12;

const PROFESSIONAL_TITLE =
  /医师|医生|律师|教师|教授|总监|合伙人|架构|科学家|研究员|药师|设计师|顾问|工程师|分析师|主持|导演/;
const ROUTINE_TITLE =
  /普工|操作|装配|文员|录入|搬运|保洁|收银|导购|仓管|分拣|包装|司机|保安|保洁|洗碗|缝纫/;

/**
 * 判定沉淀路径：高端/专业/人专属任务多 → 指数；普工/低端/可替代高 → 线性。
 */
export function careerSedimentPath(job: JobOccupation): CareerSedimentPath {
  let score = 0;

  if (job.positionTier === "高端") score += 3;
  else if (job.positionTier === "低端") score -= 2;

  if (job.education.includes("研究生")) score += 2;
  else if (job.education.includes("本科")) score += 1;
  else if (["初中", "中专", "高中"].some((k) => job.education.includes(k))) score -= 1;

  const humanOnly = job.substitutionShares?.humanOnly ?? 0;
  if (humanOnly >= 0.35) score += 2;
  else if (humanOnly < 0.12) score -= 1;

  if (PROFESSIONAL_TITLE.test(job.title)) score += 1;
  if (ROUTINE_TITLE.test(job.title)) score -= 2;

  if (job.aiImpact <= 2.5) score += 1;
  if (job.aiImpact >= 5) score -= 1;

  return score >= 1 ? "exponential" : "linear";
}

export function careerSedimentPathLabel(path: CareerSedimentPath): string {
  return path === "exponential" ? "指数沉淀" : "线性沉淀";
}

/** 线性路径：每年在基数上叠加固定比例台阶（算术增长） */
function linearSlopePerYear(job: JobOccupation): number {
  if (job.positionTier === "高端") return 0.035;
  if (job.positionTier === "低端") return 0.015;
  return 0.022;
}

/** 指数路径：年复利式经验回报 */
function exponentialGrowthRate(job: JobOccupation): number {
  if (job.positionTier === "高端") return 0.05;
  if (job.positionTier === "低端") return 0.025;
  return 0.038;
}

function substitutionRisk(job: JobOccupation, scenarioYear: string): number {
  const fromStaffing = job.aiLaborStaffing?.[scenarioYear]?.replacedStaffRatio;
  if (fromStaffing != null) return Math.min(1, Math.max(0, fromStaffing));
  return Math.min(1, Math.max(0, job.aiImpact / 10));
}

export function careerSedimentDiscountRate(
  job: JobOccupation,
  scenarioYear: string = LABOR_BALANCE_SCENARIO_YEAR,
): number {
  return BASE_DISCOUNT + SUBSTITUTION_DISCOUNT_K * substitutionRisk(job, scenarioYear);
}

/** 第 t 年（1-based）名义年薪 */
function wageInYear(
  salary: number,
  t: number,
  path: CareerSedimentPath,
  job: JobOccupation,
): number {
  if (path === "linear") {
    const b = linearSlopePerYear(job);
    return salary * (1 + b * (t - 1));
  }
  const g = exponentialGrowthRate(job);
  return salary * (1 + g) ** (t - 1);
}

/**
 * 20 年潜在收益（现值）：
 * - 线性沉淀：S·(1+b·(t-1)) 算术涨薪
 * - 指数沉淀：S·(1+g)^{t-1} 复利型人力资本
 * 均按 r（含替代风险）贴现。
 */
export function computeCareerSediment20yPotential(
  job: JobOccupation,
  scenarioYear: string = LABOR_BALANCE_SCENARIO_YEAR,
): number {
  const salary = Math.max(0, job.salaryMedianAnnual);
  if (salary === 0) return 0;

  const path = careerSedimentPath(job);
  const r = careerSedimentDiscountRate(job, scenarioYear);

  let pv = 0;
  for (let t = 1; t <= CAREER_SEDIMENT_YEARS; t += 1) {
    const wage = wageInYear(salary, t, path, job);
    pv += wage / (1 + r) ** t;
  }
  return pv;
}

export function formatCareerSediment20yPotential(yuan: number): string {
  const wan = yuan / 10_000;
  if (wan >= 10_000) return `约 ${(wan / 10_000).toFixed(1)} 亿元`;
  if (wan >= 100) return `约 ${(wan / 100).toFixed(1)} 百万元`;
  if (wan >= 10) return `约 ${Math.round(wan)} 万元`;
  return `约 ${wan.toFixed(1)} 万元`;
}

export function careerSedimentFormulaHint(
  job: JobOccupation,
  scenarioYear: string = LABOR_BALANCE_SCENARIO_YEAR,
): string {
  const path = careerSedimentPath(job);
  const pathLabel = careerSedimentPathLabel(path);
  const r = (careerSedimentDiscountRate(job, scenarioYear) * 100).toFixed(1);

  if (path === "linear") {
    const b = (linearSlopePerYear(job) * 100).toFixed(1);
    return `20年工资现值 · ${pathLabel} · 工龄台阶约+${b}%/年 · 贴现约${r}%/年`;
  }
  const g = (exponentialGrowthRate(job) * 100).toFixed(1);
  return `20年工资现值 · ${pathLabel} · 经验复利约${g}%/年 · 贴现约${r}%/年`;
}
