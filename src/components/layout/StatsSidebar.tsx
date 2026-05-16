import type { JobStats, JobsDataset } from "@/core/types";
import { HorizontalBars } from "@/components/charts/HorizontalBars";
import { IndustryLaborList } from "@/components/layout/IndustryLaborList";
import { formatEmploymentScale, formatPercent } from "@/core/aggregates";

export function StatsSidebar({
  dataset,
  stats,
}: {
  dataset: JobsDataset;
  stats: JobStats;
}) {
  const unit = dataset.meta.employmentUnit;
  const p = stats.peopleImpact;
  const lb = p.laborBalance;
  const taskExposureItems = [
    { label: "任务可完全自动化", value: p.fullyAutomatableEmployment },
    { label: "人机协作·岗位重构", value: p.collaborationEmployment },
    { label: "仍以人为主", value: p.humanOnlyEmployment },
  ];

  return (
    <div className="stats-sidebar">
      <section className="panel panel--highlight">
        <h3>{lb.scenarioYear} · 无 AI 需多少人</h3>
        <MetricBlock value={formatEmploymentScale(lb.totalWithoutAi, unit)} />
        <p className="hint">
          维持当前产出、无 AI 辅助时的全国示意用工（现岗结构×{lb.scaleFactor.toFixed(2)} 外推）
        </p>
      </section>

      <section className="panel panel--highlight">
        <h3>{lb.scenarioYear} · AI 辅助后需多少人</h3>
        <MetricBlock value={formatEmploymentScale(lb.totalWithAi, unit)} />
        <p className="hint">
          逐任务 Σw·P_ij 与监管/复杂度/前沿一致；协作区提效 κ(complexity,acceptance)；全自动区保留监工比例
        </p>
      </section>

      <section className="panel panel--highlight panel--alert">
        <h3>可被 AI 替代（差额）</h3>
        <MetricBlock value={formatEmploymentScale(lb.totalRedundant, unit)} />
        <p className="hint">
          无 AI 人数 − AI 后人数 = {formatPercent(lb.totalRedundantPct)}；示意非官方失业数
        </p>
      </section>

      <section className="panel">
        <h3>按产业 · 人力与冗余</h3>
        <IndustryLaborList rows={lb.bySector} unit={unit} />
      </section>

      <section className="panel">
        <h3>按细分行业 · Top {lb.byIndustry.length > 1 ? lb.byIndustry.length - 1 : lb.byIndustry.length}</h3>
        <IndustryLaborList rows={lb.byIndustry} unit={unit} />
        <p className="hint" style={{ marginTop: 6 }}>
          其余小行业合并为「其他」；数值为全国示意外推
        </p>
      </section>

      <section className="panel">
        <h3>样本内 · 替代风险</h3>
        <MetricBlock value={formatEmploymentScale(p.estimatedDisplacementEmployment, unit)} />
        <p className="hint">
          样本就业 {formatEmploymentScale(stats.totalEmployment, unit)} 中约{" "}
          {formatPercent(p.estimatedDisplacementPct)} 面临较高整岗替代风险
        </p>
      </section>

      <section className="panel panel--muted">
        <h3>{lb.scenarioYear} / 2040 工作内容受冲击</h3>
        <div className="metric-row">
          <MetricBlock
            value={formatEmploymentScale(p.projectedAffected2030, unit)}
            sub="2030"
          />
          <MetricBlock
            value={formatEmploymentScale(p.projectedAffected2040, unit)}
            sub="2040"
          />
        </div>
      </section>

      <section className="panel panel--muted">
        <h3>任务层面从业暴露（样本）</h3>
        <HorizontalBars
          items={taskExposureItems}
          formatValue={(v) => formatEmploymentScale(v, unit)}
        />
      </section>

    </div>
  );
}

function MetricBlock({ value, sub }: { value: string; sub?: string }) {
  return (
    <div className="metric-block">
      <div className="metric">{value}</div>
      {sub ? <span className="metric-sub">{sub}</span> : null}
    </div>
  );
}
