# -*- coding: utf-8 -*-
import json
from pathlib import Path

jobs = json.loads(Path("public/data/jobs.sample.json").read_text(encoding="utf-8"))["jobs"]

KW = (
    "金融",
    "证券",
    "银行",
    "保险",
    "期货",
    "交易",
    "投行",
    "基金",
    "信托",
    "信贷",
    "风控",
    "投顾",
    "柜员",
    "理赔",
    "精算",
    "反洗钱",
    "保理",
    "典当",
    "小贷",
    "消费金",
    "财务",
    "审计",
    "记账",
)


def is_finance(j: dict) -> bool:
    ind = j.get("industryLabel", "")
    title = j["title"]
    if ind in (
        "金融",
        "银行",
        "证券",
        "保险",
        "财富管理",
        "融资租赁",
        "典当",
        "消费金融",
        "财务共享",
        "审计鉴证",
    ):
        return True
    return any(k in title for k in KW)


rows = [j for j in jobs if is_finance(j)]
rows.sort(key=lambda x: -x["aiImpact"])

print(f"金融/交易相关共 {len(rows)} 条（2030示意替代率）\n")
print(f"{'替代率':>6} | {'就业':>6} | {'层级':^4} | 职业")
print("-" * 72)
for j in rows:
    pct = round(j["aiImpact"] * 10)
    tier = j.get("positionTier", "—")
    emp = j["employment"]
    print(f"{pct:>5}% | {emp:>6} | {tier:^4} | {j['title']} ({j.get('industryLabel','')})")
