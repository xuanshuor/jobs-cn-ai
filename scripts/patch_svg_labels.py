from pathlib import Path

p = Path(__file__).resolve().parents[1] / "src/components/treemap/JobTreemap.tsx"
text = p.read_text(encoding="utf-8")

start = text.find("              {showText ? (")
end = text.find("              ) : null}\n            </g>", start)
if start < 0 or end < 0:
    raise SystemExit(f"markers not found {start} {end}")

new = """              {showText || showScoreLine ? (
                <g clipPath={`url(#${clipId})`} pointerEvents="none">
                  <TileSvgLabels
                    rw={rw}
                    rh={rh}
                    fit={{
                      showText,
                      showScoreLine,
                      showEmpLine,
                      fontSize,
                      metaSize,
                      titleLines,
                      displayTitle,
                      padPx,
                      centerContent,
                      charsPerLine,
                    }}
                    title={job.title}
                    scoreText={scoreText}
                    empText={empText}
                    efficiencyText={
                      hovered && showScoreLine && !clickOnly
                        ? `AI∶人工 ${(
                            job.aiLaborStaffing?.[LABOR_BALANCE_SCENARIO_YEAR]?.productivityGap ??
                            aiHumanEfficiencyRatio(job, LABOR_BALANCE_SCENARIO_YEAR)
                          ).toFixed(2)} 倍`
                        : undefined
                    }
                    hovered={hovered}
                  />
                </g>
              ) : null}"""

text = text[:start] + new + text[end + len("              ) : null}") :]
p.write_text(text, encoding="utf-8")
print("done")
