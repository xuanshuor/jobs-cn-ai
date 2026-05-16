import { computeAiStaffingBreakdown } from "./aiStaffing";
import { formatEmploymentScale } from "./aggregates";
import { LABOR_BALANCE_SCENARIO_YEAR } from "./laborForce";
import type { JobOccupation, JobsDataset } from "./types";

export interface JobEmploymentStatsFormatted {
  employmentText: string;
  replacedText: string;
  replacedRatioPct: number;
}

/** 样本从业人数与 2030 示意可替代人力规模 */
export function formatJobEmploymentStats(
  job: JobOccupation,
  employmentUnit: JobsDataset["meta"]["employmentUnit"],
  scenarioYear: string = LABOR_BALANCE_SCENARIO_YEAR,
): JobEmploymentStatsFormatted {
  const staffing = computeAiStaffingBreakdown(job, scenarioYear);
  const replacedRatio = staffing.replacedRatio;
  const replacedEmployment = job.employment * replacedRatio;

  return {
    employmentText: formatEmploymentScale(job.employment, employmentUnit),
    replacedText: formatEmploymentScale(replacedEmployment, employmentUnit),
    replacedRatioPct: Math.round(replacedRatio * 1000) / 10,
  };
}
