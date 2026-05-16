# -*- coding: utf-8 -*-
"""职业合并：高度重合条目合并就业与薪酬，保留代表职名。"""
from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Any

# 显式合并组：同族岗位合并为一条（保留第一个 title 模式，实际用 canonical）
# 格式: (canonical_title_suffix, [keyword fragments that must all match OR any in group])
EXPLICIT_MERGE_GROUPS: list[tuple[str, list[str]]] = [
    ("典当业务/鉴定（助理·业务员）", ["典当鉴定", "典当估价", "典当业务员", "小额信贷资料"]),
    ("保险销售与理赔辅助", ["保险代理人", "保险理赔查勘", "定损员（车险）", "公估师助理"]),
    ("证券/基金销售合规辅助", ["证券开户", "证券营业部柜员", "期货居间", "基金销售合规"]),
    ("融资租赁/保理/供应链金融（助理）", ["融资租赁项目", "融资租赁尽调", "保理业务", "供应链金融审核", "供应链金融风控", "票据贴现资料"]),
    ("消费金融/小贷/催收合规", ["消费金融催收", "小贷风控信审", "信用卡分期电话", "法务催收合规"]),
    ("银行外包柜面/引导", ["银行大堂引导", "反洗钱数据筛查"]),
    ("仓储物流文员（WMS/TMS）", ["仓储 WMS", "TMS 调度文员", "供应链跟单", "采购助理（询比价）"]),
    ("快递/配送末端", ["快递分拣", "快递员（末端", "同城即时配站长", "前置仓店长助理"]),
    ("保洁/清洁服务", ["保洁员", "公园保洁班长", "客房清扫检查", "洗衣房水洗"]),
    ("保安/安检/门禁", ["保安员", "安检员（交通", "门禁一卡通", "入侵报警调试"]),
    ("数据标注与语料（3D/语音/RLHF）", ["数据标注（3D", "语音采集督导", "大模型 RLHF", "机器视觉标注组长"]),
    ("RPA/低代码/超自动化", ["RPA 流程录制", "低代码平台配置", "超自动化运营"]),
    ("外包驻场开发（前后端/移动/小程序）", ["前端外包驻场", "后端外包驻场", "移动端外包驻场", "小程序外包驻场"]),
    ("DevOps/K8s/流水线", ["Kubernetes 运维", "DevOps 流水线"]),
    ("专利/商标/知识产权流程", ["专利流程文员", "专利检索分析", "商标代理助理", "商标近似审查", "知识产权流程"]),
    ("社工（社区矫正/儿童/养老）", ["社工（社区矫正）", "社工（儿童保护）", "社工（养老评估）"]),
    ("印刷/包装产线", ["包装结构设计助理", "包装工", "印刷拼版", "柔印机长", "胶印机长", "数字印刷操作"]),
    ("注塑/挤出/吹塑成型", ["注塑工艺试模", "挤出机操作", "吹塑中空成型", "吸塑成型"]),
    ("涂装/电镀/氧化", ["真空镀膜", "阳极氧化", "电泳涂装", "粉末涂装", "电镀工", "喷涂工（工业）"]),
    ("风电/光伏/储能运维", ["风电场检修辅助", "风电叶片检修", "光伏电站站长", "光伏电站清洗机器人", "储能电站运维", "储能 EMS 调试", "储能集装箱集成"]),
    ("充电桩/换电运维", ["充电桩运维", "充电桩选址", "充电桩电气测试", "换电站电池检测", "换电站机械", "换电柜运维"]),
    ("农业无人机/植保/飞防", ["农业无人机", "植保飞防", "植保无人机飞防", "农机自动驾驶", "无人播种机"]),
    ("幼教/助教/培训助教", ["早教助教", "幼教老师", "钢琴陪练", "体育培训班助教", "围棋/象棋培训助教"]),
    ("酒店客房/前台/宴会", ["酒店客房服务员", "酒店前台（夜班）", "客房清扫检查", "宴会服务员", "洗衣房水洗"]),
    ("餐饮门店执行", ["餐厅服务员", "奶茶店店员", "电影院检票员", "面包烘焙师"]),
    ("游戏/电竞运营基层", ["游戏测试员（功能）", "游戏客服", "电竞馆运营", "网吧网管"]),
    ("档案/人事档案数字化", ["档案管理员", "档案数字化扫描", "档案数字化质检", "人事档案专审", "干部人事档案数字化"]),
    ("12345/数字城管/智慧城市坐席", ["12345 热线", "数字城管采集", "智慧城市运营中心坐席"]),
    ("电梯/起重特种维保资料", ["电梯年检资料", "电梯物联网监测", "施工升降机检测", "压力容器检验辅助", "特种设备档案管理"]),
    ("环境监测/采样", ["环境采样员", "环境监测设备运维", "环保管家驻场", "碳核查资料"]),
    ("测绘/GIS/倾斜摄影", ["测绘外业跑点", "地理信息采集", "测绘无人机驾驶", "倾斜摄影内业", "GIS 数据处理", "测绘内业制图"]),
    ("BIM/造价/施工资料", ["BIM 建模", "造价咨询助理", "建筑资料员（竣工", "施工图深化", "预算员（土建）", "投标专员助理"]),
    ("屠宰/肉类冷链质检", ["屠宰场检疫", "生猪定点屠宰", "肉品冷链运输", "肉类分割工", "肉类水分检测"]),
    ("乳品/饮料产线操作", ["乳品厂灌装", "啤酒厂糖化", "饮料产线中控", "饮料糖酸比检测"]),
    ("预制菜/中央厨房品控", ["预制菜研发", "中央厨房品控", "中央厨房热链", "团餐营养配餐"]),
    ("彩票/福彩体彩销售", ["体育彩票店", "福利彩票店", "福彩开奖公证", "体彩即开票仓储"]),
    ("共享运维（单车/充电宝/电单车）", ["共享电单车换电", "共享充电宝运维", "共享单车调度"]),
    ("弱电/安防/监控安装", ["弱电综合布线", "安防监控安装", "雪亮工程运维", "天网视频运维"]),
    ("消防物联网/智慧消防", ["消防物联网运维", "智慧消防平台值班", "电气火灾监控运维", "消防检测技术员"]),
    ("医保/社保/公积金窗口与审核", ["社保代办", "公积金提取审核", "医保 DRG", "医保智能监控", "异地就医结算"]),
    ("再生资源/垃圾分拣", ["再生资源分拣", "建筑垃圾分拣", "装修垃圾清运调度", "电子废弃物拆解", "废旧电池回收", "报废汽车拆解"]),
    ("危化/危废运输仓储", ["危化品运输押运", "危化品仓储调度", "危废转运单证", "剧毒品双人双锁"]),
    ("矿山/地质/尾矿", ["矿山安全员（井下", "尾矿库巡查", "尾矿库在线监测", "地质勘探钻探", "选矿厂浮选", "破碎筛分工"]),
    ("港口/集装箱/理货", ["港口理货员", "集装箱验箱员", "港口理货系统", "散货装船指挥"]),
    ("铁路/地铁站务检修辅助", ["铁路客运员", "地铁值班员", "地铁车辆段检修", "地铁屏蔽门维护", "AFC 票务设备维护"]),
    ("公路收费/ETC/治超", ["公路收费站收费", "ETC 发行服务", "ETC 门架运维", "公路治超站系统", "智慧高速事件检测"]),
    ("半导体封装/检测产线", ["半导体封装操作", "面板模组检测", "晶圆厂厂务", "封装打线机", "切筋成型操作"]),
    ("锂电池产线（涂布/卷绕/化成）", ["锂电池涂布", "辊压分切", "卷绕装配", "注液封口", "化成容量测试", "pack 组装", "锂电池化成分容"]),
    ("汽车售后（钣金/喷漆/4S/二手）", ["汽车钣金工", "汽车喷漆工", "4S 店维修", "二手车评估", "二手车整备", "汽车美容技师", "汽车贴膜技师"]),
    ("装修工种（木工/油漆/水电/地暖）", ["木工（装修）", "油漆工（装修）", "水电工（家装）", "地暖安装工"]),
    ("中央空调/新风/暖通安装", ["中央空调安装工", "中央空调清洗", "新风系统安装", "地暖安装工"]),
    ("铸造/锻压/热处理", ["铸造造型工", "锻压设备操作", "热处理工", "粉末冶金压制", "热处理检验"]),
    ("SMT/PCBA产线", ["SMT 炉温", "SMT 首件", "DIP 插件线", "PCBA 功能维修"]),
    ("临床协调/CRA/药监", ["CRA 临床监查", "CRC 临床协调", "药物警戒数据", "医疗器械注册资料"]),
    ("在线医疗/问诊分诊", ["互联网医院运营", "在线问诊分诊", "远程心电监测值班"]),
    ("直播/短视频执行", ["直播场控", "短视频剪辑助理", "短视频编导助理", "直播选品", "直播供应链"]),
    ("MCN/达人商务执行", ["MCN 经纪人", "达人商务（BD）", "品牌直播策划"]),
    ("猎头/RPO/招聘助理", ["猎头寻访员", "RPO 驻场招聘", "薪酬调研数据采集"]),
    ("增长/投放/SEM执行", ["SEO/SEM 执行", "信息流投放优化", "增长黑客实验", "A/B 测试平台运营"]),
    ("品牌/电商监测执行", ["品牌舆情监测", "电商价格监控", "广告监测员", "品牌安全审核"]),
]

# 标题归一化用于模糊聚类
_STRIP_SUFFIX = re.compile(
    r"[（(].*?[）)]|"
    r"（示意）|"
    r"助理|员|工|师|专员|组长|班长|店长|教练|驻场|外包|见习|实习|轮班|新人|辅助|辅助岗|"
    r"（持证）|（资料型）|（历史岗位示意）"
)


def normalize_title(title: str) -> str:
    t = _STRIP_SUFFIX.sub("", title)
    t = re.sub(r"\s+", "", t)
    return t[:12] if len(t) > 12 else t


def _matches_any(title: str, fragments: list[str]) -> bool:
    return any(f in title for f in fragments)


def assign_merge_group(title: str) -> str | None:
    for group_id, (_canonical, fragments) in enumerate(EXPLICIT_MERGE_GROUPS):
        if _matches_any(title, fragments):
            return f"g{group_id:03d}"
    return None


@dataclass
class MergeBucket:
    group_key: str
    canonical_title: str
    members: list[dict[str, Any]]

    def merged_row(self) -> dict[str, Any]:
        """合并就业（求和）、薪酬（就业加权中位）、分数（就业加权）。"""
        m = self.members
        emp_total = sum(j["employment"] for j in m)
        if emp_total <= 0:
            emp_total = len(m)

        def wavg(key: str) -> float:
            return sum(j[key] * j["employment"] for j in m) / emp_total

        # 代表条：就业最大者为主 id/title 基底
        rep = max(m, key=lambda j: j["employment"])
        sal = int(round(wavg("salaryMedianAnnual")))
        edu = rep.get("education", "大专")
        sector = rep.get("sector", "tertiary")
        ind = rep.get("industryLabel") or rep.get("industry", "")

        merged_ids = [j["id"] for j in m]
        note = f"合并{len(m)}个相近岗位"
        if len(m) > 1 and self.canonical_title != rep["title"]:
            title = self.canonical_title
        else:
            title = rep["title"]

        return {
            "rep_id": rep["id"],
            "title": title,
            "employment": emp_total,
            "salaryMedianAnnual": sal,
            "education": edu,
            "sector": sector,
            "industryLabel": ind,
            "embodied_prior": round(wavg("embodiedSubstitution"), 1),
            "cognitive_prior": round(wavg("cognitiveAiSubstitution"), 1),
            "positionTier": rep.get("positionTier"),
            "mergedFrom": merged_ids,
            "mergeNote": note,
        }


def merge_job_dicts(jobs: list[dict[str, Any]]) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    """
    输入已 build 的 job 列表，返回 (保留需重建的合并规格, 未合并的 jobs)。
    合并组在输出 specs 中；非合并 job 原样返回。
    """
    explicit: dict[str, MergeBucket] = {}
    standalone: list[dict[str, Any]] = []

    for j in jobs:
        title = j["title"]
        # 已按层级拆分的职业不合并
        if j.get("positionTier"):
            standalone.append(j)
            continue
        gid = assign_merge_group(title)
        if gid:
            canon = EXPLICIT_MERGE_GROUPS[int(gid[1:])][0]
            if gid not in explicit:
                explicit[gid] = MergeBucket(gid, canon, [])
            explicit[gid].members.append(j)
            continue
        standalone.append(j)

    merge_specs: list[dict[str, Any]] = []
    for bucket in explicit.values():
        if len(bucket.members) < 2:
            standalone.extend(bucket.members)
        else:
            merge_specs.append(bucket.merged_row())

    return merge_specs, standalone


def apply_merge_to_jobs(
    jobs: list[dict[str, Any]],
    rebuild: Any,
) -> list[dict[str, Any]]:
    """
    合并后按原列表顺序输出：在首条成员位置替换为合并条，其余成员跳过。
    rebuild(spec) -> 完整 job dict（含 mergedFrom / mergeNote）。
    """
    merge_specs, _kept = merge_job_dicts(jobs)
    if not merge_specs:
        return jobs

    merged_ids: set[str] = set()
    replace_at: dict[str, dict[str, Any]] = {}
    for spec in merge_specs:
        for mid in spec["mergedFrom"]:
            merged_ids.add(mid)
        replace_at[spec["rep_id"]] = spec

    out: list[dict[str, Any]] = []
    for j in jobs:
        jid = j["id"]
        if jid in replace_at:
            out.append(rebuild(replace_at[jid]))
        elif jid in merged_ids:
            continue
        else:
            out.append(j)
    return out
