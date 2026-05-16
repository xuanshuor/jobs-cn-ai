/** RIASEC 霍兰德六维 */
export type RiasecCode = "R" | "I" | "A" | "S" | "E" | "C";

export type MbtiLetter = "E" | "I" | "S" | "N" | "T" | "F" | "J" | "P";

export interface AssessmentAnswers {
  jobCategory: string;
  experienceYears: string;
  education: string;
  taskTags: string[];
  aiToolUsage: number;
  /** 与 MBTI_QUESTIONS 顺序一致，共 12 题；空字符串表示未作答 */
  mbtiVotes: (MbtiLetter | "")[];
  /** 与 RIASEC_SCENARIOS 顺序一致，每题所选 code */
  riasecScenarioChoices: RiasecCode[];
}

export interface IndustryRecommendation {
  industryLabel: string;
  fitScore: number;
  /** 兴趣契合档位 */
  fitLevel?: "high" | "medium" | "low";
  fitLabel?: string;
  avgReplacementRisk: number;
  /** 行业替代压力档位 */
  riskLevel?: "低" | "中" | "高";
  /** 本站该行业样本岗位数 */
  sampleJobCount?: number;
  reason: string;
  /** 分条说明（展示用；旧版结果可能仅有 reason） */
  detailBullets?: string[];
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
