import { impactTileSolid } from "@/config/theme";

const BAR_GRAD = `linear-gradient(90deg, ${impactTileSolid(0)}, ${impactTileSolid(5)}, ${impactTileSolid(10)})`;

export function HorizontalBars({
  items,
  formatValue,
}: {
  items: { label: string; value: number }[];
  formatValue?: (n: number) => string;
}) {
  const max = Math.max(1, ...items.map((i) => i.value));
  const fmt = formatValue ?? ((n: number) => n.toFixed(0));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {items.map((it, idx) => {
        const t = items.length > 1 ? idx / (items.length - 1) : 0.5;
        const dot = impactTileSolid(t * 10);
        return (
          <div key={it.label}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: 3,
                fontSize: 12,
                color: "#9ec2d8",
              }}
            >
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span
                  aria-hidden
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: 999,
                    background: dot,
                    boxShadow: `0 0 8px ${dot}`,
                  }}
                />
                {it.label}
              </span>
              <span style={{ color: "#e8f7ff", fontWeight: 600 }}>{fmt(it.value)}</span>
            </div>
            <div
              style={{
                height: 7,
                borderRadius: 999,
                background: "rgba(0,0,0,0.35)",
                border: "1px solid rgba(255, 200, 120, 0.18)",
                overflow: "hidden",
                boxShadow: "inset 0 0 10px rgba(0,0,0,0.45)",
              }}
            >
              <div
                style={{
                  width: `${(it.value / max) * 100}%`,
                  height: "100%",
                  borderRadius: 999,
                  background: BAR_GRAD,
                  boxShadow: "0 0 12px rgba(239, 68, 68, 0.28)",
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
