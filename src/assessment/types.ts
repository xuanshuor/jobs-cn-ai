/** RIASEC 霍兰德六维 */
export type RiasecCode = "R" | "I" | "A" | "S" | "E" | "C";

export type MbtiLetter = "E" | "I" | "S" | "N" | "T" | "F" | "J" | "P";

export interface AssessmentAnswers {
  jobCategory: string;
  experienceYears: string;
  education: string;
  taskTags: string[];
  aiToolUsage: number;
  /** 与 MBTI_QUESTIONS 顺序一致，共 8 题 */
  mbtiVotes: MbtiLetter[];
  /** 与 RIASEC_SCENARIOS 顺序一致，每题所选 code */
  riasecScenarioChoices: RiasecCode[];
}

export interface IndustryRecommendation {
  industryLabel: string;
  fitScore: number;
  avgReplacementRisk: number;
  reason: string;
}

export interface AssessmentResult {
  personalityType: string;
  personalitySubtitle: string;
  personalityTraits: string[];
  replacementRiskPct: number;
  replacementLevel: "低" | "中" | "高";
  replacementSummary: string;
  matchedRoleTitle: string;
  benchmarkImpact: number;
  recommendedIndustries: IndustryRecommendation[];
  completedAt: string;
}

export const ASSESSMENT_STORAGE_KEY = "jobs-cn-career-assessment-v1";
