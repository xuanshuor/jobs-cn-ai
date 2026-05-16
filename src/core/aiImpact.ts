/**
 * 综合替代压力（前端入口）：实现见 `substitutionModel.ts`，与 `scripts/substitution_model.py` 对齐。
 */
import type { JobOccupation } from "./types";
import {
  AI_IMPACT_COMPOSITION_ID,
  SUBSTITUTION_CALIBRATION_ID,
  computeAiImpactFromScores,
} from "./substitutionModel";

export { AI_IMPACT_COMPOSITION_ID, SUBSTITUTION_CALIBRATION_ID, computeAiImpactFromScores };

/** 与 JSON 中分项一致时重算 `aiImpact`（校验或接入新数据源时用） */
export function recomputeAiImpact(job: JobOccupation): number {
  const e = job.embodiedSubstitution ?? 0;
  const c = job.cognitiveAiSubstitution ?? 0;
  return computeAiImpactFromScores(e, c, {
    sector: job.sector,
    education: job.education,
    positionTier: job.positionTier,
  });
}
