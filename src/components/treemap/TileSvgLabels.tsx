import { FONT_UI_STACK } from "@/config/typography";
import { splitTileTitleLines, type TileLabelFit } from "./tileLabelFit";

export function TileSvgLabels({
  rh,
  fit,
  title,
  scoreText,
  empText,
  efficiencyText,
  hovered,
}: {
  rh: number;
  fit: TileLabelFit;
  title: string;
  scoreText: string;
  empText: string;
  efficiencyText?: string;
  hovered: boolean;
}) {
  const {
    padPx,
    fontSize,
    metaSize,
    titleLines,
    displayTitle,
    showScoreLine,
    showEmpLine,
    centerContent,
    charsPerLine,
  } = fit;

  const titleColor = hovered ? "#ffffff" : "rgba(248,250,252,0.94)";
  const metaColor = hovered ? "rgba(255,255,255,0.92)" : "rgba(226,236,255,0.78)";
  const empColor = "rgba(200,215,235,0.62)";
  const effColor = "rgba(143, 212, 196, 0.88)";

  const lineH = fontSize * 1.28;
  const titleLinesText = splitTileTitleLines(displayTitle || title, titleLines, charsPerLine);

  const metaLineH = metaSize * 1.18;
  let bottomCursor = rh - padPx;

  const bottomNodes: { key: string; y: number; size: number; fill: string; text: string; tnum?: boolean }[] =
    [];

  if (efficiencyText) {
    bottomNodes.push({
      key: "eff",
      y: bottomCursor,
      size: metaSize * 0.9,
      fill: effColor,
      text: efficiencyText,
      tnum: true,
    });
    bottomCursor -= metaLineH;
  }
  if (showEmpLine) {
    bottomNodes.push({
      key: "emp",
      y: bottomCursor,
      size: metaSize * 0.92,
      fill: empColor,
      text: empText,
    });
    bottomCursor -= metaLineH;
  }
  if (showScoreLine) {
    bottomNodes.push({
      key: "score",
      y: bottomCursor,
      size: metaSize,
      fill: metaColor,
      text: scoreText,
      tnum: true,
    });
    bottomCursor -= metaLineH;
  }

  bottomNodes.reverse();

  const titleBlockH = titleLinesText.length * lineH;
  const bottomBlockH = rh - padPx - bottomCursor;
  let titleY = padPx + fontSize;
  if (centerContent) {
    titleY = Math.max(padPx + fontSize, (rh - titleBlockH - bottomBlockH) / 2 + fontSize * 0.9);
  }

  const x = padPx;

  return (
    <g fontFamily={FONT_UI_STACK} pointerEvents="none">
      {titleLinesText.map((line, i) => (
        <text
          key={`t-${i}`}
          x={x}
          y={titleY + i * lineH}
          fontSize={fontSize}
          fontWeight={100}
          fill={titleColor}
        >
          {line}
        </text>
      ))}
      {bottomNodes.map((node) => (
        <text
          key={node.key}
          x={x}
          y={node.y}
          fontSize={node.size}
          fontWeight={100}
          fill={node.fill}
          style={node.tnum ? { fontFeatureSettings: '"tnum" 1' } : undefined}
        >
          {node.text}
        </text>
      ))}
    </g>
  );
}
