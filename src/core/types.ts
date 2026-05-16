/**
 * 领域模型与版本化载荷，便于后续接入 API / 静态 JSON / Parquet 等数据源。
 * @see https://madeye.github.io/jobs/
 */

/** 国家统计局口径：第一/二/三产业 */
export type IndustrySector = "primary" | "secondary" | "tertiary";

/** 同行业内岗位梯度：低端重复执行岗 vs 高端判断/创意/责任岗，替代压力常显著不同 */
export type PositionTier = "低端" | "中端" | "高端";

export interface JobOccupation {
  id: string;
  title: string;
  /** 估算就业人数（万人或千人，由 meta.unit 约定） */
  employment: number;
  /** 年薪中位数（元） */
  salaryMedianAnnual: number;
  education: string;
  outlook?: string;
  /**
   * 0–10，**2030 示意岗位替代率**：与 `aiLaborStaffing["2030"].replacedStaffRatio` 一致，
   * 即「同等产出下可减少的人力占比」。例如 6/10 表示约 60% 岗位需求可由 AI/自动化承接。
   * `embodiedSubstitution` / `cognitiveAiSubstitution` 仍为任务—能力模型的分项压力（0–10）。
   */
  aiImpact: number;
  /** 0–10，具身智能（人形/移动机器人、机械臂等）分项；JSON 中多为经 cost-mass-v1 校准后的示意值 */
  embodiedSubstitution?: number;
  /** 0–10，生成式 AI / 软件自动化分项；同上 */
  cognitiveAiSubstitution?: number;
  /** 0–10，任务—能力模型下的协同替代强度（task-capability-v1） */
  hybridSubstitution?: number;
  /** 可完全自动化 / 人机协作 / 人专属 任务份额（和≈1） */
  substitutionShares?: {
    fullyAutomatable: number;
    humanAiCollaboration: number;
    humanOnly: number;
  };
  /** 按年份的替代率示意，如 "2030": 7.2 */
  substitutionTimeline?: Record<string, number>;
  /** 蒙特卡洛不确定性区间（0–10，学术级 N=2000） */
  aiImpactUncertainty?: { p5: number; p50?: number; p95: number };
  /** 任务原型标识（academic archetype） */
  substitutionArchetype?: string;
  /** 方法学摘要（公式、基准引用） */
  substitutionMethodology?: {
    modelId: string;
    formula: string;
    hybridFrontier: string;
    taskWeight: string;
    references: string[];
  };
  sector: IndustrySector;
  industryLabel?: string;
  /** 可选：与行业标签配合，区分同业内低/中/高端岗位的替代差异 */
  positionTier?: PositionTier;
  /** 由高度重合岗位合并而来时的原 id 列表 */
  mergedFrom?: string[];
  /** 合并说明，如「合并3个相近岗位」 */
  mergeNote?: string;
  /**
   * 任务级人力模型（与 scripts/academic/staffing.py 一致）。
   * 各年：assistedStaffRatio、replacedStaffRatio、productivityGap 等。
   */
  aiLaborStaffing?: Record<
    string,
    {
      assistedStaffRatio: number;
      replacedStaffRatio: number;
      productivityGap: number;
      humanOnlyShare: number;
      collaborationShare: number;
      fullAutoShare: number;
    }
  >;
}

export interface DatasetMeta {
  title: string;
  subtitle?: string;
  /** employment 数值单位说明 */
  employmentUnit: "10k" | "person";
  generatedAt?: string;
  sourceNote?: string;
  /** 可选：生成数据时使用的综合压力合成规则标识 */
  aiImpactModel?: string;
  /** 可选：生成数据时使用的具身/认知分项校准规则标识 */
  substitutionCalibration?: string;
  /** 可选：任务—能力—前沿 替代模型标识 */
  taskSubstitutionModel?: string;
  /** 学术框架标识 */
  substitutionFramework?: string;
  /** 蒙特卡洛样本量 */
  monteCarloSamples?: number;
}

export interface JobsDataset {
  schemaVersion: 1;
  meta: DatasetMeta;
  jobs: JobOccupation[];
}

/** 单行业/产业：全国示意口径下的人力供需（AI 提效模型） */
export interface IndustryLaborRow {
  label: string;
  /** 无 AI 时完成同等产出所需人数（万人，= 现岗规模外推） */
  withoutAi: number;
  /** AI 辅助后所需人数（万人） */
  withAi: number;
  /** 可被 AI 替代的人数 = withoutAi − withAi（万人） */
  redundant: number;
  /** 可替代占无 AI 人数比例（0–100） */
  redundantPct: number;
}

/** 全国分行业人力平衡（样本结构外推，非普查） */
export interface LaborBalanceStats {
  /** 全国示意就业基数（万人） */
  nationalBaseline10k: number;
  /** 样本就业加总（万人） */
  sampleEmployment10k: number;
  /** 外推倍数 = 全国 / 样本 */
  scaleFactor: number;
  scenarioYear: string;
  /** 无 AI 全国示意总人力需求 */
  totalWithoutAi: number;
  /** AI 辅助后全国示意总人力需求 */
  totalWithAi: number;
  /** 可替代人数合计 */
  totalRedundant: number;
  totalRedundantPct: number;
  /** @deprecated 使用 totalWithAi */
  totalHumansNeeded: number;
  bySector: IndustryLaborRow[];
  /** 按细分行业（Top N + 其他） */
  byIndustry: IndustryLaborRow[];
}

/** 面向公众的就业冲击估算（示意，非官方预测） */
export interface PeopleImpactStats {
  /** 估算面临较高整岗替代风险的从业人数（与 employment 同单位） */
  estimatedDisplacementEmployment: number;
  /** 占样本总就业的比例（0–100） */
  estimatedDisplacementPct: number;
  /** 2030 情景：工作内容显著受自动化冲击的人数 */
  projectedAffected2030: number;
  /** 2040 情景 */
  projectedAffected2040: number;
  /** 综合替代压力 ≥7 的从业人数 */
  highPressureEmployment: number;
  /** 任务份额可完全自动化的从业暴露 */
  fullyAutomatableEmployment: number;
  /** 以人机协作为主、岗位显著重构 */
  collaborationEmployment: number;
  /** 仍以人为主 */
  humanOnlyEmployment: number;
  /** 按产业汇总：就业与估算替代风险人数 */
  bySector: { sector: IndustrySector; label: string; employment: number; displaced: number }[];
  /** 全国示意：分行业仍需人力与冗余人口 */
  laborBalance: LaborBalanceStats;
}

export interface JobStats {
  totalEmployment: number;
  weightedAvgImpact: number;
  /** 按综合替代压力分桶的就业人数 */
  impactBins: { label: string; min: number; max: number; employment: number }[];
  highImpactSalaryBillions: number;
  peopleImpact: PeopleImpactStats;
}
