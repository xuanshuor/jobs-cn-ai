import type { MbtiLetter, RiasecCode } from "./types";

export interface ChoiceOption {
  value: string;
  label: string;
}

export interface MbtiQuestion {
  id: string;
  prompt: string;
  optionA: { label: string; letter: MbtiLetter };
  optionB: { label: string; letter: MbtiLetter };
}

export const JOB_CATEGORIES: ChoiceOption[] = [
  { value: "office_admin", label: "行政/文员/人事" },
  { value: "finance", label: "金融/财会/审计" },
  { value: "tech", label: "互联网/软件开发/数据" },
  { value: "sales_service", label: "销售/客服/零售" },
  { value: "logistics", label: "物流/仓储/配送" },
  { value: "manufacturing", label: "生产制造/技工" },
  { value: "construction", label: "建筑/工程施工" },
  { value: "healthcare", label: "医疗/护理/医药" },
  { value: "education", label: "教育/培训" },
  { value: "creative", label: "设计/传媒/创意" },
  { value: "legal", label: "法律/合规" },
  { value: "agriculture", label: "农林牧渔" },
  { value: "management", label: "管理/创业/综合" },
  { value: "other", label: "其他" },
];

export const EXPERIENCE_OPTIONS: ChoiceOption[] = [
  { value: "0-2", label: "2 年以内" },
  { value: "3-5", label: "3–5 年" },
  { value: "6-10", label: "6–10 年" },
  { value: "11+", label: "11 年以上" },
];

export const EDUCATION_OPTIONS: ChoiceOption[] = [
  { value: "middle", label: "初中/中专/高中" },
  { value: "college", label: "大专" },
  { value: "bachelor", label: "本科" },
  { value: "graduate", label: "研究生及以上" },
];

export const TASK_TAGS: ChoiceOption[] = [
  { value: "routine", label: "重复性事务与流程执行" },
  { value: "data", label: "数据分析与报表" },
  { value: "creative", label: "创意策划与内容产出" },
  { value: "physical", label: "现场体力或设备操作" },
  { value: "people", label: "人际沟通与客户关系" },
  { value: "compliance", label: "合规审核与专业判断" },
  { value: "tech_build", label: "编程/系统搭建" },
  { value: "manage", label: "团队管理与决策" },
];

export const AI_USAGE_OPTIONS: ChoiceOption[] = [
  { value: "1", label: "几乎不用" },
  { value: "2", label: "偶尔尝试" },
  { value: "3", label: "每周会用" },
  { value: "4", label: "每天辅助" },
  { value: "5", label: "深度依赖" },
];

export const MBTI_QUESTIONS: MbtiQuestion[] = [
  {
    id: "ei",
    prompt: "下班后你更常如何恢复精力？",
    optionA: { label: "独处阅读、游戏或休息", letter: "I" },
    optionB: { label: "约朋友聊天、社交活动", letter: "E" },
  },
  {
    id: "sn",
    prompt: "处理工作时你更信任？",
    optionA: { label: "已验证的方法与具体细节", letter: "S" },
    optionB: { label: "趋势洞察与多种可能性", letter: "N" },
  },
  {
    id: "tf",
    prompt: "做重要决定时你更看重？",
    optionA: { label: "逻辑、数据与公平原则", letter: "T" },
    optionB: { label: "感受、关系与共识", letter: "F" },
  },
  {
    id: "jp",
    prompt: "你偏好的工作节奏是？",
    optionA: { label: "提前计划、按清单推进", letter: "J" },
    optionB: { label: "灵活应变、临场调整", letter: "P" },
  },
];

export const RIASEC_OPTIONS: { code: RiasecCode; label: string; hint: string }[] = [
  { code: "R", label: "现实型", hint: "动手操作、工具、现场" },
  { code: "I", label: "研究型", hint: "分析、实验、技术" },
  { code: "A", label: "艺术型", hint: "创作、设计、表达" },
  { code: "S", label: "社会型", hint: "助人、教学、服务" },
  { code: "E", label: "企业型", hint: "说服、管理、商业" },
  { code: "C", label: "常规型", hint: "流程、文书、秩序" },
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
