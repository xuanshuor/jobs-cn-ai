/**
 * 悬停标签用：每条职业生成 1～2 句差异化、精简的替代原因（与模型叙事一致，示意非预测）。
 */
import type { JobOccupation } from "./types";
import { computeAiStaffingBreakdown, formatAiHumanEfficiencyRatio } from "./aiStaffing";
import { LABOR_BALANCE_SCENARIO_YEAR } from "./laborForce";

const SALARY_CAP = 550_000;

function salaryBand(median: number): "低" | "中" | "高" {
  const m = Math.min(median, SALARY_CAP);
  if (m < 85_000) return "低";
  if (m < 200_000) return "中";
  return "高";
}

function industryOrSector(job: JobOccupation): string {
  if (job.industryLabel) return job.industryLabel;
  if (job.sector === "primary") return "第一产业";
  if (job.sector === "secondary") return "第二产业";
  return "第三产业";
}

function dominantTail(e: number, c: number, industry?: string): string {
  const diff = e - c;
  if (industry === "金融" || industry === "保险" || industry === "证券" || industry === "银行") {
    if (diff <= -1.2) return "流程/RPA/风控模型与生成式 AI 更主导";
    if (c >= 6.5 && e <= 3) return "柜面与合规流程易被认知自动化";
    if (e >= 5) return "少量现场设备（点钞/安保）具身渗透有限";
    return "认知通道为主，监管抬高整岗替代上限";
  }
  const diff2 = e - c;
  if (diff2 >= 1.2) return "现场/产线自动化更主导";
  if (diff2 <= -1.2) return "软件与生成式 AI 更主导";
  if (e >= 7 && c >= 7) return "双通道皆高，协同项略加码";
  return "两轴接近，看任务权重与监管修正";
}

function eduClause(edu: string): string {
  if (edu.includes("研究生")) return "研：文稿/模型/代码易被 Copilot 类嵌入";
  if (edu.includes("本科")) return "本：屏幕内专业链路与文档比重大";
  if (edu.includes("大专")) return "大专：熟练操作+表单双敏感";
  if (["初中", "中专", "高中"].some((k) => edu.includes(k))) return "中学历：标准化体力与执行多";
  return "学历与数字化组合居中";
}

function tierPrefix(tier: JobOccupation["positionTier"]): string {
  if (!tier) return "";
  if (tier === "低端") return "低端·流程易 SOP 化；";
  if (tier === "高端") return "高端·整岗缓冲大、子任务仍可工具化；";
  return "中端·人机分工；";
}

function scaleClause(job: JobOccupation, employmentUnit: "10k" | "person"): string {
  const band = salaryBand(job.salaryMedianAnnual);
  const wan = (job.salaryMedianAnnual / 10_000).toFixed(1);
  const emp =
    employmentUnit === "person"
      ? `约${Math.round(job.employment).toLocaleString("zh-CN")}人`
      : `约${job.employment}万人就业`;
  const salHint =
    band === "低" ? "薪偏低→示意略强化替代动机" : band === "高" ? "薪偏高→示意略收敛" : "薪居中";
  return `${emp}，年薪中位${wan}万（${salHint}）。`;
}

/**
 * 每条职业 2 句：第 1 句绑定职名+行业+分项主导；第 2 句绑定层级/学历+规模薪酬。
 * 不堆章节标题，避免与上方指标表重复啰嗦。
 */
export function buildSubstitutionReasonBrief(
  job: JobOccupation,
  employmentUnit: "10k" | "person",
): [string, string] {
  const e = job.embodiedSubstitution ?? 0;
  const c = job.cognitiveAiSubstitution ?? 0;
  const ind = industryOrSector(job);
  const staffing = computeAiStaffingBreakdown(job, LABOR_BALANCE_SCENARIO_YEAR);
  const eff = formatAiHumanEfficiencyRatio(
    staffing.productivityGap,
    LABOR_BALANCE_SCENARIO_YEAR,
    staffing.efficiencyByChannel,
    staffing.dominantChannel,
  );
  const line1 = `「${job.title}」·${ind}：具身 ${e.toFixed(1)}、认知 ${c.toFixed(1)}——${dominantTail(e, c, job.industryLabel)}；${LABOR_BALANCE_SCENARIO_YEAR} 自动化体系相对人工 ${eff.ratioText}（含无实体 AI、有实体机器人/产线、协同通道）。`;
  const mergeHint =
    job.mergedFrom && job.mergedFrom.length >= 2
      ? `合并${job.mergedFrom.length}个相近岗位展示；`
      : "";
  const line2 = `${mergeHint}${tierPrefix(job.positionTier)}${eduClause(job.education)}。${scaleClause(job, employmentUnit)}`;
  return [line1, line2];
}
