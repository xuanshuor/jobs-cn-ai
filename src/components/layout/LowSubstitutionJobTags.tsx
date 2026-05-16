import { useMemo, useState } from "react";
import type { JobOccupation } from "@/core/types";
import {
  careerSedimentFormulaHint,
  careerSedimentPath,
  careerSedimentPathLabel,
  computeCareerSediment20yPotential,
  formatCareerSediment20yPotential,
} from "@/core/careerSediment";
import { LABOR_BALANCE_SCENARIO_YEAR } from "@/core/laborForce";
import {
  computeImpactColorDomain,
  impactNeonStroke,
  impactTileSolid,
} from "@/config/theme";
import {
  formatAnnualSalaryLabel,
  formatEfficiencyRatioLabel,
  formatSalaryMedianDetail,
} from "@/components/treemap/tileMetricFormat";

const TOP_N = 80;

export function LowSubstitutionJobTags({ jobs }: { jobs: JobOccupation[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { items, colorDomain } = useMemo(() => {
    const lowestByImpact = [...jobs]
      .sort((a, b) => a.aiImpact - b.aiImpact || a.title.localeCompare(b.title, "zh"))
      .slice(0, TOP_N);
    const bySalary = [...lowestByImpact].sort(
      (a, b) =>
        b.salaryMedianAnnual - a.salaryMedianAnnual ||
        a.aiImpact - b.aiImpact ||
        a.title.localeCompare(b.title, "zh"),
    );
    return {
      items: bySalary,
      colorDomain: computeImpactColorDomain(jobs.map((j) => j.aiImpact)),
    };
  }, [jobs]);

  if (items.length === 0) return null;

  return (
    <section className="low-sub-tags" aria-label="替代率最低的职业">
      <h2 className="low-sub-tags__title">
        替代率最低的前 {items.length} 个职业
        <span className="low-sub-tags__hint">
          按年薪从高到低 · 点击展开详情 · 2030 示意
        </span>
      </h2>
      <ul className="low-sub-tags__list">
        {items.map((job, index) => {
          const expanded = expandedId === job.id;
          const accent = impactTileSolid(job.aiImpact, colorDomain);
          const border = impactNeonStroke(job.aiImpact, 0.42, colorDomain);
          const efficiencyText = formatEfficiencyRatioLabel(job, LABOR_BALANCE_SCENARIO_YEAR);
          const salaryDetail = formatSalaryMedianDetail(job.salaryMedianAnnual);
          const annualSalaryLabel = formatAnnualSalaryLabel(job.salaryMedianAnnual);
          const subRatePct = `${Math.round(job.aiImpact * 10)}%`;
          const efficiencyValue = efficiencyText.replace(/^效率比\s*/, "");
          const sedimentPath = careerSedimentPath(job);
          const sediment20yPv = computeCareerSediment20yPotential(job, LABOR_BALANCE_SCENARIO_YEAR);
          const sediment20y = formatCareerSediment20yPotential(sediment20yPv);
          const sedimentHint = careerSedimentFormulaHint(job, LABOR_BALANCE_SCENARIO_YEAR);
          const sedimentPathLabel = careerSedimentPathLabel(sedimentPath);

          return (
            <li
              key={job.id}
              className={
                expanded ? "low-sub-tags__item low-sub-tags__item--open" : "low-sub-tags__item"
              }
            >
              <button
                type="button"
                className="low-sub-tags__chip"
                style={{
                  borderColor: border,
                  boxShadow: expanded
                    ? `0 0 16px ${impactNeonStroke(job.aiImpact, 0.2, colorDomain)}`
                    : `inset 0 0 0 1px ${impactNeonStroke(job.aiImpact, 0.12, colorDomain)}`,
                }}
                aria-expanded={expanded}
                onClick={() => setExpandedId((id) => (id === job.id ? null : job.id))}
              >
                <span className="low-sub-tags__rank" aria-hidden>
                  {index + 1}
                </span>
                <span className="low-sub-tags__name">{job.title}</span>
                <span className="low-sub-tags__salary" title={annualSalaryLabel}>
                  {annualSalaryLabel}
                </span>
                <span className="low-sub-tags__chevron" aria-hidden>
                  {expanded ? "▾" : "▸"}
                </span>
              </button>
              {expanded ? (
                <div
                  className="low-sub-tags__detail"
                  style={{ borderColor: border }}
                  role="region"
                  aria-label={`${job.title} 详情`}
                >
                  <p className="low-sub-tags__metric">
                    <span className="low-sub-tags__metric-label">年薪中位</span>
                    <span className="low-sub-tags__metric-value">{salaryDetail}</span>
                  </p>
                  <p className="low-sub-tags__metric">
                    <span className="low-sub-tags__metric-label">
                      沉淀20年潜在收益
                      <span className="low-sub-tags__path-badge">{sedimentPathLabel}</span>
                    </span>
                    <span
                      className="low-sub-tags__metric-value low-sub-tags__metric-value--sediment"
                      title={sedimentHint}
                    >
                      {sediment20y}
                    </span>
                  </p>
                  <p className="low-sub-tags__sediment-hint">{sedimentHint}</p>
                  <p className="low-sub-tags__metric">
                    <span className="low-sub-tags__metric-label">替代率</span>
                    <span className="low-sub-tags__metric-value" style={{ color: accent }}>
                      {subRatePct}
                    </span>
                  </p>
                  <p className="low-sub-tags__metric">
                    <span className="low-sub-tags__metric-label">效率比</span>
                    <span className="low-sub-tags__metric-value low-sub-tags__metric-value--eff">
                      {efficiencyValue}
                    </span>
                  </p>
                  {job.industryLabel ? (
                    <p className="low-sub-tags__industry">{job.industryLabel}</p>
                  ) : null}
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
