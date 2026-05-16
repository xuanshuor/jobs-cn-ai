export interface TileLabelFit {
  showText: boolean;
  showScoreLine: boolean;
  showEmpLine: boolean;
  fontSize: number;
  metaSize: number;
  titleLineTexts: string[];
  padPx: number;
  centerContent: boolean;
}

const TITLE_LINE_HEIGHT = 1.34;
const META_RATIO = 0.72;
const BREAK_CHARS = /[、，。；：·\/\s]/;

/** 中文标题估算字宽（相对 fontSize） */
function charWidthPx(fontSize: number): number {
  return fontSize * 0.92;
}

/** 按块宽自动换行，优先在标点处断行 */
export function wrapTitleLines(
  title: string,
  maxLines: number,
  innerW: number,
  fontSize: number,
): string[] {
  if (maxLines <= 0 || !title.trim()) return [];
  const maxChars = Math.max(1, Math.floor(innerW / charWidthPx(fontSize)));
  const lines: string[] = [];
  let rest = title.trim();

  while (rest.length > 0 && lines.length < maxLines) {
    if (rest.length <= maxChars) {
      lines.push(rest);
      rest = "";
      break;
    }

    let breakAt = maxChars;
    const slice = rest.slice(0, maxChars + 1);
    for (let i = slice.length - 1; i >= Math.max(1, maxChars - 8); i--) {
      const ch = slice[i];
      if (ch && BREAK_CHARS.test(ch)) {
        breakAt = i + 1;
        break;
      }
    }

    lines.push(rest.slice(0, breakAt).trimEnd());
    rest = rest.slice(breakAt).trimStart();
  }

  if (rest.length > 0) {
    if (lines.length === 0) {
      lines.push(rest.length <= maxChars ? rest : `${rest.slice(0, maxChars - 1)}…`);
    } else if (lines.length < maxLines) {
      const last = lines.length - 1;
      const combined = `${lines[last]}${rest}`;
      if (combined.length <= maxChars) lines[last] = combined;
      else lines[last] = `${lines[last]!.slice(0, Math.max(1, maxChars - 1))}…`;
    } else {
      const last = lines.length - 1;
      const line = lines[last]!;
      lines[last] =
        line.length >= maxChars ? `${line.slice(0, maxChars - 1)}…` : `${line}…`;
    }
  }

  return lines;
}

function metaLineHeight(metaSize: number): number {
  return metaSize * 1.22;
}

/** 按块宽高计算字号、自动换行标题与元信息行 */
export function fitTileLabel(title: string, rw: number, rh: number, mobile: boolean): TileLabelFit {
  const padPx = mobile
    ? 3
    : Math.max(5, Math.min(10, Math.round(Math.min(rw, rh) * 0.028)));
  const innerW = Math.max(1, rw - padPx * 2);
  const innerH = Math.max(1, rh - padPx * 2);

  const minFont = mobile ? 6.5 : 7.5;
  const maxTitleFont = mobile
    ? 11.5
    : Math.min(22, Math.max(11, Math.sqrt(innerW * innerH) * 0.045));
  const maxMetaFont = maxTitleFont * META_RATIO;

  if (innerW < (mobile ? 14 : 22) || innerH < (mobile ? 10 : 14)) {
    const metaSize = Math.max(6, Math.min(maxMetaFont, innerH * 0.55));
    return {
      showText: false,
      showScoreLine: innerH >= metaLineHeight(metaSize) + 2,
      showEmpLine: false,
      fontSize: minFont,
      metaSize,
      titleLineTexts: [],
      padPx,
      centerContent: true,
    };
  }

  let best: TileLabelFit | null = null;

  for (let fontSize = maxTitleFont; fontSize >= minFont; fontSize -= mobile ? 0.4 : 0.5) {
    const fs = Math.round(fontSize * 10) / 10;
    const metaSize = Math.max(6, Math.round(fs * META_RATIO * 10) / 10);
    const scoreH = metaLineHeight(metaSize);
    const empH = metaLineHeight(metaSize * 0.95);
    const gap = fs * 0.35;

    let showScoreLine = innerH >= scoreH + gap * 2;
    let showEmpLine =
      showScoreLine && innerW >= (mobile ? 34 : 48) && innerH >= scoreH + empH + gap * 3;

    let reserved = (showScoreLine ? scoreH + gap : gap) + (showEmpLine ? empH + gap : 0);
    let titleAreaH = innerH - reserved;
    if (titleAreaH < fs * TITLE_LINE_HEIGHT) {
      showEmpLine = false;
      reserved = (showScoreLine ? scoreH + gap : gap);
      titleAreaH = innerH - reserved;
    }
    if (titleAreaH < fs * TITLE_LINE_HEIGHT) {
      showScoreLine = false;
      showEmpLine = false;
      titleAreaH = innerH - gap;
    }

    const maxLines = Math.min(
      mobile ? 3 : 4,
      Math.max(1, Math.floor(titleAreaH / (fs * TITLE_LINE_HEIGHT))),
    );
    const titleLineTexts = wrapTitleLines(title, maxLines, innerW, fs);
    const titleUsedH = titleLineTexts.length * fs * TITLE_LINE_HEIGHT;
    const totalH = titleUsedH + reserved;

    if (totalH > innerH + 0.5) continue;

    const candidate: TileLabelFit = {
      showText: titleLineTexts.length > 0,
      showScoreLine,
      showEmpLine,
      fontSize: fs,
      metaSize,
      titleLineTexts,
      padPx,
      centerContent: false,
    };

    best = candidate;
    break;
  }

  if (best) return best;

  const fs = minFont;
  const metaSize = Math.max(6, fs * META_RATIO);
  const titleLineTexts = wrapTitleLines(title, 1, innerW, fs);
  return {
    showText: titleLineTexts.length > 0,
    showScoreLine: innerH >= metaLineHeight(metaSize) + 4,
    showEmpLine: false,
    fontSize: fs,
    metaSize,
    titleLineTexts,
    padPx,
    centerContent: innerH < fs * 3,
  };
}
