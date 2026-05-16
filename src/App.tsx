import { useEffect, useState } from "react";
import type { DataSource } from "@/core/dataSource";
import type { JobsDataset } from "@/core/types";
import { computeJobStats } from "@/core/aggregates";
import { AppShell } from "@/components/layout/AppShell";
import { StatsSidebar } from "@/components/layout/StatsSidebar";
import { TreemapPanel } from "@/components/treemap/TreemapPanel";
import { useCareerAssessment } from "@/components/assessment/CareerAssessmentModal";
import { SiteShareButton } from "@/components/layout/SiteShareButton";
import { LowSubstitutionJobTags } from "@/components/layout/LowSubstitutionJobTags";

export function App({ dataSource }: { dataSource: DataSource }) {
  const [dataset, setDataset] = useState<JobsDataset | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { modal: assessmentModal, setAssessmentOpen, storedResult } =
    useCareerAssessment(dataset?.jobs ?? []);

  useEffect(() => {
    let cancelled = false;
    dataSource
      .load()
      .then((d) => {
        if (!cancelled) setDataset(d);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      });
    return () => {
      cancelled = true;
    };
  }, [dataSource]);

  if (error) {
    return (
      <div style={{ padding: 24, color: "#ffb4b4" }}>
        加载失败：{error}
      </div>
    );
  }

  if (!dataset) {
    return (
      <div style={{ padding: 24, color: "#a9b6ce" }}>
        正在加载数据集…
      </div>
    );
  }

  const stats = computeJobStats(dataset);

  return (
    <>
      {assessmentModal}
      <AppShell
      header={
        <>
          <div className="app-header__brand">
            <h1 className="app-header__title">{dataset.meta.title}</h1>
            <p className="app-header__subtitle">
              {dataset.meta.subtitle ??
                "块面积 = 斐波那契整数比示意布局（φ≈1.618）· 颜色 = 2030示意替代率 · 就业见悬停"}
            </p>
          </div>
          <nav className="app-header__nav">
            <SiteShareButton siteTitle={dataset.meta.title} storedResult={storedResult} />
            {storedResult ? (
              <button
                type="button"
                className="assessment-header-link"
                onClick={() => setAssessmentOpen(true)}
              >
                我的测评 · {storedResult.personalityType} · 替代风险
                {storedResult.replacementRiskPct}%
              </button>
            ) : null}
            <button
              type="button"
              className="assessment-header-link"
              onClick={() => setAssessmentOpen(true)}
            >
              职业测评
            </button>
          </nav>
        </>
      }
      sidebar={<StatsSidebar dataset={dataset} stats={stats} />}
      main={
        <TreemapPanel
          jobs={dataset.jobs}
          employmentUnit={dataset.meta.employmentUnit}
        />
      }
      footer={
        <>
          <LowSubstitutionJobTags
            jobs={dataset.jobs}
            employmentUnit={dataset.meta.employmentUnit}
          />
          <Methodology />
        </>
      }
    />
    </>
  );
}

function Methodology() {
  return (
    <div className="footer-methodology" style={{ maxWidth: "min(980px, 100%)" }}>
      <h2>数据说明</h2>
      <p style={{ color: "#a9b6ce", lineHeight: 1.55, margin: "0 0 6px", fontSize: 12 }}>
        学术级 <code>task-capability-academic-v2</code>：职业→<strong>任务库</strong>
        （权重=时间占比×关键性×经济价值）→<strong>16 维能力</strong>→认知/具身前沿→σ 自动化概率→ROI；
        人力差额与<strong>效率比</strong>按逐任务计算：分别在无实体认知 AI、有实体具身/产线机器人（人形或非人形）、二者协同三前沿下取最强路径，再换算相对人效（<code>scripts/academic/staffing.py</code>）。
        蒙特卡洛 N=2000。可运行{" "}
        <code>python scripts/generate_embodied_ai_dataset.py</code> 重新生成；也可直接替换{" "}
        <code>public/data/jobs.sample.json</code>。
      </p>
      <p style={{ color: "#a9b6ce", lineHeight: 1.55, margin: "0 0 6px", fontSize: 12 }}>
        数据表见 <code>scripts/academic/data/</code>（capabilities、task_library、frontiers、
        occupation_archetypes）。手工先验 12% 混合；非完整 O*NET 职业任务矩阵，但结构可对接扩展。
      </p>
      <ol style={{ color: "#a9b6ce", lineHeight: 1.5, paddingLeft: 16, margin: "0 0 4px", fontSize: 12 }}>
        <li>
          <strong style={{ color: "#e8edf7" }}>职业条目</strong>
          ：一、二、三产业代表性岗位；部分行业拆成低/中/高端子岗（字段{" "}
          <code>positionTier</code>），替代压力可差数个量级。
        </li>
        <li>
          <strong style={{ color: "#e8edf7" }}>分项压力</strong>
          ：<code>embodiedSubstitution</code> 表征人形/移动机器人、机械臂与自动化产线；{" "}
          <code>cognitiveAiSubstitution</code> 表征 LLM、Copilot、流程机器人等。
        </li>
        <li>
          <strong style={{ color: "#e8edf7" }}>可视化</strong>
          ：Treemap 块面积按斐波那契整数比与黄金分割（φ）排布，保留大小区分但不严格对应就业人数；颜色表示 2030 示意岗位替代率（6/10≈替代60%人力需求），就业见悬停。
        </li>
      </ol>
      <p style={{ color: "#8b97ad", marginTop: 6, fontSize: 12 }}>
        参考：{" "}
        <a
          className="link"
          href="https://www.stats.gov.cn/sj/ndsj/2024/indexch.htm"
          target="_blank"
          rel="noreferrer"
        >
          国家统计局 — 中国统计年鉴 2024
        </a>
        ；{" "}
        <a
          className="link"
          href="https://madeye.github.io/jobs/"
          target="_blank"
          rel="noreferrer"
        >
          madeye.github.io/jobs
        </a>
        。
      </p>
      <p style={{ color: "#c9a45c", marginTop: 6, fontSize: 12 }}>
        ⚠ 数值为研究用示意，非预测、非官方统计；具身与 AI 落地节奏高度不确定。
      </p>
    </div>
  );
}
