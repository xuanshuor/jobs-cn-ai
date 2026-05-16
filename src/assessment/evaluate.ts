import type { JobOccupation } from "@/core/types";
import { computeAiStaffingBreakdown } from "@/core/aiStaffing";
import { LABOR_BALANCE_SCENARIO_YEAR } from "@/core/laborForce";
import {
  isAssessmentAnswersComplete,
  MBTI_DESCRIPTIONS,
  MBTI_QUESTIONS,
  type MbtiDimension,
} from "./questions";
import {
  ASSESSMENT_STORAGE_KEY,
  type AssessmentAnswers,
  type AssessmentResult,
  type IndustryRecommendation,
  type MbtiLetter,
  type RiasecCode,
} from "./types";

const JOB_CATEGORY_META: Record<
  string,
  { keywords: string[]; industries: string[]; titleHints: string[] }
> = {
  office_admin: {
    keywords: ["文员", "行政", "人事", "档案", "秘书", "助理", "办公"],
    titleHints: ["行政", "文员", "人事", "档案"],
    industries: ["行政办公", "人力资源", "档案文献"],
  },
  finance: {
    keywords: ["会计", "审计", "银行", "金融", "财务", "出纳", "风控", "信贷"],
    titleHints: ["会计", "审计", "银行", "金融", "财务"],
    industries: ["金融", "财务共享", "审计鉴证"],
  },
  tech: {
    keywords: ["软件", "开发", "程序", "数据", "算法", "运维", "测试", "产品", "前端", "后端"],
    titleHints: ["开发", "工程师", "数据", "算法", "运维", "测试"],
    industries: ["信息技术", "人工智能", "物流科技", "游戏开发", "半导体"],
  },
  sales_service: {
    keywords: ["销售", "客服", "零售", "导购", "店员", "电销", "商务"],
    titleHints: ["销售", "客服", "导购", "零售"],
    industries: ["批发零售", "客户服务", "餐饮", "电商"],
  },
  logistics: {
    keywords: ["物流", "仓储", "配送", "快递", "司机", "拣货", "仓管"],
    titleHints: ["物流", "仓储", "配送", "快递", "司机"],
    industries: ["物流仓储", "邮政快递", "餐饮配送", "公路货运"],
  },
  manufacturing: {
    keywords: ["普工", "操作", "质检", "装配", "焊接", "机加工", "产线", "技工"],
    titleHints: ["普工", "操作", "质检", "装配", "技工"],
    industries: ["电子制造", "制造业", "通用设备", "汽车制造", "智能制造"],
  },
  construction: {
    keywords: ["施工", "建筑", "钢筋", "泥瓦", "造价", "监理", "安全员"],
    titleHints: ["施工", "建筑", "造价", "监理"],
    industries: ["建筑业", "房地产"],
  },
  healthcare: {
    keywords: ["护士", "医生", "医疗", "药师", "康复", "护理", "临床"],
    titleHints: ["护士", "医生", "药师", "康复", "护理"],
    industries: ["医疗卫生", "健康服务"],
  },
  education: {
    keywords: ["教师", "教育", "培训", "助教", "讲师", "教研"],
    titleHints: ["教师", "讲师", "培训"],
    industries: ["教育", "公共服务"],
  },
  creative: {
    keywords: ["设计", "美工", "传媒", "编辑", "文案", "策划", "视频", "UI"],
    titleHints: ["设计", "编辑", "文案", "策划", "美工"],
    industries: ["设计创意", "广告传媒", "传媒", "游戏开发"],
  },
  legal: {
    keywords: ["律师", "法务", "合规", "法律顾问", "公证"],
    titleHints: ["律师", "法务", "合规"],
    industries: ["法律服务", "审计鉴证"],
  },
  agriculture: {
    keywords: ["种植", "养殖", "农业", "农机", "农技", "畜牧"],
    titleHints: ["农业", "种植", "养殖", "农技"],
    industries: ["农林牧渔", "智慧农业", "设施农业"],
  },
  management: {
    keywords: ["经理", "主管", "总监", "管理", "运营", "总经理"],
    titleHints: ["经理", "主管", "总监", "运营"],
    industries: ["制造业", "信息技术", "金融", "批发零售"],
  },
  other: {
    keywords: [],
    titleHints: [],
    industries: [],
  },
};

const INDUSTRY_RIASEC: Record<string, Partial<Record<RiasecCode, number>>> = {
  信息技术: { I: 3, C: 1, E: 1 },
  人工智能: { I: 3, R: 1 },
  半导体: { I: 3, R: 2 },
  医疗卫生: { S: 3, I: 2 },
  健康服务: { S: 3, I: 1 },
  教育: { S: 3, A: 1 },
  公共服务: { S: 2, C: 2 },
  金融: { E: 2, C: 2, I: 1 },
  财务共享: { C: 3, I: 1 },
  法律服务: { I: 2, C: 2, E: 1 },
  审计鉴证: { C: 3, I: 2 },
  设计创意: { A: 3, I: 1 },
  广告传媒: { A: 2, E: 2, S: 1 },
  传媒: { A: 2, S: 1, E: 1 },
  制造业: { R: 3, C: 1 },
  电子制造: { R: 2, I: 1, C: 1 },
  汽车制造: { R: 3, I: 1 },
  智能制造: { R: 2, I: 2 },
  建筑业: { R: 3, E: 1 },
  农林牧渔: { R: 3, I: 1 },
  智慧农业: { R: 2, I: 2 },
  设施农业: { R: 2, I: 1 },
  物流仓储: { R: 2, C: 2, E: 1 },
  邮政快递: { R: 2, C: 1, E: 1 },
  餐饮配送: { R: 2, S: 1, E: 1 },
  餐饮: { S: 2, R: 1, E: 1 },
  批发零售: { E: 2, S: 2, C: 1 },
  客户服务: { S: 2, E: 1, C: 1 },
  人力资源: { S: 2, E: 2, C: 1 },
  行政办公: { C: 3, S: 1, E: 1 },
  电商: { E: 2, I: 1, C: 1 },
  游戏开发: { I: 2, A: 2, R: 1 },
  能源公用: { R: 2, I: 2 },
  设备维护: { R: 3, I: 1 },
  质检: { R: 2, C: 2 },
};

const RIASEC_NAMES: Record<RiasecCode, string> = {
  R: "现实型",
  I: "研究型",
  A: "艺术型",
  S: "社会型",
  E: "企业型",
  C: "常规型",
};

const EDUCATION_KEYWORDS: Record<string, string[]> = {
  middle: ["初中", "中专", "高中", "中职"],
  college: ["大专", "专科", "高职"],
  bachelor: ["本科", "学士"],
  graduate: ["硕士", "博士", "研究生"],
};

function jobReplacementPct(job: JobOccupation, year = LABOR_BALANCE_SCENARIO_YEAR): number {
  const s = job.aiLaborStaffing?.[year];
  if (s) return Math.round(s.replacedStaffRatio * 1000) / 10;
  const staffing = computeAiStaffingBreakdown(job, year);
  return Math.round(staffing.replacedRatio * 1000) / 10;
}

function educationMatchScore(job: JobOccupation, edu: string): number {
  const keys = EDUCATION_KEYWORDS[edu];
  if (!keys?.length) return 0;
  const text = job.education ?? "";
  for (const k of keys) {
    if (text.includes(k)) return 3;
  }
  if (edu === "graduate" && text.includes("本科")) return 1;
  if (edu === "bachelor" && text.includes("大专")) return 1;
  return 0;
}

function taskTagScore(job: JobOccupation, tags: string[]): number {
  let s = 0;
  const cog = job.cognitiveAiSubstitution ?? job.aiImpact;
  const emb = job.embodiedSubstitution ?? 0;
  const hyb = job.hybridSubstitution ?? 0;
  if (tags.includes("data") || tags.includes("routine") || tags.includes("tech_build")) {
    s += cog >= 6 ? 2 : cog >= 4 ? 1 : 0;
  }
  if (tags.includes("physical")) {
    s += emb >= 5 ? 2 : emb >= 3 ? 1 : 0;
  }
  if (tags.includes("creative")) {
    s += hyb >= 4 || cog >= 5 ? 1 : 0;
  }
  if (tags.includes("compliance")) {
    if (job.industryLabel === "法律服务" || job.industryLabel === "医疗卫生") s += 2;
    if ((job.aiImpact ?? 0) < 5.5) s += 1;
  }
  if (tags.includes("people")) {
    if ((job.aiImpact ?? 0) < 5) s += 1;
  }
  if (tags.includes("manage")) {
    if (job.positionTier?.includes("管理") || job.title.includes("经理")) s += 2;
  }
  return s;
}

interface ScoredJob {
  job: JobOccupation;
  score: number;
}

function findMatchingJobs(answers: AssessmentAnswers, jobs: JobOccupation[]): ScoredJob[] {
  const meta = JOB_CATEGORY_META[answers.jobCategory] ?? JOB_CATEGORY_META.other!;

  const scored: ScoredJob[] = jobs.map((j) => {
    let score = 0;
    for (const kw of meta.keywords) {
      if (j.title.includes(kw)) score += 4;
      if (j.industryLabel?.includes(kw)) score += 2;
    }
    for (const hint of meta.titleHints) {
      if (j.title.includes(hint)) score += 3;
    }
    for (const ind of meta.industries) {
      if (j.industryLabel === ind) score += 6;
    }
    score += educationMatchScore(j, answers.education);
    score += taskTagScore(j, answers.taskTags);
    return { job: j, score };
  });

  scored.sort((a, b) => b.score - a.score || b.job.employment - a.job.employment);

  const top = scored.filter((x) => x.score >= 4).slice(0, 15);
  if (top.length >= 3) return top;

  const fallback = scored.filter((x) => x.score > 0).slice(0, 10);
  if (fallback.length >= 3) return fallback;

  return jobs
    .slice()
    .sort((a, b) => {
      const dr = jobReplacementPct(b) - jobReplacementPct(a);
      return dr !== 0 ? dr : b.employment - a.employment;
    })
    .slice(0, 8)
    .map((job) => ({ job, score: 1 }));
}

function weightedDatasetRisk(matches: ScoredJob[]): number {
  if (matches.length === 0) return 50;
  let wSum = 0;
  let rSum = 0;
  for (const { job, score } of matches) {
    const w = Math.max(1, score) * Math.sqrt(Math.max(1, job.employment));
    wSum += w;
    rSum += jobReplacementPct(job) * w;
  }
  return rSum / wSum;
}

function taskModifier(tags: string[]): number {
  let m = 0;
  if (tags.includes("routine")) m += 12;
  if (tags.includes("data")) m += 11;
  if (tags.includes("tech_build")) m += 9;
  if (tags.includes("creative")) m += 5;
  if (tags.includes("physical")) m -= 14;
  if (tags.includes("people")) m -= 7;
  if (tags.includes("compliance")) m -= 16;
  if (tags.includes("manage")) m -= 9;
  return m;
}

function experienceModifier(exp: string): number {
  if (exp === "0-2") return 4;
  if (exp === "3-5") return 1;
  if (exp === "6-10") return -3;
  return -8;
}

function educationModifier(edu: string): number {
  if (edu === "graduate") return -9;
  if (edu === "bachelor") return -5;
  if (edu === "middle") return 7;
  return 0;
}

function aiUsageModifier(level: number): number {
  return (level - 3) * 4;
}

function clampPct(n: number): number {
  return Math.max(5, Math.min(92, Math.round(n * 10) / 10));
}

function riskLevel(pct: number): "低" | "中" | "高" {
  if (pct < 35) return "低";
  if (pct < 58) return "中";
  return "高";
}

export function resolveMbtiType(votes: (MbtiLetter | "")[]): string {
  const dimOrder: MbtiDimension[] = ["ei", "sn", "tf", "jp"];
  const letters: MbtiLetter[] = [];

  for (const dim of dimOrder) {
    const questions = MBTI_QUESTIONS.filter((q) => q.dimension === dim);
    if (questions.length === 0) continue;

    const counts = new Map<MbtiLetter, number>();
    let tiebreak: MbtiLetter | null = null;

    for (const q of questions) {
      const idx = MBTI_QUESTIONS.indexOf(q);
      const vote = votes[idx];
      if (!vote) continue;
      if (vote === q.optionA.letter || vote === q.optionB.letter) {
        counts.set(vote, (counts.get(vote) ?? 0) + 1);
        tiebreak = vote;
      }
    }

    const a = questions[0]!.optionA.letter;
    const b = questions[0]!.optionB.letter;
    const ca = counts.get(a) ?? 0;
    const cb = counts.get(b) ?? 0;

    if (ca === cb) {
      letters.push(tiebreak ?? a);
    } else {
      letters.push(ca > cb ? a : b);
    }
  }

  return letters.join("");
}

export function resolveRiasecTop(choices: RiasecCode[]): RiasecCode[] {
  const scores: Record<RiasecCode, number> = {
    R: 0,
    I: 0,
    A: 0,
    S: 0,
    E: 0,
    C: 0,
  };
  for (const c of choices) scores[c] += 1;
  return (Object.entries(scores) as [RiasecCode, number][])
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 3)
    .map(([c]) => c);
}

function riasecFitScore(industry: string, top: RiasecCode[]): number {
  const weights = INDUSTRY_RIASEC[industry];
  if (!weights) return 0;
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
  riasecTop: RiasecCode[],
): IndustryRecommendation[] {
  const industryMap = new Map<string, { risks: number[]; employments: number[] }>();
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
    const fit = riasecFitScore(label, riasecTop);
    if (fit <= 0) continue;

    const riskPenalty = avgRisk > 58 ? -2 : avgRisk < 38 ? 1 : 0;
    const combined = fit + riskPenalty;

    let reason = "";
    if (fit >= 5) {
      reason = `与您的${RIASEC_NAMES[riasecTop[0]!]}主导兴趣高度契合，且本库样本中该行业岗位较丰富`;
    } else if (fit >= 3) {
      reason = `与您的职业兴趣较为匹配，可结合本行业样本的替代压力做转型参考`;
    } else {
      reason = `兴趣契合度一般，但行业整体替代压力相对较低，适合作为备选方向`;
    }

    rows.push({
      industryLabel: label,
      fitScore: combined,
      avgReplacementRisk: Math.round(avgRisk * 10) / 10,
      reason,
    });
  }

  rows.sort((a, b) => b.fitScore - a.fitScore || a.avgReplacementRisk - b.avgReplacementRisk);

  const meta = JOB_CATEGORY_META[answers.jobCategory] ?? JOB_CATEGORY_META.other!;
  const preferred = rows.filter((r) => meta.industries.includes(r.industryLabel));
  const rest = rows.filter((r) => !meta.industries.includes(r.industryLabel));
  return [...preferred, ...rest].slice(0, 5);
}

export function evaluateAssessment(
  answers: AssessmentAnswers,
  jobs: JobOccupation[],
): AssessmentResult {
  if (!isAssessmentAnswersComplete(answers)) {
    throw new Error("测评尚未完成，请答完所有题目后再提交");
  }

  const matches = findMatchingJobs(answers, jobs);
  const datasetAvg = weightedDatasetRisk(matches);

  const surveyBase = weightedDatasetRisk(matches.slice(0, 5));
  const surveyScore =
    surveyBase * 0.5 +
    taskModifier(answers.taskTags) +
    experienceModifier(answers.experienceYears) +
    educationModifier(answers.education) +
    aiUsageModifier(answers.aiToolUsage);

  const replacementRiskPct = clampPct(surveyScore * 0.22 + datasetAvg * 0.78);
  const level = riskLevel(replacementRiskPct);

  const benchmark = matches[0]?.job;
  const mbti = resolveMbtiType(answers.mbtiVotes);
  if (mbti.length !== 4) {
    throw new Error("性格情境题作答不完整，无法生成类型");
  }
  const riasecTop = resolveRiasecTop(answers.riasecScenarioChoices);
  const mbtiInfo = MBTI_DESCRIPTIONS[mbti] ?? {
    title: "综合型",
    traits: ["适应力", "多元兴趣"],
  };

  const riasecLabel = riasecTop.map((c) => RIASEC_NAMES[c]).join(" · ");

  let replacementSummary = "";
  if (level === "高") {
    replacementSummary = `对照本库 ${matches.length} 个相近样本，您描述的任务结构与「${benchmark?.title ?? "相近岗位"}」等岗位相似，2030 示意情景下可替代人力占比较高；建议向监管、现场运维或 AI 协同管理方向延伸技能。`;
  } else if (level === "中") {
    replacementSummary = `您的任务组合处于人机分工重塑期：认知类事务更易被 AI 承接，但专业判断、现场服务或强监管环节仍依赖人工。样本参照「${benchmark?.title ?? "相近岗位"}」（2030 示意替代率约 ${Math.round((benchmark?.aiImpact ?? 5) * 10)}%）。`;
  } else {
    replacementSummary = `综合岗位类别、学历与任务结构，整体替代压力偏低，AI 更像增效工具；仍建议关注流程自动化对辅助性事务的渗透。主要参照样本「${benchmark?.title ?? "相近岗位"}」。`;
  }

  return {
    personalityType: mbti,
    personalitySubtitle: `${mbtiInfo.title} · ${riasecLabel}`,
    personalityTraits: mbtiInfo.traits,
    replacementRiskPct,
    replacementLevel: level,
    replacementSummary,
    matchedRoleTitle: benchmark?.title ?? "综合岗位样本",
    benchmarkImpact: benchmark?.aiImpact ?? 5,
    recommendedIndustries: recommendIndustries(answers, jobs, riasecTop),
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
