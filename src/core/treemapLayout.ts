import type { IndustrySector, JobOccupation } from "./types";

/** 黄金比 φ，用于 squarify 长宽比目标 */
export const GOLDEN_RATIO = (1 + Math.sqrt(5)) / 2;

/** 斐波那契整数列：块面积按整数比递进，避免就业人数线性拉伸 */
const FIBONACCI = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610] as const;

/**
 * 按就业规模分档（万人），与秩位共同决定斐波那契指数。
 * 不追求面积∝人数，只保留「越大块越大」的序关系。
 */
function employmentTier(employment: number): number {
  if (employment >= 400) return 3;
  if (employment >= 150) return 2;
  if (employment >= 50) return 1;
  return 0;
}

/**
 * 单条职业的美学权重（正整数，便于 treemap 形成 1:1:2:3:5… 面积比）。
 * 秩位在行业内均匀映射到斐波那契档位，避免 200+ 岗位都挤在 weight=1。
 * @param rankInSector 行业内按就业从高到低排序后的序号（0 = 最大）
 */
export function aestheticWeightForJob(
  job: JobOccupation,
  rankInSector: number,
  groupSize: number,
): number {
  const tier = employmentTier(job.employment);
  const spreadMax = 9;
  const spread =
    groupSize > 1
      ? Math.round((rankInSector / (groupSize - 1)) * spreadMax)
      : 0;
  const idx = Math.min(FIBONACCI.length - 1, Math.max(0, spreadMax - spread + tier));
  return FIBONACCI[idx];
}

/** 为全部职业计算布局权重（按 sector 分组各自排序） */
export function buildAestheticWeightMap(
  jobs: JobOccupation[],
): Map<string, number> {
  const bySector = new Map<IndustrySector, JobOccupation[]>();
  for (const s of ["primary", "secondary", "tertiary"] as IndustrySector[]) {
    bySector.set(s, []);
  }
  for (const j of jobs) {
    bySector.get(j.sector)?.push(j);
  }

  const weights = new Map<string, number>();
  for (const list of bySector.values()) {
    const sorted = [...list].sort((a, b) => b.employment - a.employment);
    sorted.forEach((job, rank) => {
      weights.set(job.id, aestheticWeightForJob(job, rank, sorted.length));
    });
  }
  return weights;
}
