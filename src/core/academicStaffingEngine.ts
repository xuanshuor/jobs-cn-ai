/**
 * 与 scripts/academic/staffing.py 对齐的任务级人力模型（同源 JSON + 公式）。
 */
import type { IndustrySector, JobOccupation, PositionTier } from "./types";
import archetypesJson from "../../scripts/academic/data/occupation_archetypes.json";
import frontiersJson from "../../scripts/academic/data/frontiers.json";
import taskLibraryJson from "../../scripts/academic/data/task_library.json";

const ALPHA = 4.4;
const BETA = 2.75;
const GAMMA = 3.15;
const COLLAB_P_LOW = 0.38;
const COLLAB_P_HIGH = 0.82;

interface TaskDef {
  id: string;
  capabilities: Record<string, number>;
  complexity: number;
  regulation: number;
  acceptance: number;
  time_share: number;
  criticality: number;
  economic_value: number;
}

const TASKS: Record<string, TaskDef> = {};
for (const t of taskLibraryJson.tasks as Array<Record<string, unknown>>) {
  const capsRaw = t.capabilities as Record<string, number>;
  const sum = Object.values(capsRaw).reduce((a, b) => a + b, 0) || 1;
  const caps: Record<string, number> = {};
  for (const [k, v] of Object.entries(capsRaw)) caps[k] = v / sum;
  TASKS[t.id as string] = {
    id: t.id as string,
    capabilities: caps,
    complexity: t.complexity as number,
    regulation: t.regulation as number,
    acceptance: t.acceptance as number,
    time_share: t.time_share as number,
    criticality: t.criticality as number,
    economic_value: t.economic_value as number,
  };
}

const FRONTIERS_META = frontiersJson as {
  baseYear: number;
  logistic: { r: number; t0_offset_years: number };
  capabilities: Record<string, { ai_2025: number; robot_2025: number }>;
};

const ARCH_RAW = archetypesJson as {
  sector_default: Record<string, string>;
  industry_archetype_map: Record<string, string>;
  archetypes: Record<
    string,
    { task_priors: Record<string, number>; regulation_shift?: number }
  >;
  title_keyword_overrides: Array<{
    keywords: string[];
    archetype?: string;
    boost?: string[];
  }>;
  tier_overrides?: Record<
    string,
    { boost?: string[]; dampen?: string[]; amount?: number }
  >;
};

function sigmoid(x: number): number {
  const z = Math.max(-14, Math.min(14, x));
  return 1 / (1 + Math.exp(-z));
}

function coverage(cap: Record<string, number>, frontier: Record<string, number>): number {
  let s = 0;
  for (const k of Object.keys(frontier)) s += (cap[k] ?? 0) * (frontier[k] ?? 0);
  return s;
}

function hybridFrontier(
  ai: Record<string, number>,
  robot: Record<string, number>,
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const k of Object.keys(ai)) out[k] = 1 - (1 - ai[k]) * (1 - robot[k]);
  return out;
}

function logisticYearScale(year: number): number {
  const r = FRONTIERS_META.logistic.r;
  const t0 = FRONTIERS_META.baseYear + FRONTIERS_META.logistic.t0_offset_years;
  return 1 / (1 + Math.exp(-r * (year - t0)));
}

function frontiersAtYear(year: number): {
  ai: Record<string, number>;
  robot: Record<string, number>;
} {
  const base = FRONTIERS_META.baseYear;
  const scale =
    year <= base ? 1 : 0.88 + 0.38 * logisticYearScale(year);
  const ai: Record<string, number> = {};
  const robot: Record<string, number> = {};
  for (const [cid, row] of Object.entries(FRONTIERS_META.capabilities)) {
    ai[cid] = Math.min(1, row.ai_2025 * scale);
    robot[cid] = Math.min(1, row.robot_2025 * scale);
  }
  return { ai, robot };
}

function roiMultiplier(
  employment: number,
  salaryMedian: number,
  physicalWeight: number,
): number {
  const mass = Math.log10(10 + Math.max(0, employment));
  const massK = 0.055 * (mass - 1);
  const sal = Math.min(salaryMedian, 550_000) / 550_000;
  const roi = 0.74 + massK + 0.11 * (1 - sal) - 0.05 * sal + 0.07 * physicalWeight;
  return Math.max(0.42, Math.min(1.15, roi));
}

function taskAutomationProb(
  task: TaskDef,
  frontier: Record<string, number>,
  regulationShift: number,
  roi: number,
): number {
  const cov = coverage(task.capabilities, frontier);
  const reg = Math.max(0, Math.min(1, task.regulation + regulationShift));
  const base = sigmoid(ALPHA * cov - BETA * task.complexity - GAMMA * reg);
  return Math.max(0, Math.min(1, base * task.acceptance * roi));
}

function normalize(weights: Record<string, number>): Record<string, number> {
  const w: Record<string, number> = {};
  for (const [k, v] of Object.entries(weights)) {
    if (v > 0) w[k] = Math.max(1e-6, v);
  }
  const s = Object.values(w).reduce((a, b) => a + b, 0) || 1;
  for (const k of Object.keys(w)) w[k] /= s;
  return w;
}

function resolveOccupationTaskWeights(job: {
  title: string;
  sector: IndustrySector;
  education: string;
  positionTier?: PositionTier | null;
  industryLabel?: string;
}): { weights: Record<string, number>; regulationShift: number } {
  let archKey =
    ARCH_RAW.sector_default[job.sector] ?? "tertiary_office_low";
  if (job.industryLabel && ARCH_RAW.industry_archetype_map[job.industryLabel]) {
    archKey = ARCH_RAW.industry_archetype_map[job.industryLabel];
  }
  for (const rule of ARCH_RAW.title_keyword_overrides) {
    if (rule.keywords.some((kw) => job.title.includes(kw))) {
      if (rule.archetype) archKey = rule.archetype;
      break;
    }
  }
  const arch = ARCH_RAW.archetypes[archKey];
  const regulationShift = arch.regulation_shift ?? 0;

  const priors: Record<string, number> = {};
  for (const [tid, share] of Object.entries(arch.task_priors)) {
    const t = TASKS[tid];
    if (!t) continue;
    priors[tid] = share * t.time_share * t.criticality * t.economic_value;
  }
  let weights = normalize(priors);

  const tier = job.positionTier;
  if (tier && ARCH_RAW.tier_overrides?.[tier]) {
    const tr = ARCH_RAW.tier_overrides[tier];
    const amt = tr.amount ?? 0.05;
    for (const tid of tr.boost ?? []) {
      if (weights[tid] != null) weights[tid] += amt;
    }
    for (const tid of tr.dampen ?? []) {
      if (weights[tid] != null) weights[tid] = Math.max(1e-6, weights[tid] - amt);
    }
    weights = normalize(weights);
  }

  for (const rule of ARCH_RAW.title_keyword_overrides) {
    if (rule.keywords.some((kw) => job.title.includes(kw))) {
      const amt = 0.06;
      for (const tid of rule.boost ?? []) {
        if (weights[tid] != null) weights[tid] += amt;
      }
      weights = normalize(weights);
      break;
    }
  }

  if (job.education.includes("研究生")) {
    for (const tid of ["T_EXPERT_DECISION", "T_ANALYTICS", "T_COMPLIANCE"]) {
      if (weights[tid] != null) weights[tid] += 0.04;
    }
    weights = normalize(weights);
  }

  return { weights, regulationShift };
}

function laborFractionForTask(pStar: number, task: TaskDef): number {
  const p = Math.max(0, Math.min(1, pStar));
  const oversight = 0.04 + 0.22 * task.regulation;

  if (p >= COLLAB_P_HIGH) {
    return Math.min(1, oversight + (1 - p) * (1 - oversight));
  }
  if (p >= COLLAB_P_LOW) {
    const kappa =
      (0.38 + 1.05 * (1 - task.complexity)) *
      task.acceptance *
      (0.65 + 0.35 * task.economic_value);
    const productivity = 1 + (kappa * (p - COLLAB_P_LOW)) / (COLLAB_P_HIGH - COLLAB_P_LOW);
    return 1 / productivity;
  }
  const kappaLight = (0.08 + 0.22 * (1 - task.complexity)) * task.acceptance;
  return 1 / (1 + kappaLight * p);
}

/** 任务级效率比主要来自哪条自动化前沿（与 engine.py 三前沿一致） */
export type AutomationChannel = "cognitive" | "embodied" | "hybrid";

export interface EfficiencyChannelShares {
  /** 无实体：认知 AI / 软件自动化 / RPA / Copilot */
  cognitive: number;
  /** 有实体：机械臂、产线、移动/人形或非人形机器人等 */
  embodied: number;
  /** 协同：认知×具身联合前沿 h=1−(1−AI)(1−Robot) */
  hybrid: number;
}

export interface AcademicStaffingResult {
  assistedStaffRatio: number;
  replacedStaffRatio: number;
  productivityGap: number;
  humanOnlyShare: number;
  collaborationShare: number;
  fullAutoShare: number;
  /** 各通道对加权效率比的贡献份额（合计≈1） */
  efficiencyByChannel: EfficiencyChannelShares;
  dominantChannel: AutomationChannel;
}

function dominantAutomationChannel(
  pc: number,
  pe: number,
  ph: number,
): AutomationChannel {
  if (ph >= pe && ph >= pc) return "hybrid";
  if (pe >= pc) return "embodied";
  return "cognitive";
}

export function computeAcademicStaffing(
  job: JobOccupation,
  year: number,
): AcademicStaffingResult {
  const { weights, regulationShift } = resolveOccupationTaskWeights(job);
  const { ai, robot } = frontiersAtYear(year);
  const hybrid = hybridFrontier(ai, robot);

  const physW = ["T_PICK_PLACE", "T_MATERIAL_MOVE", "T_AGRI_FIELD", "T_FIELD_WORK"].reduce(
    (s, tid) => s + (weights[tid] ?? 0),
    0,
  );
  const roi = roiMultiplier(job.employment, job.salaryMedianAnnual, physW);

  let assisted = 0;
  let gapWeighted = 0;
  let humanOnly = 0;
  let collab = 0;
  let fullAuto = 0;
  const channelGap: Record<AutomationChannel, number> = {
    cognitive: 0,
    embodied: 0,
    hybrid: 0,
  };

  for (const [tid, w] of Object.entries(weights)) {
    const task = TASKS[tid];
    if (!task) continue;
    const pc = taskAutomationProb(task, ai, regulationShift, roi);
    const pe = taskAutomationProb(task, robot, regulationShift, roi);
    const ph = taskAutomationProb(task, hybrid, regulationShift, roi);
    const pStar = Math.max(pc, pe, ph);
    const channel = dominantAutomationChannel(pc, pe, ph);
    const lf = laborFractionForTask(pStar, task);
    const pg = 1 / Math.max(lf, 1e-6);

    assisted += w * lf;
    gapWeighted += w * pg;
    channelGap[channel] += w * pg;
    if (pStar >= COLLAB_P_HIGH) fullAuto += w;
    else if (pStar >= COLLAB_P_LOW) collab += w;
    else humanOnly += w;
  }

  assisted = Math.max(0, Math.min(1, assisted));
  const totalGap = gapWeighted || 1;
  const efficiencyByChannel: EfficiencyChannelShares = {
    cognitive: channelGap.cognitive / totalGap,
    embodied: channelGap.embodied / totalGap,
    hybrid: channelGap.hybrid / totalGap,
  };
  const dominantChannel = (
    Object.entries(efficiencyByChannel) as [AutomationChannel, number][]
  ).reduce((a, b) => (b[1] > a[1] ? b : a))[0];

  return {
    assistedStaffRatio: Math.round(assisted * 10000) / 10000,
    replacedStaffRatio: Math.round((1 - assisted) * 10000) / 10000,
    productivityGap: Math.round(gapWeighted * 1000) / 1000,
    humanOnlyShare: Math.round(humanOnly * 10000) / 10000,
    collaborationShare: Math.round(collab * 10000) / 10000,
    fullAutoShare: Math.round(fullAuto * 10000) / 10000,
    efficiencyByChannel,
    dominantChannel,
  };
}

export function staffingForYear(
  job: JobOccupation,
  year: string,
): AcademicStaffingResult {
  const pre = job.aiLaborStaffing?.[year];
  const computed = computeAcademicStaffing(job, parseInt(year, 10));
  if (!pre) return computed;
  return {
    ...computed,
    assistedStaffRatio: pre.assistedStaffRatio,
    replacedStaffRatio: pre.replacedStaffRatio,
    productivityGap: pre.productivityGap,
    humanOnlyShare: pre.humanOnlyShare,
    collaborationShare: pre.collaborationShare,
    fullAutoShare: pre.fullAutoShare,
  };
}
