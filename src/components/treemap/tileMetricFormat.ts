import type { JobOccupation, JobsDataset } from "@/core/types";
import { aiHumanEfficiencyRatio } from "@/core/aiStaffing";

/** 块标签 / 悬停：2030 示意岗位替代率 */
export function formatSubstitutionRateLabel(job: JobOccupation): string {
  return `替代率 ${Math.round(job.aiImpact * 10)}%`;
}

/** 块标签 / 悬停：自动化体系相对单人工效率倍数 */
export function formatEfficiencyRatioLabel(job: JobOccupation, year: string): string {
  const gap =
    job.aiLaborStaffing?.[year]?.productivityGap ?? aiHumanEfficiencyRatio(job, year);
  return `效率比 ${Math.max(1, gap).toFixed(2)} 倍`;
}

function salaryMedianValueText(salaryMedianAnnual: number): string {
  const wan = salaryMedianAnnual / 10_000;
  if (wan >= 100) {
    return `${(wan / 100).toFixed(1)} 百万/年`;
  }
  const text = wan >= 10 ? wan.toFixed(0) : wan.toFixed(1);
  return `${text} 万/年`;
}

/** 块标签：岗位年薪中位数 */
export function formatSalaryMedianLabel(salaryMedianAnnual: number): string {
  return `薪资中位 ${salaryMedianValueText(salaryMedianAnnual)}`;
}

/** 悬停详情：仅数值 */
export function formatSalaryMedianDetail(salaryMedianAnnual: number): string {
  return salaryMedianValueText(salaryMedianAnnual);
}

/** 列表标签：年薪中位数（带「年薪」前缀） */
export function formatAnnualSalaryLabel(salaryMedianAnnual: number): string {
  const body = salaryMedianValueText(salaryMedianAnnual).replace(/\/年$/, "");
  return `年薪 ${body}`;
}

export { formatSalaryRange, formatSalaryWanCompact } from "@/core/salaryRange";

/** 块面标签：从业人数（紧凑） */
export function formatTileEmploymentLabel(
  employment: number,
  unit: JobsDataset["meta"]["employmentUnit"],
): string {
  if (unit === "person") {
    if (employment >= 1e8) return `从业 ${(employment / 1e8).toFixed(2)}亿`;
    if (employment >= 1e4) return `从业 ${(employment / 1e4).toFixed(1)}万`;
    return `从业 ${Math.round(employment).toLocaleString("zh-CN")}`;
  }
  if (employment >= 10000) return `从业 ${(employment / 10000).toFixed(2)}亿`;
  const wan = employment >= 10 ? employment.toFixed(0) : employment.toFixed(1);
  return `从业 ${wan}万`;
}
