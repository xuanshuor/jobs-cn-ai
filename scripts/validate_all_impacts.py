# -*- coding: utf-8 -*-
"""全库替代率校验：对齐、区间、倒挂、启发式异常。"""
from __future__ import annotations

import json
import sys
from pathlib import Path

_SCRIPTS = Path(__file__).resolve().parent
sys.path.insert(0, str(_SCRIPTS))

ROOT = _SCRIPTS.parent
JSON_PATH = ROOT / "public" / "data" / "jobs.sample.json"
YEAR = "2030"

# (规则名, 关键词, 期望替代率区间 lo-hi 占10分制)
HEURISTICS: list[tuple[str, tuple[str, ...], float, float]] = [
    ("强监管专业", ("法官", "检察官", "公证", "仲裁委员"), 0.3, 2.5),
    ("医疗临床", ("医师", "医生", "护士", "护理", "药师", "手术"), 0.5, 3.5),
    ("心理社工", ("心理", "社工", "EAP"), 0.2, 2.5),
    ("手艺服务", ("美容", "美发", "厨师", "导游"), 0.3, 3.0),
    ("交易量化", ("交易员", "量化", "程序化", "做市"), 0.5, 2.5),
    ("流程白领", ("录入", "标注", "审核员", "文员", "柜员", "客服", "坐席"), 1.5, 4.5),
    ("翻译文案", ("翻译", "笔译", "口译", "套版", "美工"), 2.0, 4.5),
    ("制造普工", ("普工", "装配", "包装", "冲压", "注塑", "分拣", "缝纫"), 2.5, 5.0),
    ("私行投顾", ("私人银行", "投顾", "财富管理"), 0.3, 2.0),
]

ALT_PAIRS = [
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
    ("f01a", "f01b"),
]


def main() -> int:
    data = json.loads(JSON_PATH.read_text(encoding="utf-8"))
    jobs = data["jobs"]
    by_id = {j["id"]: j for j in jobs}
    issues: list[tuple[str, str]] = []

    # 1. aiImpact 与 staffing 对齐
    for j in jobs:
        st = j.get("aiLaborStaffing", {}).get(YEAR)
        if not st:
            issues.append(("error", f"{j['id']} 缺少 aiLaborStaffing[{YEAR}]"))
            continue
        exp = round(float(st["replacedStaffRatio"]) * 10, 1)
        if abs(j["aiImpact"] - exp) > 0.05:
            issues.append(
                (
                    "error",
                    f"{j['id']} {j['title'][:20]} aiImpact={j['aiImpact']} ≠ staffing={exp}",
                )
            )

    # 2. 数值范围
    for j in jobs:
        if not (0 <= j["aiImpact"] <= 10):
            issues.append(("error", f"{j['id']} aiImpact 越界 {j['aiImpact']}"))
        if j.get("substitutionShares"):
            s = j["substitutionShares"]
            tot = s.get("fullyAutomatable", 0) + s.get("humanAiCollaboration", 0) + s.get("humanOnly", 0)
            if abs(tot - 1.0) > 0.05:
                issues.append(("warn", f"{j['id']} shares 和≈{tot:.2f}"))

    # 3. 高低端倒挂
    for low_id, high_id in ALT_PAIRS:
        lo, hi = by_id.get(low_id), by_id.get(high_id)
        if lo and hi and lo["aiImpact"] < hi["aiImpact"] - 0.05:
            issues.append(
                (
                    "warn",
                    f"倒挂 低端>{hi['title']}({hi['aiImpact']}) > 低端 {lo['title']}({lo['aiImpact']})",
                )
            )

    # 4. 启发式区间
    for j in jobs:
        title = j["title"]
        impact = j["aiImpact"]
        for name, kws, lo, hi in HEURISTICS:
            if any(k in title for k in kws):
                if impact < lo or impact > hi:
                    issues.append(
                        (
                            "warn",
                            f"[{name}] {impact:.1f}/10 {title} (期望 {lo}-{hi})",
                        )
                    )
                break

    # 5. 一产区分度
    primary = [j for j in jobs if j["sector"] == "primary"]
    if primary:
        vals = [j["aiImpact"] for j in primary]
        if max(vals) - min(vals) < 0.4:
            issues.append(
                (
                    "warn",
                    f"一产区分度不足: {min(vals):.1f}-{max(vals):.1f} ({len(primary)}条)",
                )
            )

    # 6. timeline 与 2030 一致性
    for j in jobs:
        tl = j.get("substitutionTimeline", {})
        if YEAR in tl and abs(tl[YEAR] - j["aiImpact"]) > 0.05:
            issues.append(
                (
                    "error",
                    f"{j['id']} timeline[{YEAR}]={tl[YEAR]} ≠ aiImpact={j['aiImpact']}",
                )
            )

    impacts = sorted(j["aiImpact"] for j in jobs)
    print(f"职业数: {len(jobs)}")
    print(f"替代率(2030): min={impacts[0]:.1f} max={impacts[-1]:.1f} median={impacts[len(impacts)//2]:.1f}")
    print(f"问题: error={sum(1 for t,_ in issues if t=='error')} warn={sum(1 for t,_ in issues if t=='warn')}")

    for kind in ("error", "warn"):
        lines = [msg for t, msg in issues if t == kind]
        if not lines:
            print(f"\n=== {kind}: 0 ===")
            continue
        print(f"\n=== {kind} ({len(lines)}) ===")
        for msg in lines[:35]:
            print(f"  {msg}")
        if len(lines) > 35:
            print(f"  ... +{len(lines)-35}")

    # 分产业摘要
    print("\n=== 分产业中位数 ===")
    for sec in ("primary", "secondary", "tertiary"):
        xs = sorted(j["aiImpact"] for j in jobs if j["sector"] == sec)
        if xs:
            print(f"  {sec}: n={len(xs)} min={xs[0]:.1f} p50={xs[len(xs)//2]:.1f} max={xs[-1]:.1f}")

    return 1 if any(t == "error" for t, _ in issues) else 0


if __name__ == "__main__":
    sys.exit(main())
