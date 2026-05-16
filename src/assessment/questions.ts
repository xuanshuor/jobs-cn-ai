import type { AssessmentAnswers, MbtiLetter, RiasecCode } from "./types";

export interface ChoiceOption {
  value: string;
  label: string;
}

export type MbtiDimension = "ei" | "sn" | "tf" | "jp";

export interface MbtiQuestion {
  id: string;
  dimension: MbtiDimension;
  /** 情境铺垫（可选） */
  scene?: string;
  prompt: string;
  optionA: { label: string; letter: MbtiLetter };
  optionB: { label: string; letter: MbtiLetter };
}

export interface RiasecScenario {
  id: string;
  scene?: string;
  prompt: string;
  optionA: { label: string; code: RiasecCode };
  optionB: { label: string; code: RiasecCode };
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

/** 每维度 3 题：身边可发生的小情境，二选一迫选，按维度多数票计分 */
export const MBTI_QUESTIONS: MbtiQuestion[] = [
  {
    id: "ei1",
    dimension: "ei",
    scene: "下班路上，有人骑车栽进路边沟，周围人惊呼围过来",
    prompt: "你的第一反应更像——",
    optionA: { label: "先确认是否受伤、拨打 120，轻声安抚，少围观", letter: "I" },
    optionB: { label: "大声招呼路人一起帮忙，边拉人边问要不要联系家属", letter: "E" },
  },
  {
    id: "ei2",
    dimension: "ei",
    scene: "公司聚餐，领导说「大家向各桌敬一圈，活跃气氛」",
    prompt: "你更可能——",
    optionA: { label: "只跟邻座简单碰杯，能躲就躲，不想成为焦点", letter: "I" },
    optionB: { label: "主动起身说几句，逐桌敬酒，越聊越起劲", letter: "E" },
  },
  {
    id: "ei3",
    dimension: "ei",
    scene: "午休时办公室突然热闹起来，同事拉你聊八卦",
    prompt: "你更想——",
    optionA: { label: "戴耳机下楼独自吃饭，歇够了再回来", letter: "I" },
    optionB: { label: "顺势加入，越聊越精神，差点忘了休息", letter: "E" },
  },
  {
    id: "sn1",
    dimension: "sn",
    scene: "家里 Wi‑Fi 时快时慢，你想彻底搞清楚",
    prompt: "你会——",
    optionA: { label: "按路由器说明书一步步测速、重启、换信道", letter: "S" },
    optionB: { label: "先猜「是不是邻居蹭网/线路老化」，再针对性试", letter: "N" },
  },
  {
    id: "sn2",
    dimension: "sn",
    scene: "朋友发消息：「你最近看着不对劲，到底怎么了？」",
    prompt: "你更可能回——",
    optionA: { label: "具体说睡眠、饮食、哪天开始不舒服", letter: "S" },
    optionB: { label: "往压力、关系、前途上聊，猜背后更大的原因", letter: "N" },
  },
  {
    id: "sn3",
    dimension: "sn",
    scene: "公司还没官宣，群里已在传「要被收购」",
    prompt: "你更会——",
    optionA: { label: "等正式通知，只按已确认的信息行动", letter: "S" },
    optionB: { label: "脑补几种结局，提前想「万一真发生怎么办」", letter: "N" },
  },
  {
    id: "tf1",
    dimension: "tf",
    scene: "扶完人你终于赶到，重要会议已开始，同事看你一眼",
    prompt: "你更可能——",
    optionA: { label: "简短说明事实，立刻进入议题，按议程推进", letter: "T" },
    optionB: { label: "先道歉并关心刚才那人，再向同事解释迟到", letter: "F" },
  },
  {
    id: "tf2",
    dimension: "tf",
    scene: "好友让你评价他熬夜做的方案，你觉得问题很明显",
    prompt: "你会——",
    optionA: { label: "直接指出硬伤和改法，对错比面子重要", letter: "T" },
    optionB: { label: "先肯定用心，再委婉提建议，怕伤感情", letter: "F" },
  },
  {
    id: "tf3",
    dimension: "tf",
    scene: "同事因家里急事常迟到，但团队有明确的考勤规定",
    prompt: "你更倾向——",
    optionA: { label: "按规定处理，规则对所有人一致才公平", letter: "T" },
    optionB: { label: "私下沟通困难，争取灵活处理，顾人情", letter: "F" },
  },
  {
    id: "jp1",
    dimension: "jp",
    scene: "领导丢来一个「没头绪」的难题：「周五前给个思路」",
    prompt: "你更可能——",
    optionA: { label: "当天拆任务、列提纲，留出修改时间", letter: "J" },
    optionB: { label: "先泡资料里随便逛，临近截止时灵感爆发", letter: "P" },
  },
  {
    id: "jp2",
    dimension: "jp",
    scene: "明天一早出差，今晚还在刷手机",
    prompt: "你通常——",
    optionA: { label: "按清单收行李、设闹钟，心里才踏实", letter: "J" },
    optionB: { label: "相信明早能搞定，经常临出门再收拾", letter: "P" },
  },
  {
    id: "jp3",
    dimension: "jp",
    scene: "朋友约周末出去玩，但还没定去哪",
    prompt: "你更喜欢——",
    optionA: { label: "提前订好票和路线，按表走", letter: "J" },
    optionB: { label: "到了再说，看心情临时改计划", letter: "P" },
  },
];

/** 霍兰德六维情境迫选（每题二选一，累计得分后取前三） */
export const RIASEC_SCENARIOS: RiasecScenario[] = [
  {
    id: "r_vs_i",
    scene: "公司组织「技能交换日」，只能报名一个工作坊",
    prompt: "你更想参加——",
    optionA: { label: "机床拆装、设备点检与现场排障", code: "R" },
    optionB: { label: "实验设计、数据建模或算法复盘", code: "I" },
  },
  {
    id: "a_vs_c",
    scene: "下周要向客户交付一份成果",
    prompt: "你更愿意负责——",
    optionA: { label: "主视觉、短视频脚本或品牌故事线", code: "A" },
    optionB: { label: "台账核对、流程清单与合规归档", code: "C" },
  },
  {
    id: "s_vs_e",
    scene: "季度评优，只能选一种「最有成就感」的时刻",
    prompt: "你更会选——",
    optionA: { label: "手把手带新人上手，或帮客户解决难题", code: "S" },
    optionB: { label: "谈成大单，或带队超额完成 KPI", code: "E" },
  },
  {
    id: "i_vs_a",
    scene: "自由安排一个完整的工作日",
    prompt: "你更享受——",
    optionA: { label: "啃技术文档、做 A/B 测试或写研究报告", code: "I" },
    optionB: { label: "头脑风暴、画原型、打磨文案与镜头", code: "A" },
  },
  {
    id: "r_vs_c",
    scene: "仓库/车间出现突发状况",
    prompt: "你更愿意——",
    optionA: { label: "到现场排查、动手修复设备", code: "R" },
    optionB: { label: "整理库存表、排班表，把流程理顺", code: "C" },
  },
  {
    id: "e_vs_s",
    scene: "部门需要一名临时负责人推进项目",
    prompt: "你更擅长扮演——",
    optionA: { label: "对外谈判、拉资源、盯里程碑", code: "E" },
    optionB: { label: "协调成员、做培训、化解内部摩擦", code: "S" },
  },
  {
    id: "a_vs_e",
    scene: "新产品上市前的最后一轮准备",
    prompt: "你更想投入——",
    optionA: { label: "包装创意、传播话术与用户体验", code: "A" },
    optionB: { label: "定价策略、渠道拓展与商务合作", code: "E" },
  },
  {
    id: "i_vs_e",
    scene: "公司要评估一个新兴市场机会",
    prompt: "你更愿意主导——",
    optionA: { label: "竞品数据拆解、模型测算与可行性报告", code: "I" },
    optionB: { label: "客户拜访、方案路演与合同条款博弈", code: "E" },
  },
  {
    id: "r_vs_s",
    scene: "社区/厂区联合举办一场活动",
    prompt: "你更愿意——",
    optionA: { label: "搭建展台、搬运物资、保障现场安全", code: "R" },
    optionB: { label: "接待咨询、讲解健康知识或职业指导", code: "S" },
  },
];

export const MBTI_STEP_GROUPS: { title: string; dimensions: MbtiDimension[] }[] = [
  { title: "与人相处、处理信息", dimensions: ["ei", "sn"] },
  { title: "处事方式与日常节奏", dimensions: ["tf", "jp"] },
];

/** 指定维度的 MBTI 题是否均已作答 */
export function mbtiCompleteForDimensions(
  votes: (MbtiLetter | "")[],
  dimensions: MbtiDimension[],
): boolean {
  for (let i = 0; i < MBTI_QUESTIONS.length; i++) {
    const q = MBTI_QUESTIONS[i]!;
    if (!dimensions.includes(q.dimension)) continue;
    const vote = votes[i];
    if (vote !== q.optionA.letter && vote !== q.optionB.letter) return false;
  }
  return true;
}

/** 霍兰德情境题是否每题均已二选一 */
export function riasecScenariosComplete(choices: RiasecCode[]): boolean {
  for (let i = 0; i < RIASEC_SCENARIOS.length; i++) {
    const s = RIASEC_SCENARIOS[i]!;
    const pick = choices[i];
    if (pick !== s.optionA.code && pick !== s.optionB.code) return false;
  }
  return true;
}

/** 测评是否已全部作答（提交前校验） */
export function isAssessmentAnswersComplete(answers: AssessmentAnswers): boolean {
  return (
    !!answers.jobCategory &&
    answers.taskTags.length >= 1 &&
    answers.taskTags.length <= 4 &&
    !!answers.experienceYears &&
    !!answers.education &&
    answers.aiToolUsage >= 1 &&
    answers.aiToolUsage <= 5 &&
    mbtiCompleteForDimensions(answers.mbtiVotes, ["ei", "sn", "tf", "jp"]) &&
    riasecScenariosComplete(answers.riasecScenarioChoices)
  );
}

export function createDefaultAnswers(): AssessmentAnswers {
  return {
    jobCategory: "",
    experienceYears: "",
    education: "",
    taskTags: [],
    aiToolUsage: 0,
    mbtiVotes: MBTI_QUESTIONS.map(() => ""),
    riasecScenarioChoices: [],
  };
}

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
