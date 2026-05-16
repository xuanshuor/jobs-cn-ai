# -*- coding: utf-8 -*-
import json
from pathlib import Path

jobs = json.loads(Path("public/data/jobs.sample.json").read_text(encoding="utf-8"))["jobs"]

CHECKS = [
    ("偏高·人际服务", lambda j: j["title"] in ("心理咨询师", "社工", "美容美发师") or "EAP" in j["title"]),
    ("偏高·维修", lambda j: "维修" in j["title"] or "维保" in j["title"]),
    ("偏高·高端白领", lambda j: j["aiImpact"] >= 7.0 and any(k in j["title"] for k in ("产品经理", "工艺工程师", "质量工程师", "架构"))),
    ("偏低·流程岗", lambda j: j["aiImpact"] <= 6.5 and any(k in j["title"] for k in ("柜员", "标注", "审核员", "录入", "翻译", "笔译"))),
    ("偏低·影像医学", lambda j: "放射" in j["title"] or "医学影像" in j["title"]),
    ("一产", lambda j: j["sector"] == "primary"),
    ("医疗3-4", lambda j: j.get("industryLabel") == "医疗卫生" and j["aiImpact"] <= 4.0),
]

lines = []
for label, fn in CHECKS:
    xs = sorted([j for j in jobs if fn(j)], key=lambda x: (-x["aiImpact"], x["title"]))
    lines.append(f"\n## {label} ({len(xs)})\n")
    for j in xs[:25]:
        lines.append(
            f"- {j['aiImpact']:.1f} | {j['title']} | {j.get('industryLabel','')} | E{j.get('embodiedSubstitution','?')} C{j.get('cognitiveAiSubstitution','?')}"
        )

# 补充职业：随机先验 + 行业归类偏差
z = [j for j in jobs if str(j["id"]).startswith("z")]
z_high = [j for j in z if j["aiImpact"] >= 8.0]
z_mismatch = [
    j
    for j in z_high
    if not any(
        k in j["title"]
        for k in ("工", "产线", "操作", "装配", "分拣", "包装", "司机", "仓", "叉车", "焊", "注塑", "冲压", "SMT", "封装", "锂电", "光伏", "污水", "运行工", "巡检", "标注", "客服", "录入")
    )
]
lines.append(f"\n## 补充职业(z*)高分但非典型自动化岗 ({len(z_mismatch)}/{len(z_high)}条≥8)\n")
for j in sorted(z_mismatch, key=lambda x: -x["aiImpact"])[:15]:
    lines.append(f"- {j['aiImpact']:.1f} | {j['title']} | {j.get('industryLabel','')}")

# 认知分显著高于具身、但职业偏现场
hands_on_high_cog = sorted(
    [
        j
        for j in jobs
        if j.get("cognitiveAiSubstitution", 0) - j.get("embodiedSubstitution", 0) >= 3.0
        and any(k in j["title"] for k in ("美容", "美发", "维修", "厨师", "导游", "社工", "心理", "护理员", "服务员"))
    ],
    key=lambda x: -(x["cognitiveAiSubstitution"] - x["embodiedSubstitution"]),
)
lines.append(f"\n## 现场服务岗但认知分偏高 ({len(hands_on_high_cog)})\n")
for j in hands_on_high_cog[:12]:
    lines.append(
        f"- {j['aiImpact']:.1f} | {j['title']} | E{j['embodiedSubstitution']} C{j['cognitiveAiSubstitution']}"
    )

Path("scripts/AUDIT_SUMMARY.md").write_text("\n".join(lines), encoding="utf-8")
print("ok", len(lines))
