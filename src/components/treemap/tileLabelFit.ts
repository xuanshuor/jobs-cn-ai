export interface TileLabelFit {
  showText: boolean;
  showScoreLine: boolean;
  showEmpLine: boolean;
  fontSize: number;
  metaSize: number;
  titleLines: number;
  displayTitle: string;
  padPx: number;
  centerContent: boolean;
  charsPerLine: number;
}

function truncateTitle(title: string, maxChars: number): string {
  if (maxChars <= 0) return "";
  if (title.length <= maxChars) return title;
  if (maxChars <= 1) return title.slice(0, 1);
  return `${title.slice(0, maxChars - 1)}…`;
}

/** 将标题拆成多行（用于 SVG text） */
export function splitTileTitleLines(
  text: string,
  maxLines: number,
  charsPerLine: number,
): string[] {
  if (maxLines <= 0 || !text) return [];
  const lines: string[] = [];
  let rest = text;
  for (let i = 0; i < maxLines && rest.length > 0; i++) {
    if (rest.length <= charsPerLine) {
      lines.push(rest);
      break;
    }
    lines.push(rest.slice(0, charsPerLine));
    rest = rest.slice(charsPerLine);
  }
  return lines.length > 0 ? lines : [text.slice(0, Math.max(1, charsPerLine))];
}

/** 按块宽高计算字号、行数与截断标题（桌面/手机统一；桌面大块字号显著增大） */
export function fitTileLabel(title: string, rw: number, rh: number, mobile: boolean): TileLabelFit {
  const padPx = mobile
    ? 2
    : Math.max(6, Math.min(16, Math.round(Math.min(rw, rh) * 0.04)));
  const innerW = Math.max(1, rw - padPx * 2);
  const innerH = Math.max(1, rh - padPx * 2);
  const lineHeight = 1.28;

  const area = Math.sqrt(innerW * innerH);
  const maxFontCap = mobile
    ? 12
    : Math.min(52, Math.max(16, area * 0.11, innerW / 6, innerH / 5));

  const minFont = mobile ? 6 : 9;

  if (innerW < (mobile ? 12 : 24) || innerH < (mobile ? 9 : 16)) {
    return {
      showText: false,
      showScoreLine: innerH >= (mobile ? 10 : 20) && innerW >= (mobile ? 14 : 28),
      showEmpLine: false,
      fontSize: minFont,
      metaSize: minFont,
      titleLines: 0,
      displayTitle: "",
      padPx,
      centerContent: !mobile && innerH < 40,
      charsPerLine: 1,
    };
  }

  if (innerW < (mobile ? 20 : 40) || innerH < (mobile ? 13 : 24)) {
    const fontSize = Math.max(
      minFont,
      Math.min(maxFontCap, innerH * 0.5, innerW / (mobile ? 3.2 : 4.2)),
    );
    const metaSize = Math.max(minFont, fontSize * 0.82);
    const charsPerLine = Math.max(2, Math.floor(innerW / (fontSize * 0.55)));
    return {
      showText: true,
      showScoreLine: innerH >= fontSize * lineHeight + fontSize * 0.8,
      showEmpLine: false,
      fontSize,
      metaSize,
      titleLines: 1,
      displayTitle: truncateTitle(title, charsPerLine),
      padPx,
      centerContent: innerH < (mobile ? 16 : 36),
      charsPerLine,
    };
  }

  const line3Min = mobile ? 30 : 64;
  const line2Min = mobile ? 20 : 38;
  let titleLines = innerH >= line3Min ? 3 : innerH >= line2Min ? 2 : 1;

  const widthDivisor = mobile ? 5.2 : 3.8;
  let fontSize = Math.min(
    maxFontCap,
    innerW / widthDivisor,
    innerH / (titleLines * lineHeight + (mobile ? 1.1 : 1.25)),
  );
  fontSize = Math.max(minFont, Math.round(fontSize * 10) / 10);

  const scoreLineH = fontSize * 0.92;
  const empLineH = fontSize * 0.82;
  const minWForEmp = mobile ? 26 : 52;
  const minHForScore = fontSize * lineHeight + scoreLineH;
  const minHForEmp = titleLines * fontSize * lineHeight + scoreLineH + empLineH + 4;

  let showScoreLine = innerH >= minHForScore && innerW >= (mobile ? 28 : 40);
  let showEmpLine = showScoreLine && innerW >= minWForEmp && innerH >= minHForEmp;

  let usedH =
    titleLines * fontSize * lineHeight +
    (showScoreLine ? scoreLineH : 0) +
    (showEmpLine ? empLineH : 0);

  while (usedH > innerH + 0.5 && titleLines > 1) {
    titleLines -= 1;
    showEmpLine = false;
    usedH = titleLines * fontSize * lineHeight + (showScoreLine ? scoreLineH : 0);
  }
  if (usedH > innerH + 0.5 && showScoreLine) {
    fontSize = Math.max(minFont, fontSize - (mobile ? 0.5 : 1.2));
    showEmpLine = false;
    usedH = titleLines * fontSize * lineHeight + scoreLineH;
  }
  if (usedH > innerH + 0.5) {
    titleLines = 1;
    fontSize = Math.max(minFont, Math.min(fontSize, innerH / (lineHeight + 0.9)));
    showScoreLine = innerH >= fontSize * lineHeight + fontSize * 0.85;
    showEmpLine = false;
  }

  const metaSize = Math.max(minFont, Math.round(fontSize * 0.82 * 10) / 10);
  const charWidth = fontSize * (mobile ? 0.52 : 0.58);
  const charsPerLine = Math.max(2, Math.floor(innerW / charWidth));
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
    charsPerLine,
  };
}
