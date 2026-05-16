import type { JobOccupation } from "@/core/types";
import { LABOR_BALANCE_SCENARIO_YEAR } from "@/core/laborForce";
import { MBTI_DESCRIPTIONS } from "./questions";
import {
  ASSESSMENT_STORAGE_KEY,
  type AssessmentAnswers,
  type AssessmentResult,
  type IndustryRecommendation,
  type RiasecCode,
} from "./types";

const JOB_CATEGORY_META: Record<
  string,
  { keywords: string[]; industries: string[]; baseRisk: number }
> = {
  office_admin: {
    keywords: ["文员", "行政", "人事", "档案"],
    industries: ["行政办公", "人力资源", "档案文献"],
    baseRisk: 62,
  },
  finance: {
    keywords: ["会计", "审计", "银行", "金融", "财务"],
    industries: ["金融", "财务共享", "审计鉴证"],
    baseRisk: 58,
  },
  tech: {
    keywords: ["软件", "开发", "数据", "算法", "运维", "产品"],
    industries: ["信息技术", "人工智能", "物流科技"],
    baseRisk: 72,
  },
  sales_service: {
    keywords: ["销售", "客服", "零售", "导购"],
    industries: ["批发零售", "客户服务", "餐饮"],
    baseRisk: 55,
  },
  logistics: {
    keywords: ["物流", "仓储", "配送", "快递", "司机"],
    industries: ["物流仓储", "邮政快递", "餐饮配送"],
    baseRisk: 64,
  },
  manufacturing: {
    keywords: ["普工", "操作", "质检", "装配", "焊接"],
    industries: ["电子制造", "制造业", "通用设备"],
    baseRisk: 68,
  },
  construction: {
    keywords: ["施工", "建筑", "钢筋", "泥瓦", "造价"],
    industries: ["建筑业", "房地产"],
    baseRisk: 52,
  },
  healthcare: {
    keywords: ["护士", "医生", "医疗", "药师", "康复"],
    industries: ["医疗卫生", "健康服务"],
    baseRisk: 28,
  },
  education: {
    keywords: ["教师", "教育", "培训", "助教"],
    industries: ["教育", "公共服务"],
    baseRisk: 38,
  },
  creative: {
    keywords: ["设计", "美工", "传媒", "编辑", "文案"],
    industries: ["设计创意", "广告传媒", "传媒"],
    baseRisk: 66,
  },
  legal: {
    keywords: ["律师", "法务", "合规", "审计"],
    industries: ["法律服务", "审计鉴证"],
    baseRisk: 48,
  },
  agriculture: {
    keywords: ["种植", "养殖", "农业", "农机"],
    industries: ["农林牧渔", "智慧农业", "设施农业"],
    baseRisk: 45,
  },
  management: {
    keywords: ["经理", "主管", "总监", "管理"],
    industries: ["制造业", "信息技术", "金融"],
    baseRisk: 42,
  },
  other: {
    keywords: [],
    industries: [],
    baseRisk: 50,
  },
};

const INDUSTRY_RIASEC: Record<string, Partial<Record<RiasecCode, number>>> = {
  信息技术: { I: 3, C: 1, E: 1 },
  人工智能: { I: 3, R: 1 },
  医疗卫生: { S: 3, I: 2 },
  教育: { S: 3, A: 1 },
  金融: { E: 2, C: 2, I: 1 },
  法律服务: { I: 2, C: 2, E: 1 },
  设计创意: { A: 3, I: 1 },
  广告传媒: { A: 2, E: 2, S: 1 },
  制造业: { R: 3, C: 1 },
  电子制造: { R: 2, I: 1, C: 1 },
  建筑业: { R: 3, E: 1 },
  农林牧渔: { R: 3, I: 1 },
  智慧农业: { R: 2, I: 2 },
  物流仓储: { R: 2, C: 2, E: 1 },
  餐饮: { S: 2, R: 1, E: 1 },
  人力资源: { S: 2, E: 2, C: 1 },
  科研: { I: 3, A: 1 },
  能源公用: { R: 2, I: 2 },
  公共服务: { S: 2, C: 2 },
};

const RIASEC_NAMES: Record<RiasecCode, string> = {
  R: "现实型",
  I: "研究型",
  A: "艺术型",
  S: "社会型",
  E: "企业型",
  C: "常规型",
};

function jobReplacementPct(job: JobOccupation, year = LABOR_BALANCE_SCENARIO_YEAR): number {
  const s = job.aiLaborStaffing?.[year];
  if (s) return Math.round(s.replacedStaffRatio * 1000) / 10;
  return Math.round(((job.aiImpact - 4) / 6) * 100);
}

function findMatchingJobs(
  answers: AssessmentAnswers,
  jobs: JobOccupation[],
): JobOccupation[] {
  const meta = JOB_CATEGORY_META[answers.jobCategory] ?? JOB_CATEGORY_META.other;
  const scored = jobs.map((j) => {
    let score = 0;
    for (const kw of meta.keywords) {
      if (j.title.includes(kw)) score += 3;
      if (j.industryLabel?.includes(kw)) score += 2;
    }
    for (const ind of meta.industries) {
      if (j.industryLabel === ind) score += 4;
    }
    for (const tag of answers.taskTags) {
      if (tag === "data" && (j.cognitiveAiSubstitution ?? 0) >= 6) score += 1;
      if (tag === "physical" && (j.embodiedSubstitution ?? 0) >= 6) score += 1;
      if (tag === "compliance" && j.industryLabel === "法律服务") score += 2;
    }
    return { job: j, score };
  });
  scored.sort((a, b) => b.score - a.score);
  const top = scored.filter((x) => x.score > 0).slice(0, 12);
  if (top.length >= 3) return top.map((x) => x.job);
  return jobs
    .slice()
    .sort((a, b) => jobReplacementPct(b) - jobReplacementPct(a))
    .slice(0, 8);
}

function taskModifier(tags: string[]): number {
  let m = 0;
  if (tags.includes("routine")) m += 14;
  if (tags.includes("data")) m += 10;
  if (tags.includes("tech_build")) m += 8;
  if (tags.includes("creative")) m += 4;
  if (tags.includes("physical")) m -= 12;
  if (tags.includes("people")) m -= 6;
  if (tags.includes("compliance")) m -= 14;
  if (tags.includes("manage")) m -= 8;
  return m;
}

function experienceModifier(exp: string): number {
  if (exp === "0-2") return 6;
  if (exp === "3-5") return 2;
  if (exp === "6-10") return -4;
  return -10;
}

function educationModifier(edu: string): number {
  if (edu === "graduate") return -8;
  if (edu === "bachelor") return -4;
  if (edu === "middle") return 6;
  return 0;
}

function aiUsageModifier(level: number): number {
  return (level - 3) * 5;
}

function clampPct(n: number): number {
  return Math.max(5, Math.min(92, Math.round(n * 10) / 10));
}

function riskLevel(pct: number): "低" | "中" | "高" {
  if (pct < 35) return "低";
  if (pct < 58) return "中";
  return "高";
}

function buildMbtiType(choices: AssessmentAnswers["mbtiChoices"]): string {
  return choices.join("");
}

function riasecFitScore(industry: string, top: RiasecCode[]): number {
  const weights = INDUSTRY_RIASEC[industry];
  if (!weights) return 1;
  let s = 0;
  top.forEach((code, i) => {
    const w = weights[code] ?? 0;
    s += w * (3 - i);
  });
  return s;
}

function recommendIndustries(
  answers: AssessmentAnswers,
  jobs: JobOccupation[],
): IndustryRecommendation[] {
  const industryMap = new Map<
    string,
    { risks: number[]; employments: number[] }
  >();
  for (const j of jobs) {
    const ind = j.industryLabel ?? "其他";
    if (!industryMap.has(ind)) industryMap.set(ind, { risks: [], employments: [] });
    const bucket = industryMap.get(ind)!;
    bucket.risks.push(jobReplacementPct(j));
    bucket.employments.push(j.employment);
  }

  const rows: IndustryRecommendation[] = [];
  for (const [label, bucket] of industryMap) {
    const avgRisk =
      bucket.risks.reduce((a, b) => a + b, 0) / (bucket.risks.length || 1);
    const fit = riasecFitScore(label, answers.riasecTop);
    const riskPenalty = avgRisk > 55 ? -2 : avgRisk < 40 ? 1 : 0;
    const combined = fit + riskPenalty;
    if (fit <= 0 && answers.jobCategory !== "other") continue;

    let reason = "";
    if (fit >= 4) reason = `与您的${RIASEC_NAMES[answers.riasecTop[0]]}倾向高度契合`;
    else if (fit >= 2) reason = `与您的职业兴趣部分匹配`;
    else reason = `行业替代压力相对较低，适合作为转型参考`;

    rows.push({
      industryLabel: label,
      fitScore: combined,
      avgReplacementRisk: Math.round(avgRisk * 10) / 10,
      reason,
    });
  }

  rows.sort((a, b) => b.fitScore - a.fitScore || a.avgReplacementRisk - b.avgReplacementRisk);

  const meta = JOB_CATEGORY_META[answers.jobCategory];
  const preferred = rows.filter((r) => meta.industries.includes(r.industryLabel));
  const rest = rows.filter((r) => !meta.industries.includes(r.industryLabel));
  const merged = [...preferred, ...rest];

  return merged.slice(0, 5);
}

export function evaluateAssessment(
  answers: AssessmentAnswers,
  jobs: JobOccupation[],
): AssessmentResult {
  const meta = JOB_CATEGORY_META[answers.jobCategory] ?? JOB_CATEGORY_META.other;
  const matched = findMatchingJobs(answers, jobs);
  const datasetAvg =
    matched.reduce((s, j) => s + jobReplacementPct(j), 0) / (matched.length || 1);

  const surveyScore =
    meta.baseRisk +
    taskModifier(answers.taskTags) +
    experienceModifier(answers.experienceYears) +
    educationModifier(answers.education) +
    aiUsageModifier(answers.aiToolUsage);

  const replacementRiskPct = clampPct(surveyScore * 0.35 + datasetAvg * 0.65);
  const level = riskLevel(replacementRiskPct);

  const benchmark = matched[0];
  const mbti = buildMbtiType(answers.mbtiChoices);
  const mbtiInfo = MBTI_DESCRIPTIONS[mbti] ?? {
    title: "综合型",
    traits: ["适应力", "多元兴趣"],
  };

  const riasecLabel = answers.riasecTop
    .map((c) => RIASEC_NAMES[c])
    .join(" · ");

  let replacementSummary = "";
  if (level === "高") {
    replacementSummary = `至 ${LABOR_BALANCE_SCENARIO_YEAR}，您描述的工作内容与样本中「${benchmark?.title ?? "相近岗位"}」等岗位类似，任务自动化占比较高，建议提前布局人机协作技能或向监管/现场专业岗延伸。`;
  } else if (level === "中") {
    replacementSummary = `您的岗位结构处于人机分工重塑期：部分任务可被 AI 承接，但专业判断、现场或强监管环节仍需要人。可参考样本职业「${benchmark?.title ?? ""}」的替代曲线。`;
  } else {
    replacementSummary = `综合任务结构与行业监管特征，您当前方向的整体替代压力偏低，AI 更像增效工具而非整岗替代；仍建议关注认知自动化对辅助性事务的渗透。`;
  }

  return {
    personalityType: mbti,
    personalitySubtitle: `${mbtiInfo.title} · ${riasecLabel}`,
    personalityTraits: mbtiInfo.traits,
    replacementRiskPct,
    replacementLevel: level,
    replacementSummary,
    matchedRoleTitle: benchmark?.title ?? "综合白领岗位",
    benchmarkImpact: benchmark?.aiImpact ?? 5,
    recommendedIndustries: recommendIndustries(answers, jobs),
    completedAt: new Date().toISOString(),
  };
}

export function loadStoredResult(): AssessmentResult | null {
  try {
    const raw = localStorage.getItem(ASSESSMENT_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AssessmentResult;
  } catch {
    return null;
  }
}

export function saveStoredResult(result: AssessmentResult): void {
  localStorage.setItem(ASSESSMENT_STORAGE_KEY, JSON.stringify(result));
}
