import { useEffect, useRef, useState } from "react";
import type { JobOccupation } from "@/core/types";
import { JobTreemap } from "@/components/treemap/JobTreemap";
import { useMediaQuery } from "@/hooks/useMediaQuery";

export function TreemapPanel({
  jobs,
  employmentUnit,
}: {
  jobs: JobOccupation[];
  employmentUnit: "10k" | "person";
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isMobile = useMediaQuery("(max-width: 640px)");
  const [size, setSize] = useState({ w: 800, h: 520 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;

    const ro = new ResizeObserver((entries) => {
      const cr = entries[0]?.contentRect;
      if (!cr) return;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const w = Math.max(0, Math.floor(cr.width));
        const h = Math.max(0, Math.floor(cr.height));
        setSize((prev) => {
          if (Math.abs(prev.w - w) < 2 && Math.abs(prev.h - h) < 2) return prev;
          return { w, h };
        });
      });
    });
    ro.observe(el);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  const layoutW = isMobile ? Math.max(size.w, 580) : size.w;
  const layoutH = isMobile ? Math.max(size.h, Math.round(layoutW * 0.72)) : size.h;

  return (
    <div
      ref={ref}
      className={isMobile ? "treemap-surface treemap-surface--mobile" : "treemap-surface"}
    >
      {isMobile ? (
        <p className="treemap-mobile-hint" role="note">
          点击色块查看详情 · 在图中滑动可浏览更多区域
        </p>
      ) : null}
      <div
        className={
          isMobile ? "treemap-scroll-viewport" : "treemap-scroll-viewport treemap-scroll-viewport--fill"
        }
      >
        <JobTreemap
          jobs={jobs}
          width={layoutW}
          height={layoutH}
          employmentUnit={employmentUnit}
          mobile={isMobile}
        />
      </div>
    </div>
  );
}
