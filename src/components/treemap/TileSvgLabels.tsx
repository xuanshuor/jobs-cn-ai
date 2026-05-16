import { FONT_UI_STACK } from "@/config/typography";
import type { TileLabelFit } from "./tileLabelFit";

const TITLE_LINE_HEIGHT = 1.34;

export function TileSvgLabels({
  rh,
  fit,
  employmentText,
  hovered,
}: {
  rh: number;
  fit: TileLabelFit;
  employmentText: string;
  hovered: boolean;
}) {
  const {
    padPx,
    fontSize,
    metaSize,
    titleLineTexts,
    showText,
    showEmploymentLine,
    centerContent,
  } = fit;

  const titleColor = hovered ? "#ffffff" : "rgba(248,250,252,0.95)";
  const empColor = hovered ? "rgba(255,255,255,0.88)" : "rgba(185, 198, 215, 0.78)";

  const titleLineH = fontSize * TITLE_LINE_HEIGHT;
  const metaLineH = metaSize * 1.22;
  const gap = fontSize * 0.32;

  const empH = showEmploymentLine ? metaLineH + gap : 0;
  const titleH = showText ? titleLineTexts.length * titleLineH : 0;
  const totalH = titleH + (titleH > 0 && empH > 0 ? gap : 0) + empH;

  let y = padPx;
  if (centerContent && totalH < rh - padPx * 2) {
    y = padPx + Math.max(0, (rh - padPx * 2 - totalH) / 2) + fontSize * 0.85;
  } else {
    y = padPx + fontSize;
  }

  const x = padPx;

  if (!showText && !showEmploymentLine) return null;

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
      {showEmploymentLine ? (
        <text
          x={x}
          y={rh - padPx}
          fontSize={metaSize}
          fontWeight={200}
          fill={empColor}
          style={{ fontFeatureSettings: '"tnum" 1' }}
        >
          {employmentText}
        </text>
      ) : null}
    </g>
  );
}
