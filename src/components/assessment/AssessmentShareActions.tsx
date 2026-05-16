import { useCallback, useMemo, useState } from "react";
import type { AssessmentResult } from "@/assessment/types";
import { buildShareUrl } from "@/assessment/share";
import { downloadBlob, renderAssessmentShareImage } from "@/assessment/shareImage";

export function AssessmentShareActions({ result }: { result: AssessmentResult }) {
  const shareUrl = useMemo(() => buildShareUrl(result), [result]);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const copyLink = useCallback(async () => {
    setStatus(null);
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
      } else {
        const input = document.createElement("textarea");
        input.value = shareUrl;
        input.style.position = "fixed";
        input.style.left = "-9999px";
        document.body.appendChild(input);
        input.select();
        document.execCommand("copy");
        input.remove();
      }
      setStatus("链接已复制，可粘贴到微信、QQ 等聊天窗口发送");
    } catch {
      setStatus("复制失败，请长按下方链接手动复制");
    }
  }, [shareUrl]);

  const saveImage = useCallback(async () => {
    setBusy(true);
    setStatus("正在生成分享图…");
    try {
      const blob = await renderAssessmentShareImage(result, shareUrl);
      const name = `职业测评-${result.personalityType}-${result.replacementRiskPct}.png`;
      downloadBlob(blob, name);
      setStatus("分享图已保存（约 1500px 宽），可在微信中选择「相册」发送");
    } catch {
      setStatus("图片生成失败，请重试或仅分享链接");
    } finally {
      setBusy(false);
    }
  }, [result, shareUrl]);

  const shareNative = useCallback(async () => {
    if (!navigator.share) {
      await copyLink();
      return;
    }
    setBusy(true);
    setStatus(null);
    try {
      const blob = await renderAssessmentShareImage(result, shareUrl);
      const file = new File([blob], `职业测评-${result.personalityType}.png`, {
        type: "image/png",
      });
      const payload: ShareData = {
        title: `职业测评 · ${result.personalityType}`,
        text: `AI 替代风险 ${result.replacementRiskPct}%（2030 示意）`,
        url: shareUrl,
      };
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ ...payload, files: [file] });
      } else {
        await navigator.share(payload);
      }
      setStatus("已通过系统分享面板发送");
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") return;
      await copyLink();
    } finally {
      setBusy(false);
    }
  }, [copyLink, result, shareUrl]);

  return (
    <section className="assessment-share">
      <h3 className="assessment-share__title">分享到微信等</h3>
      <p className="assessment-hint">
        复制链接发给好友，或保存图片后在微信中选择相册发送；对方打开链接可查看相同结果。
      </p>
      <div className="assessment-share__url" title={shareUrl}>
        <span className="assessment-share__url-text">{shareUrl}</span>
        <button
          type="button"
          className="assessment-share__url-copy"
          onClick={copyLink}
          disabled={busy}
        >
          复制
        </button>
      </div>
      <div className="assessment-share__actions">
        <button
          type="button"
          className="assessment-btn assessment-btn--primary"
          onClick={saveImage}
          disabled={busy}
        >
          保存分享图
        </button>
        <button
          type="button"
          className="assessment-btn assessment-btn--ghost"
          onClick={copyLink}
          disabled={busy}
        >
          复制链接
        </button>
        {"share" in navigator ? (
          <button
            type="button"
            className="assessment-btn assessment-btn--ghost"
            onClick={shareNative}
            disabled={busy}
          >
            系统分享
          </button>
        ) : null}
      </div>
      {status ? <p className="assessment-share__status">{status}</p> : null}
    </section>
  );
}
