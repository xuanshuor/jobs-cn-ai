import type { JobOccupation } from "./types";
import { careerSedimentPath } from "./careerSediment";

/** 将年薪格式化为「万」或「百万」（不含 /年） */
export function formatSalaryWanCompact(yuan: number): string {
  const wan = yuan / 10_000;
  if (wan >= 100) return `${(wan / 100).toFixed(1)} 百万`;
  if (wan >= 10) return `${Math.round(wan)} 万`;
  return `${wan.toFixed(1)} 万`;
}

/**
 * 示意「相对高位年薪」：在同职业带内，资深/高绩效/编内高位相对中位数的上浮。
 * 数据仅有中位数，高位由层级、学历、沉淀路径推算（非分位数真值）。
 */
export function estimateSalaryHighAnnual(job: JobOccupation): number {
  const median = Math.max(0, job.salaryMedianAnnual);
  if (median === 0) return 0;

  let mult = 1.45;
  if (job.positionTier === "高端") mult = 1.22;
  else if (job.positionTier === "低端") mult = 1.35;
  else if (job.positionTier === "中端") mult = 1.48;

  if (job.education.includes("研究生")) mult += 0.06;
  else if (job.education.includes("本科")) mult += 0.03;

  if (careerSedimentPath(job) === "exponential") mult += 0.1;

  if (/总监|合伙人|首席|资深|专家|主任|学科带头人|正高级/.test(job.title)) {
    mult += 0.08;
  }

  mult = Math.min(2.15, Math.max(1.18, mult));
  return Math.round(median * mult);
}

export interface SalaryRangeFormatted {
  medianAnnual: number;
  highAnnual: number;
  /** 如 12–28万/年 */
  rangeText: string;
  /** 收起标签用，如 12–28万 */
  chipText: string;
  medianText: string;
  highText: string;
}

export function formatSalaryRange(job: JobOccupation): SalaryRangeFormatted {
  const medianAnnual = job.salaryMedianAnnual;
  const highAnnual = Math.max(medianAnnual, estimateSalaryHighAnnual(job));
  const lo = formatSalaryWanCompact(medianAnnual);
  const hi = formatSalaryWanCompact(highAnnual);
  return {
    medianAnnual,
    highAnnual,
    rangeText: `${lo}–${hi}/年`,
    chipText: `${lo}–${hi}`,
    medianText: `${lo}/年`,
    highText: `${hi}/年`,
  };
}
