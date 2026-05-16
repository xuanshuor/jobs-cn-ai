/**
 * 替代压力配色：数值仍为 0–10，**颜色**可按当前数据集区间拉伸到整条色带。
 * 样本里多数岗位 ≥7 时，用 `computeImpactColorDomain` 把 [min,max] 映射到青→红，块与块才有色差。
 */

/** 颜色映射区间（分），与 JSON 分数一致，仅影响色相 */
export interface ImpactColorDomain {
  min: number;
  max: number;
}

export const IMPACT_COLOR_DOMAIN_FULL: ImpactColorDomain = { min: 0, max: 10 };

/** 由当前加载岗位的 aiImpact 求 min/max，并略加 padding */
export function computeImpactColorDomain(impacts: number[]): ImpactColorDomain {
  if (impacts.length === 0) return IMPACT_COLOR_DOMAIN_FULL;
  let min = Math.min(...impacts);
  let max = Math.max(...impacts);
  if (max - min < 1) {
    const mid = (min + max) / 2;
    min = mid - 0.5;
    max = mid + 0.5;
  }
  const pad = 0.15;
  return {
    min: Math.max(0, min - pad),
    max: Math.min(10, max + pad),
  };
}

/** 将分数映射到色带 0–1；domain 为当前数据集拉伸区间 */
export function impactToVisualUnit(
  impact0to10: number,
  domain: ImpactColorDomain = IMPACT_COLOR_DOMAIN_FULL,
): number {
  const span = domain.max - domain.min || 1;
  return Math.max(0, Math.min(1, (impact0to10 - domain.min) / span));
}

function lerp(a: number, b: number, s: number): number {
  return a + (b - a) * s;
}

type RGB = { r: number; g: number; b: number };

/** 五段均匀拉开：约 0–2 青、2–4 蓝、4–6 琥珀、6–8 橙、8–10 红 */
const SPECTRUM_STOPS: { t: number; c: RGB }[] = [
  { t: 0, c: { r: 32, g: 212, b: 235 } },
  { t: 0.25, c: { r: 72, g: 148, b: 255 } },
  { t: 0.5, c: { r: 255, g: 208, b: 72 } },
  { t: 0.75, c: { r: 255, g: 128, b: 40 } },
  { t: 1, c: { r: 255, g: 48, b: 72 } },
];

/**
 * 综合替代压力映射到 RGB（0–10 先归一化到 0–1）。
 * 输出色更亮、更「警报」，用于 Treemap / 图例 / 条形图。
 */
function substitutionRiskRgbFromUnit(u: number): RGB {
  const t = Math.max(0, Math.min(1, u));
  const stops = SPECTRUM_STOPS;
  if (t <= stops[0]!.t) return { ...stops[0]!.c };
  for (let i = 0; i < stops.length - 1; i++) {
    const a = stops[i]!;
    const b = stops[i + 1]!;
    if (t <= b.t) {
      const span = b.t - a.t || 1;
      const s = (t - a.t) / span;
      return {
        r: Math.round(lerp(a.c.r, b.c.r, s)),
        g: Math.round(lerp(a.c.g, b.c.g, s)),
        b: Math.round(lerp(a.c.b, b.c.b, s)),
      };
    }
  }
  return { ...stops[stops.length - 1]!.c };
}

/** 0–1 归一化分数（绝对标度，无数据集拉伸） */
export function substitutionRiskRgb(impactNorm01: number): RGB {
  return substitutionRiskRgbFromUnit(impactNorm01);
}

/** @deprecated 名称保留 */
export function redBlueImpactRgb(t: number): RGB {
  return substitutionRiskRgb(t);
}

function rgbForImpact(impact0to10: number, domain: ImpactColorDomain): RGB {
  return substitutionRiskRgbFromUnit(impactToVisualUnit(impact0to10, domain));
}

/** 替代压力 0–10；传入 domain 时按当前数据集区间拉伸色相 */
export function impactTileFill(
  impact0to10: number,
  alpha: number,
  domain: ImpactColorDomain = IMPACT_COLOR_DOMAIN_FULL,
): string {
  const u = impactToVisualUnit(impact0to10, domain);
  const { r, g, b } = substitutionRiskRgbFromUnit(u);
  const a = alpha * (0.88 + 0.12 * u);
  return `rgba(${r},${g},${b},${a})`;
}

export function impactTileSolid(
  impact0to10: number,
  domain: ImpactColorDomain = IMPACT_COLOR_DOMAIN_FULL,
): string {
  const { r, g, b } = rgbForImpact(impact0to10, domain);
  return `rgb(${r},${g},${b})`;
}

export function impactNeonStroke(
  impact0to10: number,
  alpha: number,
  domain: ImpactColorDomain = IMPACT_COLOR_DOMAIN_FULL,
): string {
  const { r, g, b } = rgbForImpact(impact0to10, domain);
  return `rgba(${r},${g},${b},${alpha})`;
}

export function impactColor(
  impact0to10: number,
  domain: ImpactColorDomain = IMPACT_COLOR_DOMAIN_FULL,
): string {
  return impactTileSolid(impact0to10, domain);
}

export const css = {
  bg: "#06040d",
  bg2: "#0f0a18",
  border: "rgba(255, 200, 120, 0.22)",
  text: "#f2fbff",
  muted: "#9bb4c8",
  accent: "#4cf5ff",
  accentHot: "#ff3b4a",
} as const;
