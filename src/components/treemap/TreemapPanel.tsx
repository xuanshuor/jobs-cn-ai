import { useEffect, useRef, useState } from "react";
import type { JobOccupation } from "@/core/types";
import { JobTreemap } from "@/components/treemap/JobTreemap";

export function TreemapPanel({
  jobs,
  employmentUnit,
}: {
  jobs: JobOccupation[];
  employmentUnit: "10k" | "person";
}) {
  const ref = useRef<HTMLDivElement>(null);
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

  return (
    <div ref={ref} className="treemap-surface">
      <JobTreemap
        jobs={jobs}
        width={size.w}
        height={size.h}
        employmentUnit={employmentUnit}
      />
    </div>
  );
}
