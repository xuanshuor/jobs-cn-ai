import { aiAssistedStaffingRatio, computeAiStaffingBreakdown } from "./aiStaffing";
import {
  CHINA_EMPLOYED_10K,
  LABOR_BALANCE_SCENARIO_YEAR,
} from "./laborForce";
import type {
  IndustryLaborRow,
  IndustrySector,
  JobOccupation,
  JobStats,
  JobsDataset,
  LaborBalanceStats,
} from "./types";

const IMPACT_BIN_EDGES = [0, 2, 4, 6, 7, 8, 10] as const;

const SECTOR_LABEL: Record<IndustrySector, string> = {
  primary: "第一产业",
  secondary: "第二产业",
  tertiary: "第三产业",
};

/**
 * 将 0–10 综合替代压力映射为整岗替代风险系数（0–1，示意）。
 * 压力 ≤4 视为低；10 视为极高。
 */
export function displacementRiskFromImpact(impact: number): number {
  return Math.max(0, Math.min(1, (impact - 4) / 6));
}

/** 任务份额：完全自动化 + 协作任务一半视同岗位压缩（示意） */
export function displacementRiskFromShares(shares: {
  fullyAutomatable: number;
  humanAiCollaboration: number;
}): number {
  return Math.min(
    1,
    shares.fullyAutomatable + 0.5 * shares.humanAiCollaboration,
  );
}

/** 单职业替代风险系数：综合压力与任务份额取较高者 */
export function jobDisplacementRisk(job: JobOccupation): number {
  const fromImpact = displacementRiskFromImpact(job.aiImpact);
  if (job.substitutionShares) {
    return Math.max(fromImpact, displacementRiskFromShares(job.substitutionShares));
  }
  return fromImpact;
}

/** 年份时间轴 → 工作内容受冲击比例（0–1） */
export function exposureRateFromTimeline(
  job: JobOccupation,
  year: string,
): number {
  const y = job.substitutionTimeline?.[year];
  if (y != null) return Math.max(0, Math.min(1, y / 10));
  return displacementRiskFromImpact(job.aiImpact);
}

function binLabel(min: number, max: number): string {
  return `${min}–${max}`;
}

const INDUSTRY_TOP_N = 14;

interface LaborAccumulator {
  withoutAi: number;
  withAi: number;
  redundant: number;
}

function accumulateLaborRow(
  acc: LaborAccumulator,
  employmentSample: number,
  scale: number,
  job: JobOccupation,
  scenarioYear: string,
): void {
  const baseline = employmentSample * scale;
  const assistedRatio = aiAssistedStaffingRatio(job, scenarioYear);
  const withAi = baseline * assistedRatio;
  acc.withoutAi += baseline;
  acc.withAi += withAi;
  acc.redundant += baseline - withAi;
}

function toLaborRow(label: string, acc: LaborAccumulator): IndustryLaborRow {
  const redundant = acc.redundant;
  const withoutAi = acc.withoutAi;
  const withAi = acc.withAi;
  const redundantPct = withoutAi > 0 ? (redundant / withoutAi) * 100 : 0;
  return {
    label,
    withoutAi,
    withAi,
    redundant,
    redundantPct,
  };
}

/** 全国示意：按产业/行业汇总仍需人力与冗余人口 */
export function computeLaborBalance(
  jobs: JobOccupation[],
  sampleEmployment10k: number,
  nationalBaseline10k: number = CHINA_EMPLOYED_10K,
  scenarioYear: string = LABOR_BALANCE_SCENARIO_YEAR,
): LaborBalanceStats {
  const scale =
    sampleEmployment10k > 0 ? nationalBaseline10k / sampleEmployment10k : 1;

  const bySectorAcc = new Map<IndustrySector, LaborAccumulator>();
  const byIndustryAcc = new Map<string, LaborAccumulator>();

  for (const j of jobs) {
    const indLabel = j.industryLabel?.trim() || SECTOR_LABEL[j.sector];

    const sAcc = bySectorAcc.get(j.sector) ?? {
      withoutAi: 0,
      withAi: 0,
      redundant: 0,
    };
    accumulateLaborRow(sAcc, j.employment, scale, j, scenarioYear);
    bySectorAcc.set(j.sector, sAcc);

    const iAcc = byIndustryAcc.get(indLabel) ?? {
      withoutAi: 0,
      withAi: 0,
      redundant: 0,
    };
    accumulateLaborRow(iAcc, j.employment, scale, j, scenarioYear);
    byIndustryAcc.set(indLabel, iAcc);
  }

  const bySector = (["primary", "secondary", "tertiary"] as const)
    .filter((s) => bySectorAcc.has(s))
    .map((s) => toLaborRow(SECTOR_LABEL[s], bySectorAcc.get(s)!))
    .sort((a, b) => b.withoutAi - a.withoutAi);

  const industryRows = [...byIndustryAcc.entries()]
    .map(([label, acc]) => toLaborRow(label, acc))
    .sort((a, b) => b.withoutAi - a.withoutAi);

  const top = industryRows.slice(0, INDUSTRY_TOP_N);
  const rest = industryRows.slice(INDUSTRY_TOP_N);
  const byIndustry: IndustryLaborRow[] = [...top];
  if (rest.length > 0) {
    const otherAcc: LaborAccumulator = {
      withoutAi: 0,
      withAi: 0,
      redundant: 0,
    };
    for (const r of rest) {
      otherAcc.withoutAi += r.withoutAi;
      otherAcc.withAi += r.withAi;
      otherAcc.redundant += r.redundant;
    }
    byIndustry.push(toLaborRow(`其他 ${rest.length} 个行业`, otherAcc));
  }

  const totalWithoutAi = bySector.reduce((s, r) => s + r.withoutAi, 0);
  const totalWithAi = bySector.reduce((s, r) => s + r.withAi, 0);
  const totalRedundant = bySector.reduce((s, r) => s + r.redundant, 0);

  return {
    nationalBaseline10k: nationalBaseline10k,
    sampleEmployment10k,
    scaleFactor: scale,
    scenarioYear,
    totalWithoutAi,
    totalWithAi,
    totalHumansNeeded: totalWithAi,
    totalRedundant,
    totalRedundantPct:
      totalWithoutAi > 0 ? (totalRedundant / totalWithoutAi) * 100 : 0,
    bySector,
    byIndustry,
  };
}

export function computeJobStats(dataset: JobsDataset): JobStats {
  const jobs = dataset.jobs;
  let totalEmployment = 0;
  let impactWeighted = 0;

  for (const j of jobs) {
    totalEmployment += j.employment;
    impactWeighted += j.aiImpact * j.employment;
  }

  const weightedAvgImpact =
    totalEmployment > 0 ? impactWeighted / totalEmployment : 0;

  const bins: JobStats["impactBins"] = [];
  for (let i = 0; i < IMPACT_BIN_EDGES.length - 1; i++) {
    const min = IMPACT_BIN_EDGES[i];
    const max = IMPACT_BIN_EDGES[i + 1];
    bins.push({ label: binLabel(min, max), min, max, employment: 0 });
  }

  for (const j of jobs) {
    for (const b of bins) {
      const inRange =
        j.aiImpact >= b.min &&
        (j.aiImpact < b.max || (b.max === 10 && j.aiImpact === 10));
      if (inRange) {
        b.employment += j.employment;
        break;
      }
    }
  }

  let highImpactSalaryBillions = 0;
  let estimatedDisplacementEmployment = 0;
  let projectedAffected2030 = 0;
  let projectedAffected2040 = 0;
  let highPressureEmployment = 0;
  let fullyAutomatableEmployment = 0;
  let collaborationEmployment = 0;
  let humanOnlyEmployment = 0;

  const sectorEmp = new Map<IndustrySector, number>();
  const sectorDisp = new Map<IndustrySector, number>();

  for (const j of jobs) {
    if (j.aiImpact >= 7) {
      highImpactSalaryBillions += (j.salaryMedianAnnual * j.employment) / 1e8;
      highPressureEmployment += j.employment;
    }

    const risk = jobDisplacementRisk(j);
    estimatedDisplacementEmployment += j.employment * risk;
    projectedAffected2030 +=
      j.employment * computeAiStaffingBreakdown(j, "2030").replacedRatio;
    projectedAffected2040 +=
      j.employment * computeAiStaffingBreakdown(j, "2040").replacedRatio;

    const shares = j.substitutionShares;
    if (shares) {
      fullyAutomatableEmployment += j.employment * shares.fullyAutomatable;
      collaborationEmployment += j.employment * shares.humanAiCollaboration;
      humanOnlyEmployment += j.employment * shares.humanOnly;
    } else {
      humanOnlyEmployment += j.employment * (1 - risk);
    }

    sectorEmp.set(j.sector, (sectorEmp.get(j.sector) ?? 0) + j.employment);
    sectorDisp.set(j.sector, (sectorDisp.get(j.sector) ?? 0) + j.employment * risk);
  }

  const estimatedDisplacementPct =
    totalEmployment > 0
      ? (estimatedDisplacementEmployment / totalEmployment) * 100
      : 0;

  const bySector = (["primary", "secondary", "tertiary"] as const)
    .filter((s) => (sectorEmp.get(s) ?? 0) > 0)
    .map((sector) => ({
      sector,
      label: SECTOR_LABEL[sector],
      employment: sectorEmp.get(sector) ?? 0,
      displaced: sectorDisp.get(sector) ?? 0,
    }));

  const laborBalance = computeLaborBalance(jobs, totalEmployment);

  return {
    totalEmployment,
    weightedAvgImpact,
    impactBins: bins,
    highImpactSalaryBillions,
    peopleImpact: {
      estimatedDisplacementEmployment,
      estimatedDisplacementPct,
      projectedAffected2030,
      projectedAffected2040,
      highPressureEmployment,
      fullyAutomatableEmployment,
      collaborationEmployment,
      humanOnlyEmployment,
      bySector,
      laborBalance,
    },
  };
}

/** 格式化就业/人数规模（与 meta.employmentUnit 一致；万人制下 ≥1 亿自动换算） */
export function formatEmploymentScale(
  n: number,
  unit: JobsDataset["meta"]["employmentUnit"],
): string {
  if (unit === "person") {
    if (n >= 1e8) return `${(n / 1e8).toFixed(2)} 亿人`;
    if (n >= 1e4) return `${(n / 1e4).toFixed(1)} 万人`;
    return `${Math.round(n).toLocaleString("zh-CN")} 人`;
  }
  if (n >= 10000) return `${(n / 10000).toFixed(2)} 亿人`;
  return `${n.toLocaleString("zh-CN", { maximumFractionDigits: 0 })} 万人`;
}

export function formatPercent(p: number): string {
  return `${p.toFixed(1)}%`;
}

export function groupByEducation(jobs: JobOccupation[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const j of jobs) {
    const key = j.education || "未标注";
    m.set(key, (m.get(key) ?? 0) + j.employment);
  }
  return m;
}

const TIER_ORDER = ["低端", "中端", "高端", "未标注"] as const;

/** 按岗位层级汇总就业（未标注 tier 的归入「未标注」） */
export function groupByPositionTier(jobs: JobOccupation[]): { label: string; employment: number }[] {
  const m = new Map<string, number>();
  for (const j of jobs) {
    const key = j.positionTier ?? "未标注";
    m.set(key, (m.get(key) ?? 0) + j.employment);
  }
  return TIER_ORDER.filter((label) => (m.get(label) ?? 0) > 0).map((label) => ({
    label,
    employment: m.get(label) ?? 0,
  }));
}

export function groupBySalaryBand(
  jobs: JobOccupation[],
  edges: number[] = [0, 80_000, 120_000, 200_000, 400_000, Infinity],
): { label: string; employment: number }[] {
  const bands: { label: string; employment: number }[] = [];
  for (let i = 0; i < edges.length - 1; i++) {
    const lo = edges[i];
    const hi = edges[i + 1];
    const label =
      hi === Infinity
        ? `${(lo / 10_000).toFixed(0)}万+/年`
        : `${(lo / 10_000).toFixed(0)}–${(hi / 10_000).toFixed(0)}万/年`;
    bands.push({ label, employment: 0 });
  }
  for (const j of jobs) {
    for (let i = 0; i < edges.length - 1; i++) {
      const lo = edges[i];
      const hi = edges[i + 1];
      if (j.salaryMedianAnnual >= lo && j.salaryMedianAnnual < hi) {
        bands[i].employment += j.employment;
        break;
      }
    }
  }
  return bands;
}
