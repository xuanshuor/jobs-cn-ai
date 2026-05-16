import type { IndustryLaborRow, JobsDataset } from "@/core/types";
import { formatEmploymentScale, formatPercent } from "@/core/aggregates";

export function IndustryLaborList({
  rows,
  unit,
}: {
  rows: IndustryLaborRow[];
  unit: JobsDataset["meta"]["employmentUnit"];
}) {
  return (
    <div className="industry-labor-list">
      <div className="industry-labor-list__head">
        <span>行业</span>
        <span>无AI</span>
        <span>AI后</span>
        <span>可替代</span>
      </div>
      {rows.map((row) => (
        <div key={row.label} className="industry-labor-list__row">
          <div className="industry-labor-list__label" title={row.label}>
            {row.label}
          </div>
          <div className="industry-labor-list__without">
            {formatEmploymentScale(row.withoutAi, unit)}
          </div>
          <div className="industry-labor-list__with">
            {formatEmploymentScale(row.withAi, unit)}
          </div>
          <div className="industry-labor-list__redundant">
            {formatEmploymentScale(row.redundant, unit)}
            <span className="industry-labor-list__pct">
              {formatPercent(row.redundantPct)}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
