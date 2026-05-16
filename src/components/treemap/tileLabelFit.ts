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

/** 按块宽高计算字号、行数与截断标题（手机端自适应） */
export function fitTileLabel(title: string, rw: number, rh: number, mobile: boolean): TileLabelFit {
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

  let usedH =
    titleLines * fontSize * lineHeight + (showScoreLine ? scoreLineH : 0) + (showEmpLine ? empLineH : 0);
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
