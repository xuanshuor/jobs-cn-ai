import { FONT_UI_STACK } from "@/config/typography";
import type { TileLabelFit } from "./tileLabelFit";

const TITLE_LINE_HEIGHT = 1.34;

/** 块面仅渲染职业名称 */
export function TileSvgLabels({
  rh,
  fit,
  hovered,
}: {
  rh: number;
  fit: TileLabelFit;
  hovered: boolean;
}) {
  const { padPx, fontSize, titleLineTexts, showText, centerContent } = fit;

  const titleColor = hovered ? "#ffffff" : "rgba(248,250,252,0.95)";
  const titleLineH = fontSize * TITLE_LINE_HEIGHT;
  const titleH = showText ? titleLineTexts.length * titleLineH : 0;

  let y = padPx;
  if (centerContent && titleH < rh - padPx * 2) {
    y = padPx + Math.max(0, (rh - padPx * 2 - titleH) / 2) + fontSize * 0.85;
  } else {
    y = padPx + fontSize;
  }

  const x = padPx;

  if (!showText) return null;

  return (
    <g fontFamily={FONT_UI_STACK} pointerEvents="none">
      {titleLineTexts.map((line, i) => (
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
      ))}
    </g>
  );
}
