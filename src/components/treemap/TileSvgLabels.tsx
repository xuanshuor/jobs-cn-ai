import { FONT_UI_STACK } from "@/config/typography";
import type { TileLabelFit } from "./tileLabelFit";

const TITLE_LINE_HEIGHT = 1.34;

export function TileSvgLabels({
  rh,
  fit,
  scoreText,
  empText,
  efficiencyText,
  hovered,
}: {
  rh: number;
  fit: TileLabelFit;
  scoreText: string;
  empText: string;
  efficiencyText?: string;
  hovered: boolean;
}) {
  const {
    padPx,
    fontSize,
    metaSize,
    titleLineTexts,
    showText,
    showScoreLine,
    showEmpLine,
    centerContent,
  } = fit;

  const titleColor = hovered ? "#ffffff" : "rgba(248,250,252,0.95)";
  const metaColor = hovered ? "rgba(255,255,255,0.9)" : "rgba(210, 222, 238, 0.82)";
  const empColor = "rgba(185, 198, 215, 0.65)";
  const effColor = "rgba(143, 212, 196, 0.88)";

  const titleLineH = fontSize * TITLE_LINE_HEIGHT;
  const metaLineH = metaSize * 1.22;
  const gap = fontSize * 0.32;

  const footerItems: { key: string; text: string; size: number; fill: string; tnum?: boolean }[] =
    [];
  if (showScoreLine) footerItems.push({ key: "s", text: scoreText, size: metaSize, fill: metaColor, tnum: true });
  if (showEmpLine) footerItems.push({ key: "e", text: empText, size: metaSize * 0.94, fill: empColor });
  if (efficiencyText) {
    footerItems.push({ key: "f", text: efficiencyText, size: metaSize * 0.88, fill: effColor, tnum: true });
  }

  const footerH =
    footerItems.length > 0
      ? footerItems.length * metaLineH + gap * Math.max(0, footerItems.length - 1)
      : 0;
  const titleH = showText ? titleLineTexts.length * titleLineH : 0;
  const totalH = titleH + (titleH > 0 && footerH > 0 ? gap : 0) + footerH;

  let y = padPx;
  if (centerContent && totalH < rh - padPx * 2) {
    y = padPx + Math.max(0, (rh - padPx * 2 - totalH) / 2) + fontSize * 0.85;
  } else {
    y = padPx + fontSize;
  }

  const x = padPx;

  let footerY = rh - padPx;
  const footerNodes = [...footerItems].reverse().map((item) => {
    const node = { ...item, y: footerY };
    footerY -= metaLineH + gap;
    return node;
  });

  return (
    <g fontFamily={FONT_UI_STACK} pointerEvents="none">
      {showText
        ? titleLineTexts.map((line, i) => (
            <text
              key={`t-${i}`}
              x={x}
              y={y + i * titleLineH}
              fontSize={fontSize}
              fontWeight={300}
              fill={titleColor}
              style={{ letterSpacing: "0.02em" }}
            >
              {line}
            </text>
          ))
        : null}
      {footerNodes.map((node) => (
        <text
          key={node.key}
          x={x}
          y={node.y}
          fontSize={node.size}
          fontWeight={200}
          fill={node.fill}
          style={node.tnum ? { fontFeatureSettings: '"tnum" 1' } : undefined}
        >
          {node.text}
        </text>
      ))}
    </g>
  );
}
