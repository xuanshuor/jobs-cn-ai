import type { MbtiLetter, RiasecCode } from "./types";

export interface ChoiceOption {
  value: string;
  label: string;
}

export type MbtiDimension = "ei" | "sn" | "tf" | "jp";

export interface MbtiQuestion {
  id: string;
  dimension: MbtiDimension;
  prompt: string;
  optionA: { label: string; letter: MbtiLetter };
  optionB: { label: string; letter: MbtiLetter };
}

/** 与数据集 industryLabel / 岗位关键词对齐 */
export const JOB_CATEGORIES: ChoiceOption[] = [
  { value: "office_admin", label: "行政/文员/档案/人事" },
  { value: "finance", label: "金融/银行/财会/审计" },
  { value: "tech", label: "互联网/软件开发/数据/运维" },
  { value: "sales_service", label: "销售/客服/零售/导购" },
  { value: "logistics", label: "物流/仓储/快递/配送" },
  { value: "manufacturing", label: "生产制造/普工/质检/设备" },
  { value: "construction", label: "建筑/工程施工/造价" },
  { value: "healthcare", label: "医疗/护理/医药/康复" },
  { value: "education", label: "教育/培训/教研" },
  { value: "creative", label: "设计/传媒/广告/内容" },
  { value: "legal", label: "法律/合规/法务" },
  { value: "agriculture", label: "农林牧渔/农技" },
  { value: "management", label: "管理/运营/创业" },
  { value: "other", label: "其他 / 跨行业" },
];

export const EXPERIENCE_OPTIONS: ChoiceOption[] = [
  { value: "0-2", label: "2 年以内（含实习、应届）" },
  { value: "3-5", label: "3–5 年" },
  { value: "6-10", label: "6–10 年" },
  { value: "11+", label: "11 年以上" },
];

export const EDUCATION_OPTIONS: ChoiceOption[] = [
  { value: "middle", label: "初中 / 中专 / 高中" },
  { value: "college", label: "大专" },
  { value: "bachelor", label: "本科" },
  { value: "graduate", label: "硕士及以上" },
];

/** 与学术任务库 T_* 类型对应，用于调节自动化暴露度 */
export const TASK_TAGS: ChoiceOption[] = [
  { value: "routine", label: "流程性事务：录入、排班、单据、报表整理" },
  { value: "data", label: "数据分析、指标监控、商业洞察" },
  { value: "creative", label: "创意策划、文案、视觉与内容产出" },
  { value: "physical", label: "现场操作、搬运、设备或产线作业" },
  { value: "people", label: "面对面服务、教学、销售洽谈" },
  { value: "compliance", label: "合规审核、专业判断、签字担责" },
  { value: "tech_build", label: "编程、系统搭建、自动化脚本" },
  { value: "manage", label: "团队管理、跨部门协调与决策" },
];

export const AI_USAGE_OPTIONS: ChoiceOption[] = [
  { value: "1", label: "几乎不用" },
  { value: "2", label: "偶尔尝试（每月数次）" },
  { value: "3", label: "每周都会用" },
  { value: "4", label: "几乎每天用于工作" },
  { value: "5", label: "核心流程已深度依赖 AI" },
];

/** 每维度 2 题，工作情境表述，提交时按维度计票 */
export const MBTI_QUESTIONS: MbtiQuestion[] = [
  {
    id: "ei1",
    dimension: "ei",
    prompt: "开会讨论方案时，你通常更倾向于——",
    optionA: { label: "先独自理清思路再发言", letter: "I" },
    optionB: { label: "当场交流，边说边想", letter: "E" },
  },
  {
    id: "ei2",
    dimension: "ei",
    prompt: "处理复杂任务时，你的能量来源更常是——",
    optionA: { label: "安静专注的独立工作", letter: "I" },
    optionB: { label: "与同事协作、频繁互动", letter: "E" },
  },
  {
    id: "sn1",
    dimension: "sn",
    prompt: "阅读工作资料时，你更关注——",
    optionA: { label: "可执行的具体步骤与历史数据", letter: "S" },
    optionB: { label: "整体模式、趋势与多种可能", letter: "N" },
  },
  {
    id: "sn2",
    dimension: "sn",
    prompt: "接到新任务时，你更习惯——",
    optionA: { label: "按既有流程与先例推进", letter: "S" },
    optionB: { label: "先构想新做法再落地细节", letter: "N" },
  },
  {
    id: "tf1",
    dimension: "tf",
    prompt: "团队出现分歧时，你更看重——",
    optionA: { label: "客观标准、规则与公平", letter: "T" },
    optionB: { label: "彼此感受与关系和谐", letter: "F" },
  },
  {
    id: "tf2",
    dimension: "tf",
    prompt: "评价同事绩效时，你更倾向于——",
    optionA: { label: "用可量化结果说话", letter: "T" },
    optionB: { label: "结合动机、努力与情境", letter: "F" },
  },
  {
    id: "jp1",
    dimension: "jp",
    prompt: "面对截止日期，你通常——",
    optionA: { label: "提前规划并按节点完成", letter: "J" },
    optionB: { label: "临近截止时集中冲刺", letter: "P" },
  },
  {
    id: "jp2",
    dimension: "jp",
    prompt: "你的工作桌面与任务清单——",
    optionA: { label: "希望井井有条、状态明确", letter: "J" },
    optionB: { label: "保持灵活，随情况调整", letter: "P" },
  },
];

export interface RiasecScenario {
  id: string;
  prompt: string;
  optionA: { label: string; code: RiasecCode };
  optionB: { label: string; code: RiasecCode };
}

/** 霍兰德六维情境迫选（每题二选一，累计得分后取前三） */
export const RIASEC_SCENARIOS: RiasecScenario[] = [
  {
    id: "r_vs_i",
    prompt: "若只能二选一，你更愿意——",
    optionA: { label: "拆装维修设备、使用工具完成实物", code: "R" },
    optionB: { label: "查阅文献、做实验或数据分析", code: "I" },
  },
  {
    id: "a_vs_c",
    prompt: "你更享受——",
    optionA: { label: "设计视觉、写作或表演表达", code: "A" },
    optionB: { label: "按规范核对账目、档案与流程", code: "C" },
  },
  {
    id: "s_vs_e",
    prompt: "成就感更多来自——",
    optionA: { label: "辅导他人、教学或服务患者", code: "S" },
    optionB: { label: "谈判成交、带队达成业绩目标", code: "E" },
  },
  {
    id: "i_vs_s",
    prompt: "理想的一天包含——",
    optionA: { label: "独立研究、建模或技术攻关", code: "I" },
    optionB: { label: "与多人沟通、组织活动", code: "S" },
  },
  {
    id: "r_vs_e",
    prompt: "你更擅长——",
    optionA: { label: "现场动手、巡检与实操", code: "R" },
    optionB: { label: "说服客户、推动项目落地", code: "E" },
  },
  {
    id: "a_vs_i",
    prompt: "你更愿意长期投入——",
    optionA: { label: "创意产业、内容或设计", code: "A" },
    optionB: { label: "科研、工程或算法类工作", code: "I" },
  },
];

export const RIASEC_OPTIONS: { code: RiasecCode; label: string; hint: string }[] = [
  { code: "R", label: "现实型 (R)", hint: "动手、工具、现场、设备" },
  { code: "I", label: "研究型 (I)", hint: "分析、实验、技术、模型" },
  { code: "A", label: "艺术型 (A)", hint: "创作、设计、表达" },
  { code: "S", label: "社会型 (S)", hint: "助人、教学、医护、服务" },
  { code: "E", label: "企业型 (E)", hint: "管理、销售、商业决策" },
  { code: "C", label: "常规型 (C)", hint: "流程、文书、秩序、合规" },
];

export const MBTI_DESCRIPTIONS: Record<string, { title: string; traits: string[] }> = {
  INTJ: { title: "战略家", traits: ["独立", "系统思维", "长期规划", "标准高"] },
  INTP: { title: "逻辑学家", traits: ["好奇", "分析", "概念化", "灵活"] },
  ENTJ: { title: "指挥官", traits: ["果断", "组织力", "目标导向", "效率"] },
  ENTP: { title: "辩论家", traits: ["机敏", "创新", "挑战现状", "多元兴趣"] },
  INFJ: { title: "提倡者", traits: ["洞察", "理想", "共情", "坚持价值"] },
  INFP: { title: "调停者", traits: ["真诚", "创意", "内在价值", "适应"] },
  ENFJ: { title: "主人公", traits: ["鼓舞他人", "沟通", "责任感", "远见"] },
  ENFP: { title: "竞选者", traits: ["热情", "想象", "人际敏感", "探索"] },
  ISTJ: { title: "物流师", traits: ["可靠", "细致", "守规", "务实"] },
  ISFJ: { title: "守卫者", traits: ["体贴", "稳定", "服务", "记忆细节"] },
  ESTJ: { title: "总经理", traits: ["组织", "执行", "传统", "直接"] },
  ESFJ: { title: "执政官", traits: ["合作", "关怀", "社交", "务实助人"] },
  ISTP: { title: "鉴赏家", traits: ["动手", "冷静", "问题解决", "独立"] },
  ISFP: { title: "探险家", traits: ["审美", "温和", "当下体验", "灵活"] },
  ESTP: { title: "企业家", traits: ["行动", "现实", "冒险", "说服"] },
  ESFP: { title: "表演者", traits: ["活力", "乐观", "感官体验", "人际"] },
};

export const MBTI_DIMENSION_LABEL: Record<MbtiDimension, [string, string]> = {
  ei: ["内向 (I)", "外向 (E)"],
  sn: ["实感 (S)", "直觉 (N)"],
  tf: ["思考 (T)", "情感 (F)"],
  jp: ["判断 (J)", "感知 (P)"],
};
