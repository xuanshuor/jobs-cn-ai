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
}

function truncateTitle(title: string, maxChars: number): string {
  if (maxChars <= 0) return "";
  if (title.length <= maxChars) return title;
  if (maxChars <= 1) return title.slice(0, 1);
  return `${title.slice(0, maxChars - 1)}…`;
}

/** 按块宽高计算字号、行数与截断标题（桌面/手机统一缩放逻辑） */
export function fitTileLabel(title: string, rw: number, rh: number, mobile: boolean): TileLabelFit {
  const maxFontCap = mobile ? 11 : 32;
  const minFont = 6;
  const padPx = mobile
    ? 2
    : Math.max(4, Math.min(12, Math.round(Math.min(rw, rh) * 0.035)));
  const innerW = Math.max(1, rw - padPx * 2);
  const innerH = Math.max(1, rh - padPx * 2);
  const lineHeight = 1.26;

  if (innerW < (mobile ? 12 : 28) || innerH < (mobile ? 9 : 18)) {
    return {
      showText: false,
      showScoreLine: innerH >= (mobile ? 10 : 22) && innerW >= (mobile ? 14 : 32),
      showEmpLine: false,
      fontSize: minFont,
      metaSize: minFont,
      titleLines: 0,
      displayTitle: "",
      padPx,
      centerContent: !mobile && innerH < 36,
    };
  }

  if (innerW < (mobile ? 20 : 48) || innerH < (mobile ? 13 : 28)) {
    const fontSize = Math.max(
      minFont,
      Math.min(maxFontCap, innerH * 0.48, innerW / (mobile ? 3.2 : 4.8)),
    );
    const metaSize = Math.max(minFont, fontSize * 0.82);
    const maxChars = Math.max(2, Math.floor(innerW / (fontSize * 0.52)));
    return {
      showText: true,
      showScoreLine: innerH >= fontSize * lineHeight + fontSize * 0.75,
      showEmpLine: false,
      fontSize,
      metaSize,
      titleLines: 1,
      displayTitle: truncateTitle(title, maxChars),
      padPx,
      centerContent: innerH < (mobile ? 16 : 32),
    };
  }

  const line3Min = mobile ? 30 : 72;
  const line2Min = mobile ? 20 : 42;
  let titleLines = innerH >= line3Min ? 3 : innerH >= line2Min ? 2 : 1;

  const widthDivisor = mobile ? 5.4 : 4.2;
  let fontSize = Math.min(
    maxFontCap,
    innerW / widthDivisor,
    innerH / (titleLines * lineHeight + (mobile ? 1.15 : 1.35)),
  );
  fontSize = Math.max(minFont, Math.round(fontSize * 10) / 10);

  const scoreLineH = fontSize * 0.9;
  const empLineH = fontSize * 0.8;
  const minWForEmp = mobile ? 26 : 56;
  const minHForScore = mobile ? 11 : fontSize * lineHeight + scoreLineH;
  const minHForEmp =
    titleLines * fontSize * lineHeight + scoreLineH + empLineH + (mobile ? 2 : 4);

  let showScoreLine = innerH >= minHForScore && innerW >= (mobile ? 28 : 44);
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
    fontSize = Math.max(minFont, fontSize - (mobile ? 0.5 : 1));
    showEmpLine = false;
    usedH = titleLines * fontSize * lineHeight + scoreLineH;
  }
  if (usedH > innerH + 0.5) {
    titleLines = 1;
    fontSize = Math.max(minFont, Math.min(fontSize, innerH / (lineHeight + 0.95)));
    showScoreLine = innerH >= fontSize * lineHeight + fontSize * 0.85;
    showEmpLine = false;
  }

  const metaSize = Math.max(minFont, Math.round(fontSize * 0.82 * 10) / 10);
  const charWidth = fontSize * (mobile ? 0.5 : 0.55);
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
  };
}
