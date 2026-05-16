# -*- coding: utf-8 -*-
"""全库替代压力审计：按行业/关键词启发式标出可能偏高的职业。"""
from __future__ import annotations

import json
import sys
from dataclasses import dataclass
from pathlib import Path

_SCRIPTS = Path(__file__).resolve().parent
sys.path.insert(0, str(_SCRIPTS))

from academic_substitution import compute_occupation_substitution

ROOT = Path(__file__).resolve().parents[1]
JSON_PATH = ROOT / "public" / "data" / "jobs.sample.json"


@dataclass
class Rule:
    name: str
    keywords: tuple[str, ...]
    lo: float
    hi: float
    reason: str


# 启发式合理区间（综合替代压力 0–10，非精确统计，用于筛异常）
RULES: list[Rule] = [
    Rule("强监管专业", ("法官", "检察官", "公证", "仲裁", "消防指挥", "飞行员", "签派"), 1.5, 4.5, "责任与执照门槛高"),
    Rule("医疗临床", ("医师", "医生", "护士", "护理", "药师", "手术", "麻醉", "助产"), 2.5, 5.5, "诊疗不可替代、AI多为辅助"),
    Rule("教育执教", ("教师", "教授", "班主任", "幼师", "幼教", "教练", "讲师"), 4.0, 7.0, "现场教学+监管，AI辅助备课批改"),
    Rule("社工心理", ("社工", "心理咨询", "心理治疗", "EAP"), 2.5, 5.5, "人际信任与伦理约束"),
    Rule("创意策略高端", ("总监", "合伙人", "首席", "架构师", "正高级", "学科带头人", "创意总监", "品牌策略"), 3.5, 6.5, "策略判断为主"),
    Rule("高端金融投顾", ("投行", "并购", "私人银行", "财富管理", "精算", "投顾"), 2.5, 5.5, "关系与合规决策"),
    Rule("研发科学家", ("科学家", "研究员", "博士后", "首席科学家"), 2.0, 5.0, "探索性工作难自动化"),
    Rule("一线普工制造", ("普工", "装配", "包装工", "缝纫", "分拣", "冲压", "注塑", "搬运", "装卸", "叉车"), 7.0, 10.0, "产线/物流自动化成熟"),
    Rule("流程白领低端", ("录入", "审核员", "标注", "文员", "柜员", "记账", "催收电话", "数据标注", "RLHF"), 6.5, 10.0, "规则明确、数字化程度高"),
    Rule("客服呼叫", ("客服", "坐席", "热线", "话务", "呼叫"), 7.0, 10.0, "脚本化对话易被替代"),
    Rule("翻译文案", ("翻译", "笔译", "口译", "文案", "套版", "美工"), 6.0, 9.5, "生成式AI冲击大"),
    Rule("司机配送", ("司机", "配送", "快递", "货运", "网约车", "代驾"), 6.0, 8.5, "无人配送/辅助驾驶推进中"),
    Rule("保安保洁", ("保安", "保洁", "清洁", "环卫"), 5.5, 8.5, "部分场景机器人化"),
    Rule("厨师餐饮", ("厨师", "中餐", "西餐", "烘焙"), 4.0, 7.0, "技艺+现场，自动化有上限"),
    Rule("美容美发", ("美容", "美发", "理发", "美甲"), 3.5, 6.5, "强现场服务属性"),
    Rule("建筑技工", ("钢筋", "泥瓦", "木工", "油漆", "水电", "焊工"), 5.5, 8.5, "现场复杂但工具化推进"),
    Rule("设备维修", ("维修", "维保", "机修", "运维技师"), 4.5, 7.5, "故障诊断AI化、动手仍要人"),
    Rule("农业种植", ("种植", "粮", "渔", "林", "农技"), 5.0, 8.5, "机械化程度高"),
]


def matches(title: str, keywords: tuple[str, ...]) -> bool:
    return any(k in title for k in keywords)


def model_only(j: dict) -> float:
    res = compute_occupation_substitution(
        title=j["title"],
        sector=j["sector"],
        education=j["education"],
        employment=j["employment"],
        salary_median=j["salaryMedianAnnual"],
        tier=j.get("positionTier"),
        industry_label=j.get("industryLabel"),
        prior_embodied_10=None,
        prior_cognitive_10=None,
        prior_blend=0.0,
        monte_carlo_samples=0,
    )
    return res.total_10


def main() -> None:
    jobs = json.loads(JSON_PATH.read_text(encoding="utf-8"))["jobs"]
    out_of_range: list[tuple[str, float, float, float, str, str]] = []
    prior_drift: list[tuple[str, float, float, float, str]] = []
    tier_inversions: list[str] = []
    sector_stats: dict[str, list[float]] = {}

    by_id = {j["id"]: j for j in jobs}

    # 同族高低端倒挂（ALT 拆分）
    alt_pairs = [
        ("s01a", "s01b"),
        ("s05a", "s05b"),
        ("t07a", "t07b"),
        ("t08a", "t08b"),
        ("t12a", "t12b"),
        ("t13a", "t13b"),
        ("t16a", "t16c"),
        ("t20a", "t20b"),
        ("t32a", "t32b"),
        ("t35a", "t35b"),
        ("t36a", "t36b"),
    ]
    for low_id, high_id in alt_pairs:
        lo, hi = by_id.get(low_id), by_id.get(high_id)
        if lo and hi and lo["aiImpact"] <= hi["aiImpact"]:
            tier_inversions.append(
                f"{lo['title']}({lo['aiImpact']}) >= {hi['title']}({hi['aiImpact']})"
            )

    for j in jobs:
        impact = j["aiImpact"]
        sector_stats.setdefault(j["sector"], []).append(impact)
        pure = model_only(j)
        pe = j.get("priorEmbodied", j["embodiedSubstitution"])
        pc = j.get("priorCognitive", j["cognitiveAiSubstitution"])
        prior_mid = (pe + pc) / 2
        if abs(pure - impact) > 1.2 and abs(prior_mid - impact) > 1.0:
            prior_drift.append((j["id"], impact, pure, prior_mid, j["title"]))

        for rule in RULES:
            if matches(j["title"], rule.keywords):
                if impact < rule.lo or impact > rule.hi:
                    flag = "偏低" if impact < rule.lo else "偏高"
                    out_of_range.append(
                        (flag, impact, rule.lo, rule.hi, j["title"], rule.name)
                    )
                break

    print(f"=== 全库 {len(jobs)} 条 ===\n")
    for sec, vals in sorted(sector_stats.items()):
        vals.sort()
        print(f"{sec}: min={vals[0]:.1f} p50={vals[len(vals)//2]:.1f} max={vals[-1]:.1f}")

    print(f"\n=== 启发式区间异常 ({len(out_of_range)} 条) ===")
    for flag, impact, lo, hi, title, rname in sorted(
        out_of_range, key=lambda x: (x[0], -x[1] if x[0] == "偏高" else x[1])
    ):
        print(f"  [{flag}] {impact:.1f} (期望 {lo}-{hi}) | {title} | {rname}")

    print(f"\n=== 高低端倒挂 ({len(tier_inversions)} 组) ===")
    for line in tier_inversions:
        print(f"  {line}")

    print(f"\n=== 模型分与展示分偏离大 ({len(prior_drift)} 条, |差|>1.2) ===")
    for jid, stored, pure, pmid, title in sorted(
        prior_drift, key=lambda x: -abs(x[2] - x[1])
    )[:25]:
        print(f"  {stored:.1f} vs 模型{pure:.1f} 先验中位{pmid:.1f} | {title[:36]} ({jid})")

    # 全局极端
    print("\n=== 仍可能偏高 TOP15（非制造/客服类）===")
    skip_kw = ("普工", "装配", "分拣", "包装", "冲压", "注塑", "客服", "坐席", "标注", "录入", "文员", "焊接", "缝纫")
    high = [
        j
        for j in jobs
        if j["aiImpact"] >= 7.5 and not any(k in j["title"] for k in skip_kw)
    ]
    for j in sorted(high, key=lambda x: -x["aiImpact"])[:15]:
        print(f"  {j['aiImpact']:.1f} {j['title']} | {j.get('industryLabel','')}")

    print("\n=== 仍可能偏低 TOP15（非医疗/法律/科研类）===")
    skip_low = ("医师", "医生", "护士", "护理", "法官", "公证", "科学家", "研究员", "社工", "心理")
    low = [
        j
        for j in jobs
        if j["aiImpact"] <= 4.0 and not any(k in j["title"] for k in skip_low)
    ]
    for j in sorted(low, key=lambda x: x["aiImpact"])[:15]:
        print(f"  {j['aiImpact']:.1f} {j['title']} | {j.get('industryLabel','')}")


def export_json() -> None:
    jobs = json.loads(JSON_PATH.read_text(encoding="utf-8"))["jobs"]
    heuristic: list[dict] = []
    for j in jobs:
        impact = j["aiImpact"]
        for rule in RULES:
            if matches(j["title"], rule.keywords):
                if impact < rule.lo:
                    heuristic.append(
                        {
                            "flag": "偏低",
                            "impact": impact,
                            "range": [rule.lo, rule.hi],
                            "id": j["id"],
                            "title": j["title"],
                            "rule": rule.name,
                            "reason": rule.reason,
                        }
                    )
                elif impact > rule.hi:
                    heuristic.append(
                        {
                            "flag": "偏高",
                            "impact": impact,
                            "range": [rule.lo, rule.hi],
                            "id": j["id"],
                            "title": j["title"],
                            "rule": rule.name,
                            "reason": rule.reason,
                        }
                    )
                break

    primary = [j for j in jobs if j["sector"] == "primary"]
    z_jobs = [j for j in jobs if str(j["id"]).startswith("z")]
    report = {
        "heuristic": heuristic,
        "primarySpread": {
            "count": len(primary),
            "min": min(j["aiImpact"] for j in primary),
            "max": max(j["aiImpact"] for j in primary),
            "jobs": [
                {"id": j["id"], "title": j["title"], "aiImpact": j["aiImpact"]}
                for j in sorted(primary, key=lambda x: x["aiImpact"])
            ],
        },
        "supplementHigh": sorted(
            [
                {
                    "id": j["id"],
                    "title": j["title"],
                    "aiImpact": j["aiImpact"],
                    "industry": j.get("industryLabel"),
                }
                for j in z_jobs
                if j["aiImpact"] >= 8.0
            ],
            key=lambda x: -x["aiImpact"],
        )[:12],
        "supplementLow": sorted(
            [
                {
                    "id": j["id"],
                    "title": j["title"],
                    "aiImpact": j["aiImpact"],
                    "industry": j.get("industryLabel"),
                }
                for j in z_jobs
                if j["aiImpact"] <= 4.5
            ],
            key=lambda x: x["aiImpact"],
        )[:12],
        "tertiaryLowNotMedical": sorted(
            [
                {
                    "id": j["id"],
                    "title": j["title"],
                    "aiImpact": j["aiImpact"],
                    "industry": j.get("industryLabel"),
                }
                for j in jobs
                if j["sector"] == "tertiary"
                and j["aiImpact"] <= 4.5
                and not any(
                    k in j["title"]
                    for k in ("医师", "医生", "护士", "护理", "药师", "手术", "医疗")
                )
            ],
            key=lambda x: x["aiImpact"],
        ),
        "highWhiteCollar": sorted(
            [
                {
                    "id": j["id"],
                    "title": j["title"],
                    "aiImpact": j["aiImpact"],
                    "industry": j.get("industryLabel"),
                }
                for j in jobs
                if j["aiImpact"] >= 7.5
                and any(
                    k in j["title"]
                    for k in ("律师", "法务", "经理", "总监", "顾问", "工程师", "分析师", "设计师")
                )
                and not any(
                    k in j["title"]
                    for k in ("普工", "分拣", "装配", "客服", "标注", "文员", "录入")
                )
            ],
            key=lambda x: -x["aiImpact"],
        )[:20],
    }
    out = Path(__file__).resolve().parent / "_audit_issues.json"
    out.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print("Wrote", out, "issues=", len(heuristic))


if __name__ == "__main__":
    main()
    export_json()
