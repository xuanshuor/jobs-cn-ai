from pathlib import Path

p = Path(__file__).resolve().parents[1] / "src/components/treemap/JobTreemap.tsx"
text = p.read_text(encoding="utf-8")

old_interface = """interface TileLayout {
  d: TreemapNode;
  job: JobOccupation;
  rw: number;
  rh: number;
  g: number;
  clipId: string;
  showText: boolean;
  /** 是否显示「x/10」压力行 */
  showScoreLine: boolean;
  /** 是否显示就业人数?*/
  showEmpLine: boolean;
  fontSize: number;
  metaSize: number;
}

function buildTileLayouts(nodes: TreemapNode[], mobile: boolean): TileLayout[] {
  const out: TileLayout[] = [];
  let idx = 0;
  for (const d of nodes) {
    const job = d.data.job!;
    const w = d.x1 - d.x0;
    const rectH = d.y1 - d.y0;
    if (w < 2 || rectH < 2) continue;
    const g = mobile ? TILE_INSET * 0.85 : TILE_INSET;
    const rw = Math.max(0, w - 2 * g);
    const rh = Math.max(0, rectH - 2 * g);
    if (rw < 1 || rh < 1) continue;
    const showText = mobile ? rw > 22 && rh > 11 : rw > 38 && rh > 16;
    const showScoreLine = mobile ? rh >= 16 && rw >= 28 : rh >= 21 && rw >= 40;
    const showEmpLine = mobile ? rh >= 20 && rw >= 30 : rh >= 27 && rw >= 44;
    const fontSize = Math.min(12.5, Math.max(7.5, Math.min(rw / 10.5, rh / 3.6)));
    const metaSize = Math.max(7, Math.round((fontSize - 1.25) * 10) / 10);
    const safe = job.id.replace(/[^a-zA-Z0-9_-]/g, "_");
    out.push({
      d,
      job,
      rw,
      rh,
      g,
      clipId: `cp-${idx}-${safe}`,
      showText,
      showScoreLine,
      showEmpLine,
      fontSize,
      metaSize,
    });
    idx += 1;
  }
  return out;
}"""

new_block = Path(__file__).read_text(encoding="utf-8").split('NEW_BLOCK = """')[1].split('"""')[0]
# read new_block from this file's string below
NEW = r'''
interface TileLayout {
  d: TreemapNode;
  job: JobOccupation;
  rw: number;
  rh: number;
  g: number;
  clipId: string;
  showText: boolean;
  showScoreLine: boolean;
  showEmpLine: boolean;
  fontSize: number;
  metaSize: number;
  titleLines: number;
  displayTitle: string;
  padPx: number;
  centerContent: boolean;
}

function truncateTitle(title: string, maxChars: number): string {
  if (maxChars <= 0) return "";
  if (title.length <= maxChars) return title;
  if (maxChars <= 1) return title.slice(0, 1);
  return `${title.slice(0, maxChars - 1)}…`;
}

interface TileLabelFit {
  showText: boolean;
  showScoreLine: boolean;
  showEmpLine: boolean;
  fontSize: number;
  metaSize: number;
  titleLines: number;
  displayTitle: string;
  padPx: number;
  centerContent: boolean;
}

function fitTileLabel(title: string, rw: number, rh: number, mobile: boolean): TileLabelFit {
  const padPx = mobile ? 2 : 4;
  const innerW = Math.max(1, rw - padPx * 2);
  const innerH = Math.max(1, rh - padPx * 2);

  if (!mobile) {
    const showText = rw > 38 && rh > 16;
    const fontSize = Math.min(12.5, Math.max(7.5, Math.min(rw / 10.5, rh / 3.6)));
    const metaSize = Math.max(7, Math.round((fontSize - 1.25) * 10) / 10);
    const showScoreLine = rh >= 21 && rw >= 40;
    const showEmpLine = rh >= 27 && rw >= 44;
    const titleLines = showScoreLine ? 2 : 3;
    const maxChars = Math.max(4, Math.floor(innerW / (fontSize * 0.52)) * titleLines);
    return {
      showText,
      showScoreLine,
      showEmpLine,
      fontSize,
      metaSize,
      titleLines,
      displayTitle: truncateTitle(title, maxChars),
      padPx,
      centerContent: false,
    };
  }

  if (innerW < 12 || innerH < 9) {
    return {
      showText: false,
      showScoreLine: innerW >= 14 && innerH >= 10,
      showEmpLine: false,
      fontSize: 7,
      metaSize: 6.5,
      titleLines: 0,
      displayTitle: "",
      padPx,
      centerContent: true,
    };
  }

  const lineHeight = 1.26;

  if (innerW < 20 || innerH < 13) {
    const fontSize = Math.max(6, Math.min(8.5, innerH * 0.52, innerW / 3.2));
    const metaSize = Math.max(5.5, fontSize - 0.8);
    const maxChars = Math.max(2, Math.floor(innerW / (fontSize * 0.5)));
    return {
      showText: true,
      showScoreLine: innerH >= 11,
      showEmpLine: false,
      fontSize,
      metaSize,
      titleLines: 1,
      displayTitle: truncateTitle(title, maxChars),
      padPx,
      centerContent: innerH < 16,
    };
  }

  let titleLines = innerH >= 30 ? 3 : innerH >= 20 ? 2 : 1;
  let fontSize = Math.min(11, innerW / 5.4, innerH / (titleLines * lineHeight + 1.15));
  fontSize = Math.max(6.5, Math.round(fontSize * 10) / 10);

  const scoreLineH = fontSize * 0.92;
  const empLineH = fontSize * 0.82;
  let showScoreLine = innerH >= titleLines * fontSize * lineHeight + scoreLineH;
  let showEmpLine =
    showScoreLine && innerW >= 26 && innerH >= titleLines * fontSize * lineHeight + scoreLineH + empLineH + 2;

  let usedH = titleLines * fontSize * lineHeight + (showScoreLine ? scoreLineH : 0) + (showEmpLine ? empLineH : 0);
  while (usedH > innerH + 0.5 && titleLines > 1) {
    titleLines -= 1;
    showEmpLine = false;
    usedH = titleLines * fontSize * lineHeight + (showScoreLine ? scoreLineH : 0);
  }
  if (usedH > innerH + 0.5 && showScoreLine) {
    fontSize = Math.max(6, fontSize - 0.5);
    showEmpLine = false;
  }
  if (usedH > innerH + 0.5) {
    titleLines = 1;
    fontSize = Math.max(6, Math.min(fontSize, innerH / (lineHeight + 0.95)));
    showScoreLine = innerH >= fontSize * lineHeight + fontSize * 0.85;
    showEmpLine = false;
  }

  const metaSize = Math.max(5.5, Math.round((fontSize - 1.1) * 10) / 10);
  const charsPerLine = Math.max(2, Math.floor(innerW / (fontSize * 0.5)));
  const displayTitle = truncateTitle(title, charsPerLine * titleLines);

  return {
    showText: true,
    showScoreLine,
    showEmpLine,
    fontSize,
    metaSize,
    titleLines,
    displayTitle,
    padPx,
    centerContent: false,
  };
}

function buildTileLayouts(nodes: TreemapNode[], mobile: boolean): TileLayout[] {
  const out: TileLayout[] = [];
  let idx = 0;
  for (const d of nodes) {
    const job = d.data.job!;
    const w = d.x1 - d.x0;
    const rectH = d.y1 - d.y0;
    if (w < 2 || rectH < 2) continue;
    const g = mobile ? TILE_INSET * 0.85 : TILE_INSET;
    const rw = Math.max(0, w - 2 * g);
    const rh = Math.max(0, rectH - 2 * g);
    if (rw < 1 || rh < 1) continue;
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
      titleLines: label.titleLines,
      displayTitle: label.displayTitle,
      padPx: label.padPx,
      centerContent: label.centerContent,
    });
    idx += 1;
  }
  return out;
}
'''

import re
text = re.sub(
    r"interface TileLayout \{[\s\S]*?^function buildTileLayouts",
    NEW.strip() + "\n\nfunction buildTileLayouts",
    text,
    count=1,
    flags=re.M,
)

old_fo = """              {showText ? (
                <g clipPath={`url(#${clipId})`} pointerEvents="none">
                  <foreignObject x={0} y={0} width={rw} height={rh}>
                    <motion.div
                      {...({
                        xmlns: "http://www.w3.org/1999/xhtml",
                        style: {
                          width: "100%",
                          height: "100%",
                          boxSizing: "border-box",
                          padding: "2px 4px",
                          display: "flex",
                          flexDirection: "column",
                          justifyContent: "flex-start",
                          rowGap: "0.08em",
                          overflow: "hidden",
                          fontFamily: FONT_UI_STACK,
                        },
                      } as Record<string, unknown>)}
                    >
                      <motion.div
                        style={{
                          flex: showScoreLine ? "1 1 0" : "1 1 auto",
                          minHeight: 0,
                          fontSize: `${fontSize}px`,
                          fontWeight: 100,
                          lineHeight: 1.22,
                          color: hovered ? "#ffffff" : "rgba(248,250,252,0.94)",
                          overflow: "hidden",
                          overflowWrap: "anywhere",
                          wordBreak: "break-word",
                        }}
                      >
                        {job.title}
                      </motion.div>"""

# use regex for foreign object block
fo_pat = r"\{showText \? \(\s*<g clipPath=\{`url\(#\$\{clipId\}\)`\} pointerEvents=\"none\">[\s\S]*?\{job\.title\}\s*</div>"
fo_new = """{showText || showScoreLine ? (
                <g clipPath={`url(#${clipId})`} pointerEvents="none">
                  <foreignObject x={0} y={0} width={rw} height={rh}>
                    <motion.div
                      {...({
                        xmlns: "http://www.w3.org/1999/xhtml",
                        style: {
                          width: "100%",
                          height: "100%",
                          boxSizing: "border-box",
                          padding: `${padPx}px`,
                          display: "flex",
                          flexDirection: "column",
                          justifyContent: centerContent ? "center" : "flex-start",
                          alignItems: "stretch",
                          rowGap: mobile ? "0.06em" : "0.08em",
                          overflow: "hidden",
                          fontFamily: FONT_UI_STACK,
                        },
                      } as Record<string, unknown>)}
                    >
                      {showText && displayTitle ? (
                        <motion.div
                          style={
                            {
                              flex: showScoreLine || showEmpLine ? "1 1 0" : "0 0 auto",
                              minHeight: 0,
                              maxHeight:
                                titleLines > 0 ? `${titleLines * fontSize * 1.28}px` : undefined,
                              fontSize: `${fontSize}px`,
                              fontWeight: mobile ? 400 : 100,
                              lineHeight: 1.28,
                              color: hovered ? "#ffffff" : "rgba(248,250,252,0.94)",
                              overflow: "hidden",
                              overflowWrap: "anywhere",
                              wordBreak: "break-word",
                              display: "-webkit-box",
                              WebkitBoxOrient: "vertical",
                              WebkitLineClamp: titleLines,
                            } as Record<string, unknown>
                          }
                        >
                          {displayTitle}
                        </motion.div>
                      ) : null"""

text2 = re.sub(fo_pat, fo_new, text, count=1)
if text2 == text:
    print("FO replace failed")
else:
    text = text2
    print("FO ok")

# fix score line nowrap on mobile tiny - scale font
text = text.replace(
    """                            whiteSpace: "nowrap",
                          }}
                        >
                          {scoreText}""",
    """                            whiteSpace: mobile && rw < 36 ? "normal" : "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {scoreText}""",
    1,
)

p.write_text(text, encoding="utf-8")
print("done")
