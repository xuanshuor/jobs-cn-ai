import type { JobOccupation } from "./types";
import {
  type AcademicStaffingResult,
  type AutomationChannel,
  type EfficiencyChannelShares,
  computeAcademicStaffing,
  staffingForYear,
} from "./academicStaffingEngine";
import { LABOR_BALANCE_SCENARIO_YEAR } from "./laborForce";

export type { AcademicStaffingResult, AutomationChannel, EfficiencyChannelShares };
export { formatAiHumanEfficiencyRatio } from "./efficiencyRatio";

export interface AiStaffingBreakdown {
  baselineRatio: number;
  assistedRatio: number;
  replacedRatio: number;
  /** 加权任务：自动化体系相对单人工效率倍数（≥1，含认知 AI + 具身/产线 + 协同） */
  productivityGap: number;
  humanOnlyShare: number;
  collaborationShare: number;
  fullAutoShare: number;
  efficiencyByChannel: EfficiencyChannelShares;
  dominantChannel: AutomationChannel;
}

export function computeAiStaffingBreakdown(
  job: JobOccupation,
  year: string = LABOR_BALANCE_SCENARIO_YEAR,
): AiStaffingBreakdown {
  const s = staffingForYear(job, year);
  return {
    baselineRatio: 1,
    assistedRatio: s.assistedStaffRatio,
    replacedRatio: s.replacedStaffRatio,
    productivityGap: s.productivityGap,
    humanOnlyShare: s.humanOnlyShare,
    collaborationShare: s.collaborationShare,
    fullAutoShare: s.fullAutoShare,
    efficiencyByChannel: s.efficiencyByChannel,
    dominantChannel: s.dominantChannel,
  };
}

export function aiAssistedStaffingRatio(
  job: JobOccupation,
  year: string = LABOR_BALANCE_SCENARIO_YEAR,
): number {
  return staffingForYear(job, year).assistedStaffRatio;
}

/** 本职业任务加权：AI 相对单人工效率倍数（≥1，越大表示 AI 相对人越强） */
export function aiHumanEfficiencyRatio(
  job: JobOccupation,
  year: string = LABOR_BALANCE_SCENARIO_YEAR,
): number {
  return staffingForYear(job, year).productivityGap;
}

/** 重新计算（忽略 JSON 预存，用于校验） */
export function recomputeAcademicStaffing(
  job: JobOccupation,
  year: string,
): AcademicStaffingResult {
  return computeAcademicStaffing(job, parseInt(year, 10));
}
