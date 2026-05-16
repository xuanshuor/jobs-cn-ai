import { useCallback, useMemo, useState } from "react";
import type { AssessmentResult } from "@/assessment/types";
import { getPageShareUrl } from "@/assessment/share";

export function SiteShareButton({
  siteTitle,
  storedResult,
}: {
  siteTitle: string;
  storedResult?: AssessmentResult | null;
}) {
  const [tip, setTip] = useState<string | null>(null);

  const shareUrl = useMemo(
    () => (typeof window !== "undefined" ? getPageShareUrl(storedResult) : ""),
    [storedResult],
  );

  const shareText = storedResult
    ? `我的职业测评：${storedResult.personalityType}，2030 示意 AI 替代风险 ${storedResult.replacementRiskPct}%`
    : `${siteTitle} · 中国就业 AI 影响 Treemap 与职业测评`;

  const copyUrl = useCallback(async () => {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(shareUrl);
      return;
    }
    const input = document.createElement("textarea");
    input.value = shareUrl;
    input.style.position = "fixed";
    input.style.left = "-9999px";
    document.body.appendChild(input);
    input.select();
    document.execCommand("copy");
    input.remove();
  }, [shareUrl]);

  const handleShare = useCallback(async () => {
    setTip(null);
    if (navigator.share) {
      try {
        await navigator.share({
          title: siteTitle,
          text: shareText,
          url: shareUrl,
        });
        setTip("已唤起分享");
        window.setTimeout(() => setTip(null), 2500);
        return;
      } catch (e) {
        if (e instanceof Error && e.name === "AbortError") return;
      }
    }
    try {
      await copyUrl();
      setTip("链接已复制，可粘贴到微信等");
      window.setTimeout(() => setTip(null), 3000);
    } catch {
      setTip("请手动复制地址栏链接");
      window.setTimeout(() => setTip(null), 3000);
    }
  }, [copyUrl, shareText, shareUrl, siteTitle]);

  return (
    <div className="app-header-share-wrap">
      <button
        type="button"
        className="app-header-share"
        onClick={handleShare}
        aria-label="分享本站"
        title="分享到微信等"
      >
        <ShareIcon />
        <span>分享</span>
      </button>
      {tip ? (
        <span className="app-header-share-tip" role="status">
          {tip}
        </span>
      ) : null}
    </div>
  );
}

function ShareIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <path d="M8.59 13.51 15.42 17.49M15.41 6.51 8.59 10.49" />
    </svg>
  );
}
