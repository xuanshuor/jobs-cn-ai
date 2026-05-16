import type { AssessmentResult } from "./types";

const SHARE_PARAM = "share";
const SHARE_VERSION = 2;

/** 线上站点根地址（末尾带 /），分享链接固定使用此地址，避免 localhost */
const DEFAULT_PUBLIC_SITE_URL = "https://xuanshuor.github.io/jobs-cn-ai/";

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(token: string): Uint8Array {
  const pad = "=".repeat((4 - (token.length % 4)) % 4);
  const b64 = token.replace(/-/g, "+").replace(/_/g, "/") + pad;
  const binary = atob(b64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

function trimResultForShare(result: AssessmentResult): AssessmentResult {
  return {
    ...result,
    replacementSummary: result.replacementSummary.slice(0, 280),
    recommendedIndustries: result.recommendedIndustries.slice(0, 5).map((ind) => ({
      ...ind,
      reason: ind.reason.slice(0, 120),
    })),
  };
}

function isAssessmentResult(v: unknown): v is AssessmentResult {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.personalityType === "string" &&
    typeof o.replacementRiskPct === "number" &&
    Array.isArray(o.recommendedIndustries)
  );
}

/** 公网站点根 URL，用于生成可分享的链接 */
export function getPublicSiteBase(): string {
  const fromEnv = import.meta.env.VITE_PUBLIC_SITE_URL?.trim();
  if (fromEnv) return fromEnv.endsWith("/") ? fromEnv : `${fromEnv}/`;
  return DEFAULT_PUBLIC_SITE_URL;
}

function isOnPublicSite(loc: Location): boolean {
  try {
    const pub = new URL(getPublicSiteBase());
    return loc.hostname === pub.hostname && loc.pathname.startsWith(pub.pathname.replace(/\/$/, ""));
  } catch {
    return false;
  }
}

export function encodeShareResult(result: AssessmentResult): string {
  const payload = { v: SHARE_VERSION, ...trimResultForShare(result) };
  const json = JSON.stringify(payload);
  return toBase64Url(new TextEncoder().encode(json));
}

export function decodeShareResult(token: string): AssessmentResult | null {
  try {
    const json = new TextDecoder().decode(fromBase64Url(token.trim()));
    const parsed: unknown = JSON.parse(json);
    if (!parsed || typeof parsed !== "object") return null;
    const { v, ...rest } = parsed as { v?: number };
    if (v !== SHARE_VERSION) return null;
    if (!isAssessmentResult(rest)) return null;
    return rest;
  } catch {
    return null;
  }
}

/** 生成可对外分享的完整 URL（始终为公网地址） */
export function buildShareUrl(result: AssessmentResult): string {
  const url = new URL(getPublicSiteBase());
  url.searchParams.set(SHARE_PARAM, encodeShareResult(result));
  return url.toString();
}

export function parseShareFromLocation(
  loc: Location = window.location,
): AssessmentResult | null {
  const token = new URL(loc.href).searchParams.get(SHARE_PARAM);
  if (!token) return null;
  return decodeShareResult(token);
}

export function applyShareUrlToHistory(result: AssessmentResult): void {
  if (typeof window === "undefined") return;
  const token = encodeShareResult(result);
  const loc = window.location;

  if (isOnPublicSite(loc)) {
    const url = new URL(getPublicSiteBase());
    url.searchParams.set(SHARE_PARAM, token);
    window.history.replaceState(
      { assessmentShare: true },
      document.title,
      url.pathname + url.search + url.hash,
    );
    return;
  }

  const url = new URL(loc.href);
  url.searchParams.set(SHARE_PARAM, token);
  window.history.replaceState(
    { assessmentShare: true },
    document.title,
    url.pathname + url.search + url.hash,
  );
}

export function clearShareUrlFromHistory(): void {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  url.searchParams.delete(SHARE_PARAM);
  window.history.replaceState({}, document.title, url.pathname + url.search + url.hash);
}

/** 站点首页（公网） */
export function getSiteHomeUrl(): string {
  return getPublicSiteBase();
}

/** 顶部分享：测评结果用公网分享链，否则首页 */
export function getPageShareUrl(
  storedResult?: AssessmentResult | null,
  _loc: Location = window.location,
): string {
  if (storedResult) return buildShareUrl(storedResult);
  return getSiteHomeUrl();
}
