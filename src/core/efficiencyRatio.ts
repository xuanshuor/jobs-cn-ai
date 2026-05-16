import type {
  AutomationChannel,
  EfficiencyChannelShares,
} from "./academicStaffingEngine";

const CHANNEL_LABEL: Record<AutomationChannel, string> = {
  cognitive: "无实体·认知 AI / 软件自动化",
  embodied: "有实体·具身与产线自动化",
  hybrid: "认知+具身协同",
};

const CHANNEL_DETAIL: Record<AutomationChannel, string> = {
  cognitive:
    "LLM、Copilot、RPA、流程机器人等屏幕内自动化；对应前沿 AI_k（无物理机体）。",
  embodied:
    "机械臂、自动产线、AGV/AMR、人形或非人形作业机器人等；对应前沿 Robot_k。",
  hybrid:
    "同一任务上认知与具身能力联合：h_k=1−(1−AI_k)(1−Robot_k)，覆盖「AI 指挥+机器人执行」类场景。",
};

export function formatEfficiencyChannelShare(pct: number): string {
  return `${Math.round(pct * 100)}%`;
}

export function formatAiHumanEfficiencyRatio(
  gap: number,
  year: string,
  channels?: EfficiencyChannelShares,
  dominantChannel?: AutomationChannel,
): {
  ratioText: string;
  explain: string;
  formula: string;
  channelLines: string[];
} {
  const g = Math.max(1, gap);
  const channelLines: string[] = [];

  if (channels) {
    const entries = (
      [
        ["cognitive", channels.cognitive],
        ["embodied", channels.embodied],
        ["hybrid", channels.hybrid],
      ] as [AutomationChannel, number][]
    ).sort((a, b) => b[1] - a[1]);

    for (const [ch, share] of entries) {
      if (share < 0.03) continue;
      channelLines.push(
        `${CHANNEL_LABEL[ch]}：约占加权效率比的 ${formatEfficiencyChannelShare(share)}（${CHANNEL_DETAIL[ch]}）`,
      );
    }
    if (dominantChannel) {
      channelLines.unshift(
        `主导通道：${CHANNEL_LABEL[dominantChannel]}。`,
      );
    }
  }

  return {
    ratioText: `${g.toFixed(2)} 倍（自动化体系∶单人工）`,
    explain: `${year} 示意：对本职业每个任务 j，分别在「无实体认知 AI」「有实体具身/产线机器人（人形或非人形）」「二者协同前沿」下计算自动化概率，取最强者 p*_j；再按监管与复杂度换算完成同等产出仍需的人工工时比例，最后按任务时间权重 w_ij 加权得到综合效率比。`,
    formula:
      "ProductivityGap = Σ_j w_ij / LaborFraction_j(p*_j)，其中 p*_j = max(P_cog, P_emb, P_hyb)。",
    channelLines,
  };
}

export { CHANNEL_LABEL, CHANNEL_DETAIL };
