import { hierarchy, treemap, treemapSquarify } from "d3-hierarchy";
import type { HierarchyRectangularNode } from "d3-hierarchy";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { IndustrySector, JobOccupation } from "@/core/types";
import {
  aiHumanEfficiencyRatio,
  computeAiStaffingBreakdown,
  formatAiHumanEfficiencyRatio,
} from "@/core/aiStaffing";
import { LABOR_BALANCE_SCENARIO_YEAR } from "@/core/laborForce";
import { GOLDEN_RATIO } from "@/core/treemapLayout";
import {
  type ImpactColorDomain,
  computeImpactColorDomain,
  impactNeonStroke,
  impactTileFill,
  impactTileSolid,
  impactToVisualUnit,
  css,
} from "@/config/theme";
import { FONT_UI_STACK } from "@/config/typography";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { fitTileLabel } from "./tileLabelFit";
import { TileSvgLabels } from "./TileSvgLabels";

interface TreeNode {
  name: string;
  job?: JobOccupation;
  /** 布局权重（斐波那契整数，非就业人数） */
  layoutValue?: number;
  children?: TreeNode[];
}

const SECTOR_LABEL: Record<IndustrySector, string> = {
  primary: "第一产业",
  secondary: "第二产业",
  tertiary: "第三产业",
};

interface TreemapLayoutResult {
  tiles: TileLayout[];
}

const TILE_INSET = 0.55;
const TILE_RX = 2;

function buildTree(jobs: JobOccupation[]): TreeNode {
  const bySector = new Map<IndustrySector, JobOccupation[]>();
  for (const s of ["primary", "secondary", "tertiary"] as IndustrySector[]) {
    bySector.set(s, []);
  }
  for (const j of jobs) {
    bySector.get(j.sector)?.push(j);
  }
  const children: TreeNode[] = [];
  for (const [sector, list] of bySector) {
    if (list.length === 0) continue;
    const sorted = [...list].sort((a, b) => b.employment - a.employment);
    children.push({
      name: SECTOR_LABEL[sector],
      children: sorted.map((j) => ({
        name: j.title,
        job: j,
        // 块面积 ∝ 就业人数（万人），一条职业一块
        layoutValue: Math.max(0.1, j.employment),
      })),
    });
  }
  return { name: "root", children };
}

type TreemapNode = HierarchyRectangularNode<TreeNode>;

interface TileLayout {
  d: TreemapNode;
  job: JobOccupation;
  rw: number;
  rh: number;
  g: number;
  clipId: string;
  showText: boolean;
  /** 是否显示「x/10」压力行 */
  showScoreLine: boolean;
  /** 是否显示就业人数�?*/
  showEmpLine: boolean;
  fontSize: number;
  metaSize: number;
  titleLineTexts: string[];
  padPx: number;
  centerContent: boolean;
}

function buildTileLayouts(nodes: TreemapNode[], mobile: boolean): TileLayout[] {
  const out: TileLayout[] = [];
  let idx = 0;
  for (const d of nodes) {
    const job = d.data.job!;
    const w = d.x1 - d.x0;
    const rectH = d.y1 - d.y0;
    if (w <= 0 || rectH <= 0) continue;
    const tiny = w < 8 || rectH < 8;
    const g = tiny ? 0 : mobile ? TILE_INSET * 0.85 : TILE_INSET;
    const rw = Math.max(0, w - 2 * g);
    const rh = Math.max(0, rectH - 2 * g);
    if (rw <= 0 || rh <= 0) continue;
    const label = fitTileLabel(job.title, rw, rh, mobile);
    const safe = job.id.replace(/[^a-zA-Z0-9_-]/g, "_");
    out.push({
      d,
      job,
      rw,
      rh,
      g,
      clipId: `cp-${idx}-${safe}`,
      showText: label.showText,
      showScoreLine: label.showScoreLine,
      showEmpLine: label.showEmpLine,
      fontSize: label.fontSize,
      metaSize: label.metaSize,
      titleLineTexts: label.titleLineTexts,
      padPx: label.padPx,
      centerContent: label.centerContent,
    });
    idx += 1;
  }
  return out;
}

export function JobTreemap({
  jobs,
  width,
  height,
  employmentUnit = "10k",
  mobile = false,
}: {
  jobs: JobOccupation[];
  width: number;
  height: number;
  employmentUnit?: "10k" | "person";
  mobile?: boolean;
}) {
  const isCoarse = useMediaQuery("(hover: none) and (pointer: coarse)");
  const clickOnly = mobile || isCoarse;

  const [tip, setTip] = useState<{
    x: number;
    y: number;
    job: JobOccupation;
  } | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const colorDomain = useMemo(
    () => computeImpactColorDomain(jobs.map((j) => j.aiImpact)),
    [jobs],
  );

  const layoutResult = useMemo((): TreemapLayoutResult => {
    if (width <= 0 || height <= 0) return { tiles: [] };

    const rootData = buildTree(jobs);
    const h = hierarchy(rootData)
      .sum((d: TreeNode) => (d.layoutValue ?? 0) || 0)
      .sort((a, b) => (b.value ?? 0) - (a.value ?? 0));

    const layout = treemap<TreeNode>()
      .tile(treemapSquarify.ratio(GOLDEN_RATIO))
      .size([width, height])
      .paddingOuter(mobile ? 4 : 6)
      .paddingTop(mobile ? 8 : 10)
      .paddingInner(mobile ? 2.2 : 1.5)
      .round(true);

    const treeRoot = layout(h) as TreemapNode;
    const nodes = treeRoot.descendants().filter((d) => d.data.job != null) as TreemapNode[];
    return { tiles: buildTileLayouts(nodes, mobile) };
  }, [jobs, width, height, mobile]);

  const tileList = layoutResult.tiles;

  const openTip = (clientX: number, clientY: number, job: JobOccupation) => {
    setHoveredId(job.id);
    setTip({ x: clientX, y: clientY, job });
  };

  const closeTip = () => {
    setHoveredId(null);
    setTip(null);
  };

  const toggleTip = (clientX: number, clientY: number, job: JobOccupation) => {
    if (tip?.job.id === job.id) {
      closeTip();
      return;
    }
    openTip(clientX, clientY, job);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeTip();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!mobile || !tip) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobile, tip]);

  const activeId = clickOnly ? (tip?.job.id ?? null) : hoveredId;

  return (
    <div
      className="job-treemap-cyber"
      style={{ position: "relative", width, height, flexShrink: 0 }}
      onClick={clickOnly ? undefined : closeTip}
    >
      {tip && mobile ? (
        <button
          type="button"
          className="job-treemap-backdrop"
          aria-label="关闭详情"
          onClick={closeTip}
        />
      ) : null}
      <svg width={width} height={height} role="img" aria-label="职业 Treemap">
        <defs>
          <filter id="tile-glow-strong" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          {tileList.map((t) => (
            <clipPath key={t.clipId} id={t.clipId}>
              <rect width={t.rw} height={t.rh} rx={TILE_RX} ry={TILE_RX} />
            </clipPath>
          ))}
        </defs>
        <rect width={width} height={height} fill={css.bg} rx={0} />
        {tileList.map((t) => {
          const {
            d,
            job,
            rw,
            rh,
            g,
            clipId,
            showText,
            showScoreLine,
            showEmpLine,
            fontSize,
            metaSize,
            titleLineTexts,
            padPx,
            centerContent,
          } = t;
          const hovered = activeId === job.id;
          const fillA = hovered ? 0.82 : 0.55;
          const fill = impactTileFill(job.aiImpact, fillA, colorDomain);
          const edge = impactNeonStroke(job.aiImpact, hovered ? 0.95 : 0.38, colorDomain);
          const filterId = hovered ? "url(#tile-glow-strong)" : undefined;
          const scoreText = `${job.aiImpact.toFixed(1)}/10`;
          const empText =
            employmentUnit === "person"
              ? `${Math.round(job.employment).toLocaleString("zh-CN")}人`
              : `${job.employment}万人`;
          return (
            <g
              key={job.id}
              transform={`translate(${d.x0 + g},${d.y0 + g})`}
              onMouseEnter={
                clickOnly
                  ? undefined
                  : (e) => {
                      setHoveredId(job.id);
                      openTip(e.clientX, e.clientY, job);
                    }
              }
              onMouseMove={
                clickOnly
                  ? undefined
                  : (e) =>
                      setTip((tipPrev) =>
                        tipPrev && tipPrev.job.id === job.id
                          ? { ...tipPrev, x: e.clientX, y: e.clientY }
                          : tipPrev,
                      )
              }
              onMouseLeave={
                clickOnly
                  ? undefined
                  : () => {
                      setHoveredId((id) => (id === job.id ? null : id));
                      setTip((tipPrev) => (tipPrev?.job.id === job.id ? null : tipPrev));
                    }
              }
              onClick={(e) => {
                e.stopPropagation();
                toggleTip(e.clientX, e.clientY, job);
              }}
            >
              <rect
                width={rw}
                height={rh}
                rx={TILE_RX}
                ry={TILE_RX}
                fill={fill}
                stroke={edge}
                strokeWidth={hovered ? 1.75 : 0.65}
                filter={filterId}
              />
              {showText || showScoreLine ? (
                <g clipPath={`url(#${clipId})`} pointerEvents="none">
                  <TileSvgLabels
                    rh={rh}
                    fit={{
                      showText,
                      showScoreLine,
                      showEmpLine,
                      fontSize,
                      metaSize,
                      titleLineTexts,
                      padPx,
                      centerContent,
                    }}
                    scoreText={scoreText}
                    empText={empText}
                    efficiencyText={
                      hovered && showScoreLine && !clickOnly
                        ? `AI∶人工 ${(
                            job.aiLaborStaffing?.[LABOR_BALANCE_SCENARIO_YEAR]?.productivityGap ??
                            aiHumanEfficiencyRatio(job, LABOR_BALANCE_SCENARIO_YEAR)
                          ).toFixed(2)} 倍`
                        : undefined
                    }
                    hovered={hovered}
                  />
                </g>
              ) : null}
            </g>
          );
        })}
        <text
          x={width - 10}
          y={height - 8}
          textAnchor="end"
          fill="rgba(160, 175, 200, 0.42)"
          fontSize={9}
          fontWeight={300}
          letterSpacing="0.06em"
          style={{ fontFamily: FONT_UI_STACK }}
          pointerEvents="none"
        >
          {mobile
            ? `共 ${jobs.length} 个职业 · 块面积≈就业（万人）`
            : `共 ${jobs.length} 个职业 · 块面积≈就业人数（万人）· 颜色=综合替代压力`}
        </text>
      </svg>
      {tip ? (
        <Tooltip
          anchor={tip}
          employmentUnit={employmentUnit}
          colorDomain={colorDomain}
          onClose={closeTip}
          sheetMode={mobile}
        />
      ) : null}
    </div>
  );
}

const TOOLTIP_GAP = 14;
const VIEWPORT_MARGIN = 12;

function clampTooltipPosition(
  anchorX: number,
  anchorY: number,
  width: number,
  height: number,
): { left: number; top: number } {
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  let left = anchorX + TOOLTIP_GAP;
  let top = anchorY + TOOLTIP_GAP;

  if (left + width > vw - VIEWPORT_MARGIN) {
    left = anchorX - width - TOOLTIP_GAP;
  }
  if (top + height > vh - VIEWPORT_MARGIN) {
    top = anchorY - height - TOOLTIP_GAP;
  }

  left = Math.max(VIEWPORT_MARGIN, Math.min(left, vw - VIEWPORT_MARGIN - width));
  top = Math.max(VIEWPORT_MARGIN, Math.min(top, vh - VIEWPORT_MARGIN - height));

  return { left, top };
}

function Tooltip({
  anchor,
  employmentUnit,
  colorDomain,
  onClose,
  sheetMode,
}: {
  anchor: { x: number; y: number; job: JobOccupation };
  employmentUnit: "10k" | "person";
  colorDomain: ImpactColorDomain;
  onClose: () => void;
  sheetMode: boolean;
}) {
  const { job, x, y } = anchor;
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState(() => ({ left: x + TOOLTIP_GAP, top: y + TOOLTIP_GAP }));
  const [visible, setVisible] = useState(false);

  const maxWidth =
    typeof window !== "undefined" ? Math.min(320, window.innerWidth - VIEWPORT_MARGIN * 2) : 320;

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (sheetMode) {
      setVisible(true);
      return;
    }
    const { width, height } = el.getBoundingClientRect();
    setPos(clampTooltipPosition(x, y, width, height));
    setVisible(true);
  }, [x, y, job.id, maxWidth, sheetMode]);

  const staffing = computeAiStaffingBreakdown(job, LABOR_BALANCE_SCENARIO_YEAR);
  const empText =
    employmentUnit === "person"
      ? `${Math.round(job.employment).toLocaleString("zh-CN")} 人`
      : `${job.employment} 万人`;
  const withAiEmp =
    employmentUnit === "person"
      ? Math.round(job.employment * staffing.assistedRatio)
      : Math.round(job.employment * staffing.assistedRatio * 10) / 10;
  const replacedEmp =
    employmentUnit === "person"
      ? Math.round(job.employment * staffing.replacedRatio)
      : Math.round(job.employment * staffing.replacedRatio * 10) / 10;
  const withAiText =
    employmentUnit === "person"
      ? `${withAiEmp.toLocaleString("zh-CN")} 人`
      : `${withAiEmp} 万人`;
  const replacedText =
    employmentUnit === "person"
      ? `${replacedEmp.toLocaleString("zh-CN")} 人`
      : `${replacedEmp} 万人`;
  const barColor = impactTileSolid(job.aiImpact, colorDomain);
  const pct = impactToVisualUnit(job.aiImpact, colorDomain) * 100;
  const efficiency = formatAiHumanEfficiencyRatio(
    staffing.productivityGap,
    LABOR_BALANCE_SCENARIO_YEAR,
  );

  return (
    <div
      ref={ref}
      className={
        sheetMode ? "job-treemap-tooltip job-treemap-tooltip--sheet" : "job-treemap-tooltip"
      }
      role="dialog"
      aria-label={`${job.title} 详情`}
      onClick={(e) => e.stopPropagation()}
      style={{
        position: "fixed",
        ...(sheetMode
          ? {}
          : { left: pos.left, top: pos.top, minWidth: 220, maxWidth }),
        zIndex: 20,
        visibility: visible ? "visible" : "hidden",
        padding: "12px 14px",
        borderRadius: 10,
        background: "linear-gradient(145deg, rgba(15,10,24,0.98), rgba(8,6,18,0.98))",
        border: `1px solid ${impactNeonStroke(job.aiImpact, 0.45, colorDomain)}`,
        color: css.text,
        fontSize: 13,
        lineHeight: 1.55,
        fontFamily: FONT_UI_STACK,
        boxShadow: `0 0 0 1px rgba(0,0,0,0.5), 0 12px 40px rgba(0,0,0,0.65), 0 0 28px ${impactNeonStroke(job.aiImpact, 0.22, colorDomain)}`,
      }}
    >
      <button
        type="button"
        className="job-treemap-tooltip__close"
        aria-label="关闭"
        onClick={onClose}
      >
        ×
      </button>
      <div
        style={{
          fontWeight: 700,
          fontSize: 14,
          marginBottom: 6,
          color: "#fff",
          letterSpacing: "0.02em",
          paddingRight: 20,
        }}
      >
        {job.title}
      </div>
      {job.industryLabel ? (
        <div style={{ fontSize: 11, color: css.muted, marginBottom: 8 }}>{job.industryLabel}</div>
      ) : null}
      <div style={{ marginBottom: 10 }}>
        <span style={{ color: barColor, fontWeight: 700, fontSize: 13 }}>
          综合替代压力 {job.aiImpact.toFixed(1)}/10
        </span>
        <div
          style={{
            marginTop: 6,
            height: 4,
            borderRadius: 2,
            overflow: "hidden",
            background: "rgba(0,0,0,0.4)",
          }}
        >
          <div style={{ height: "100%", width: `${pct}%`, background: barColor }} />
        </div>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "auto 1fr",
          gap: "6px 12px",
          fontSize: 12,
          lineHeight: 1.45,
        }}
      >
        <span style={{ color: css.muted }}>样本就业</span>
        <span style={{ textAlign: "right" }}>{empText}</span>
        <span style={{ color: css.muted }}>{LABOR_BALANCE_SCENARIO_YEAR} 无 AI</span>
        <span style={{ textAlign: "right" }}>{empText}</span>
        <span style={{ color: css.muted }}>{LABOR_BALANCE_SCENARIO_YEAR} AI 后</span>
        <span style={{ textAlign: "right" }}>{withAiText}</span>
        <span style={{ color: css.muted }}>可替代差额</span>
        <span style={{ textAlign: "right", color: "#e8b090" }}>{replacedText}</span>
        <span style={{ color: css.muted }}>自动化∶人工</span>
        <span style={{ textAlign: "right", color: "#8fd4c4" }}>{efficiency.ratioText}</span>
      </div>
      <div
        style={{ marginTop: 10, fontSize: 10, color: "rgba(130, 150, 170, 0.8)", lineHeight: 1.4 }}
      >
        {LABOR_BALANCE_SCENARIO_YEAR} 示意 · 块面积为布局权重
      </div>
    </div>
  );
}
