import type { AssessmentResult } from "./types";

const SHARE_PARAM = "share";
const SHARE_VERSION = 1;

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

export function buildShareUrl(result: AssessmentResult): string {
  const basePath = import.meta.env.BASE_URL ?? "/";
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const path = basePath.endsWith("/") ? basePath : `${basePath}/`;
  const url = new URL(path, origin || "http://localhost");
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
  const url = buildShareUrl(result);
  window.history.replaceState({ assessmentShare: true }, document.title, url);
}

export function clearShareUrlFromHistory(): void {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  url.searchParams.delete(SHARE_PARAM);
  window.history.replaceState({}, document.title, url.pathname + url.search + url.hash);
}

/** 站点首页地址（不含测评参数） */
export function getSiteHomeUrl(loc: Location = window.location): string {
  const basePath = import.meta.env.BASE_URL ?? "/";
  const path = basePath.endsWith("/") ? basePath : `${basePath}/`;
  return new URL(path, loc.origin).toString();
}

/** 顶部分享用：优先当前页（含测评链接），否则带测评结果，否则首页 */
export function getPageShareUrl(
  storedResult?: AssessmentResult | null,
  loc: Location = window.location,
): string {
  const current = new URL(loc.href);
  if (current.searchParams.has(SHARE_PARAM)) return current.toString();
  if (storedResult) return buildShareUrl(storedResult);
  return getSiteHomeUrl(loc);
}
