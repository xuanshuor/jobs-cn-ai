import type { JobOccupation } from "@/core/types";
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
