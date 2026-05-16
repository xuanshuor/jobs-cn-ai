import type { AssessmentResult } from "./types";

const LOGICAL_W = 750;
/** 2× 约 1500px 宽，兼顾清晰度与内存（3× PNG 编码易致标签页崩溃） */
const EXPORT_SCALE = 2;
/** 超过该像素数时自动再降一档 scale */
const MAX_CANVAS_PIXELS = 12_000_000;
const PAD = 44;
const INNER_W = LOGICAL_W - PAD * 2;
const CONTENT_X = PAD + 24;

const FONT_FAMILY = '"Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif';
const LINE_HEIGHT = 1.5;

const COLORS = {
  bg0: "#120a1c",
  bg1: "#0c0814",
  bg2: "#06040d",
  text: "#e8f7ff",
  muted: "#8b97ad",
  label: "#9eb0c8",
  accent: "#8fd4c4",
  gold: "#f0c674",
  border: "rgba(255, 200, 120, 0.28)",
  card: "rgba(18, 12, 32, 0.92)",
};

async function loadShareFonts(): Promise<void> {
  if (typeof document === "undefined") return;
  try {
    await Promise.all([
      document.fonts.load(`400 16px ${FONT_FAMILY}`),
      document.fonts.load(`500 16px ${FONT_FAMILY}`),
      document.fonts.load(`600 16px ${FONT_FAMILY}`),
      document.fonts.load(`700 16px ${FONT_FAMILY}`),
    ]);
    await document.fonts.ready;
  } catch {
    /* ignore */
  }
}

function lineH(size: number): number {
  return Math.ceil(size * LINE_HEIGHT);
}

function setFont(ctx: CanvasRenderingContext2D, weight: number, size: number): void {
  ctx.font = `${weight} ${size}px ${FONT_FAMILY}`;
}

/** 顶对齐绘制，返回下一行 y */
function drawTop(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  weight: number,
  size: number,
  color: string,
): number {
  setFont(ctx, weight, size);
  ctx.fillStyle = color;
  ctx.textBaseline = "top";
  ctx.fillText(text, x, y);
  ctx.textBaseline = "alphabetic";
  return y + lineH(size);
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number,
): string[] {
  const lines: string[] = [];
  let line = "";
  for (const ch of text) {
    const test = line + ch;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = ch;
      if (lines.length >= maxLines) break;
    } else {
      line = test;
    }
  }
  if (line && lines.length < maxLines) lines.push(line);

  if (lines.length === 0) return [];

  const lastIdx = lines.length - 1;
  let last = lines[lastIdx] ?? "";
  let guard = 0;
  while (last.length > 1 && ctx.measureText(`${last}…`).width > maxWidth && guard++ < 4096) {
    last = last.slice(0, -1);
  }
  const truncated = line.length > 0 && lines.length >= maxLines;
  if (truncated || ctx.measureText(last).width > maxWidth) {
    last = last.length > 0 ? `${last}…` : "…";
  }
  lines[lastIdx] = last;
  return lines;
}

/** 分享图内展示的短链接（完整链接仍用「复制链接」） */
export function displayShareUrlForImage(shareUrl: string): string {
  try {
    const u = new URL(shareUrl);
    const token = u.searchParams.get("share");
    if (token && token.length > 48) {
      return `${u.origin}${u.pathname}?share=…（完整链接请点「复制链接」）`;
    }
    if (shareUrl.length > 160) {
      return `${u.origin}${u.pathname}?share=…`;
    }
  } catch {
    /* ignore */
  }
  if (shareUrl.length > 160) return `${shareUrl.slice(0, 120)}…`;
  return shareUrl;
}

function drawParagraph(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  size: number,
  color: string,
  maxLines: number,
): number {
  setFont(ctx, 400, size);
  const lines = wrapText(ctx, text, maxWidth, maxLines);
  let cy = y;
  for (const ln of lines) {
    cy = drawTop(ctx, ln, x, cy, 400, size, color);
    cy += Math.ceil(size * 0.2);
  }
  return cy;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function drawCardBg(
  ctx: CanvasRenderingContext2D,
  y: number,
  h: number,
  accent?: string,
): void {
  roundRect(ctx, PAD, y, INNER_W, h, 16);
  ctx.fillStyle = COLORS.card;
  ctx.fill();
  ctx.strokeStyle = accent ?? COLORS.border;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  if (accent) {
    roundRect(ctx, PAD, y, INNER_W, 4, 16);
    ctx.fillStyle = accent;
    ctx.fill();
  }
}

function riskColor(pct: number): string {
  if (pct >= 70) return "#ff6b4a";
  if (pct >= 45) return "#f0c674";
  return "#4cf5ff";
}

function measureRiskCard(ctx: CanvasRenderingContext2D, result: AssessmentResult): number {
  let h = 36 + lineH(14) + 16;
  h += lineH(72) + 12 + lineH(26);
  h += 16 + 10 + 16;
  setFont(ctx, 400, 15);
  h += wrapText(ctx, result.replacementSummary, INNER_W - 48, 4).length * (lineH(15) + 4);
  h += 12;
  setFont(ctx, 400, 13);
  const ref = `参照样本：${result.matchedRoleTitle}（${result.benchmarkImpact.toFixed(1)}/10）`;
  h += wrapText(ctx, ref, INNER_W - 48, 2).length * (lineH(13) + 4);
  return h + 28;
}

function measurePersonalityCard(ctx: CanvasRenderingContext2D, result: AssessmentResult): number {
  let h = 36 + lineH(14) + 20;
  h += lineH(48) + 12 + lineH(16);
  h += 20;
  const traits = result.personalityTraits.slice(0, 5);
  setFont(ctx, 500, 13);
  let rowW = 0;
  let rows = 1;
  for (const t of traits) {
    const tw = ctx.measureText(t).width + 28;
    if (rowW + tw > INNER_W - 48) {
      rows++;
      rowW = tw;
    } else {
      rowW += tw + 10;
    }
  }
  h += rows * 36;
  return h + 28;
}

function measureIndustryRow(ctx: CanvasRenderingContext2D, reason: string): number {
  let h = 18 + lineH(17) + 8 + lineH(13) + 10;
  setFont(ctx, 400, 14);
  h += wrapText(ctx, reason, INNER_W - 100, 2).length * (lineH(14) + 6);
  return h + 16;
}

function measureIndustryCard(
  ctx: CanvasRenderingContext2D,
  result: AssessmentResult,
): number {
  const industries = result.recommendedIndustries.slice(0, 5);
  let h = 36 + lineH(14) + 20;
  for (const ind of industries) {
    h += measureIndustryRow(ctx, ind.reason) + 12;
  }
  return h + 16;
}

function measureFooter(ctx: CanvasRenderingContext2D, shareUrl: string): number {
  let h = 32 + lineH(13) + 20;
  setFont(ctx, 400, 12);
  const lines = wrapText(ctx, shareUrl, INNER_W - 64, 3);
  h += 16 + lines.length * (lineH(12) + 6) + 16;
  return h + 56;
}

function measureTotalHeight(result: AssessmentResult, shareUrl: string): number {
  const ctx = document.createElement("canvas").getContext("2d")!;
  return (
    PAD +
    100 +
    24 +
    measureRiskCard(ctx, result) +
    20 +
    measurePersonalityCard(ctx, result) +
    20 +
    measureIndustryCard(ctx, result) +
    20 +
    measureFooter(ctx, shareUrl) +
    PAD
  );
}

function drawCentered(
  ctx: CanvasRenderingContext2D,
  text: string,
  y: number,
  weight: number,
  size: number,
  color: string,
): number {
  setFont(ctx, weight, size);
  const x = (LOGICAL_W - ctx.measureText(text).width) / 2;
  return drawTop(ctx, text, x, y, weight, size, color);
}

function drawHeader(ctx: CanvasRenderingContext2D, y: number): number {
  let cy = y + 8;
  cy = drawCentered(ctx, "职业与 AI 替代风险测评", cy, 600, 15, COLORS.accent);
  cy += 14;
  cy = drawCentered(ctx, "2030 示意 · 个人测评报告", cy, 700, 26, COLORS.text);
  cy += 12;
  cy = drawCentered(ctx, "中国就业市场 AI 影响分析", cy, 400, 13, COLORS.muted);
  return y + 100;
}

function drawRiskCard(ctx: CanvasRenderingContext2D, y: number, result: AssessmentResult): number {
  const cardH = measureRiskCard(ctx, result);
  const top = y;
  drawCardBg(ctx, top, cardH, riskColor(result.replacementRiskPct));

  let cy = top + 28;
  cy = drawTop(ctx, "职业被 AI 替代可能性", CONTENT_X, cy, 600, 14, COLORS.label);
  cy += 20;

  const rc = riskColor(result.replacementRiskPct);
  const pctStr = `${result.replacementRiskPct}%`;
  cy = drawTop(ctx, pctStr, CONTENT_X, cy, 700, 72, rc);
  cy += 12;
  cy = drawTop(ctx, `${result.replacementLevel}风险`, CONTENT_X, cy, 600, 26, "#c9a080");
  cy += 20;

  const barX = CONTENT_X;
  const barW = INNER_W - 48;
  const barH = 10;
  roundRect(ctx, barX, cy, barW, barH, 5);
  ctx.fillStyle = "rgba(0,0,0,0.45)";
  ctx.fill();
  const fillW = Math.max(4, barW * (result.replacementRiskPct / 100));
  roundRect(ctx, barX, cy, fillW, barH, 5);
  ctx.fillStyle = rc;
  ctx.fill();
  cy += barH + 20;

  cy = drawParagraph(ctx, result.replacementSummary, CONTENT_X, cy, INNER_W - 48, 15, "rgba(210,220,235,0.95)", 4);
  cy += 12;
  const ref = `参照样本：${result.matchedRoleTitle}（综合压力 ${result.benchmarkImpact.toFixed(1)}/10）`;
  cy = drawParagraph(ctx, ref, CONTENT_X, cy, INNER_W - 48, 13, COLORS.muted, 2);

  return top + cardH;
}

function drawPersonalityCard(
  ctx: CanvasRenderingContext2D,
  y: number,
  result: AssessmentResult,
): number {
  const cardH = measurePersonalityCard(ctx, result);
  const top = y;
  drawCardBg(ctx, top, cardH, "rgba(76, 245, 255, 0.45)");

  let cy = top + 28;
  cy = drawTop(ctx, "人格类型", CONTENT_X, cy, 600, 14, COLORS.label);
  cy += 20;
  cy = drawTop(ctx, result.personalityType, CONTENT_X, cy, 700, 48, "#4cf5ff");
  cy += 12;
  cy = drawTop(ctx, result.personalitySubtitle, CONTENT_X, cy, 500, 16, COLORS.muted);
  cy += 20;

  let tx = CONTENT_X;
  const maxX = PAD + INNER_W - 24;
  for (const trait of result.personalityTraits.slice(0, 5)) {
    setFont(ctx, 500, 13);
    const tw = ctx.measureText(trait).width + 24;
    if (tx + tw > maxX) {
      tx = CONTENT_X;
      cy += 38;
    }
    const pillH = 30;
    roundRect(ctx, tx, cy, tw, pillH, 15);
    ctx.fillStyle = "rgba(76, 245, 255, 0.12)";
    ctx.fill();
    ctx.strokeStyle = "rgba(76, 245, 255, 0.35)";
    ctx.lineWidth = 1;
    ctx.stroke();
    drawTop(ctx, trait, tx + 12, cy + 7, 500, 13, "#b8e8ff");
    tx += tw + 10;
  }

  return top + cardH;
}

function drawIndustryCard(
  ctx: CanvasRenderingContext2D,
  y: number,
  result: AssessmentResult,
): number {
  const industries = result.recommendedIndustries.slice(0, 5);
  const cardH = measureIndustryCard(ctx, result);
  const top = y;
  drawCardBg(ctx, top, cardH, "rgba(240, 198, 116, 0.35)");

  let cy = top + 28;
  cy = drawTop(ctx, "建议关注的行业方向", CONTENT_X, cy, 600, 14, COLORS.label);
  cy += 16;

  for (let i = 0; i < industries.length; i++) {
    const ind = industries[i]!;
    const rowH = measureIndustryRow(ctx, ind.reason);
    const rowY = cy;
    roundRect(ctx, PAD + 20, rowY, INNER_W - 40, rowH, 10);
    ctx.fillStyle = "rgba(0, 0, 0, 0.28)";
    ctx.fill();

    const badgeY = rowY + 16;
    roundRect(ctx, PAD + 28, badgeY, 28, 28, 8);
    ctx.fillStyle = "rgba(240, 198, 116, 0.22)";
    ctx.fill();
    ctx.textAlign = "center";
    drawTop(ctx, String(i + 1), PAD + 42, badgeY + 6, 700, 14, COLORS.gold);
    ctx.textAlign = "left";

    const textX = PAD + 68;
    let ty = rowY + 16;
    ty = drawTop(ctx, ind.industryLabel, textX, ty, 700, 17, COLORS.text);
    ty += 8;
    ty = drawTop(ctx, `行业均值替代约 ${ind.avgReplacementRisk}%`, textX, ty, 500, 13, COLORS.muted);
    ty += 10;
    drawParagraph(ctx, ind.reason, textX, ty, INNER_W - 100, 14, "rgba(200,215,235,0.9)", 2);

    cy = rowY + rowH + 12;
  }

  return top + cardH;
}

function drawFooter(ctx: CanvasRenderingContext2D, y: number, shareUrl: string): number {
  const cardH = measureFooter(ctx, shareUrl);
  const top = y;
  drawCardBg(ctx, top, cardH);

  let cy = top + 28;
  cy = drawTop(ctx, "打开链接查看完整结果", CONTENT_X, cy, 500, 13, COLORS.muted);
  cy += 16;

  setFont(ctx, 400, 12);
  const urlLines = wrapText(ctx, shareUrl, INNER_W - 64, 3);
  const boxH = 16 + urlLines.length * (lineH(12) + 6);
  roundRect(ctx, PAD + 20, cy, INNER_W - 40, boxH, 8);
  ctx.fillStyle = "rgba(76, 245, 255, 0.08)";
  ctx.fill();

  let uy = cy + 12;
  for (const line of urlLines) {
    uy = drawTop(ctx, line, PAD + 32, uy, 400, 12, COLORS.accent);
    uy += 6;
  }

  drawCentered(ctx, "数值为研究用示意 · 非官方预测", top + cardH + 24, 400, 11, "rgba(130,150,170,0.85)");

  return top + cardH + 40;
}

function paintBackground(ctx: CanvasRenderingContext2D, height: number): void {
  const bg = ctx.createLinearGradient(0, 0, 0, height);
  bg.addColorStop(0, COLORS.bg0);
  bg.addColorStop(0.45, COLORS.bg1);
  bg.addColorStop(1, COLORS.bg2);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, LOGICAL_W, height);

  const glow = ctx.createRadialGradient(LOGICAL_W * 0.8, 80, 0, LOGICAL_W * 0.8, 80, 280);
  glow.addColorStop(0, "rgba(255, 107, 74, 0.12)");
  glow.addColorStop(1, "transparent");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, LOGICAL_W, height);
}

function resolveExportScale(logicalH: number): number {
  let scale = EXPORT_SCALE;
  while (LOGICAL_W * scale * logicalH * scale > MAX_CANVAS_PIXELS && scale > 1) {
    scale -= 1;
  }
  return scale;
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("图片生成失败"));
      },
      "image/png",
    );
  });
}

export async function renderAssessmentShareImage(
  result: AssessmentResult,
  shareUrl: string,
): Promise<Blob> {
  await loadShareFonts();

  const urlForImage = displayShareUrlForImage(shareUrl);
  const logicalH = measureTotalHeight(result, urlForImage);
  const exportScale = resolveExportScale(logicalH);

  const canvas = document.createElement("canvas");
  canvas.width = LOGICAL_W * exportScale;
  canvas.height = logicalH * exportScale;

  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) throw new Error("无法创建画布");

  ctx.scale(exportScale, exportScale);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  paintBackground(ctx, logicalH);

  let y = PAD;
  y = drawHeader(ctx, y);
  y += 24;
  y = drawRiskCard(ctx, y, result);
  y += 20;
  y = drawPersonalityCard(ctx, y, result);
  y += 20;
  y = drawIndustryCard(ctx, y, result);
  y += 20;
  drawFooter(ctx, y, urlForImage);

  // 让出主线程，避免长时间同步绘制后直接 toBlob 卡死
  await new Promise<void>((r) => {
    requestAnimationFrame(() => r());
  });

  return canvasToBlob(canvas);
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
