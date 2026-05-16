# -*- coding: utf-8 -*-
"""加载学术级静态数据表（能力、任务库、前沿、职业原型）。"""

from __future__ import annotations

import json
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
from typing import Any

DATA_DIR = Path(__file__).resolve().parent / "data"


@dataclass(frozen=True)
class CapabilityDef:
    id: str
    name: str
    onet_hint: str
    benchmark_refs: list[str]


@dataclass(frozen=True)
class TaskDef:
    id: str
    name: str
    capabilities: dict[str, float]
    complexity: float
    regulation: float
    acceptance: float
    time_share: float
    criticality: float
    economic_value: float


@dataclass(frozen=True)
class FrontierDef:
    ai_2025: float
    robot_2025: float
    benchmarks_ai: list[str]
    benchmarks_robot: list[str]


@lru_cache(maxsize=1)
def load_capabilities() -> tuple[str, ...]:
    raw = json.loads((DATA_DIR / "capabilities.json").read_text(encoding="utf-8"))
    return tuple(c["id"] for c in raw["capabilities"])


@lru_cache(maxsize=1)
def load_capability_defs() -> dict[str, CapabilityDef]:
    raw = json.loads((DATA_DIR / "capabilities.json").read_text(encoding="utf-8"))
    out: dict[str, CapabilityDef] = {}
    for c in raw["capabilities"]:
        out[c["id"]] = CapabilityDef(
            id=c["id"],
            name=c["name"],
            onet_hint=c.get("onet_hint", ""),
            benchmark_refs=list(c.get("benchmark_refs", [])),
        )
    return out


@lru_cache(maxsize=1)
def load_tasks() -> dict[str, TaskDef]:
    raw = json.loads((DATA_DIR / "task_library.json").read_text(encoding="utf-8"))
    out: dict[str, TaskDef] = {}
    for t in raw["tasks"]:
        caps = {k: float(v) for k, v in t["capabilities"].items()}
        s = sum(caps.values()) or 1.0
        caps = {k: v / s for k, v in caps.items()}
        out[t["id"]] = TaskDef(
            id=t["id"],
            name=t["name"],
            capabilities=caps,
            complexity=float(t["complexity"]),
            regulation=float(t["regulation"]),
            acceptance=float(t["acceptance"]),
            time_share=float(t["time_share"]),
            criticality=float(t["criticality"]),
            economic_value=float(t["economic_value"]),
        )
    return out


@lru_cache(maxsize=1)
def load_frontiers_meta() -> dict[str, Any]:
    return json.loads((DATA_DIR / "frontiers.json").read_text(encoding="utf-8"))


@lru_cache(maxsize=1)
def load_frontiers() -> dict[str, FrontierDef]:
    raw = load_frontiers_meta()
    out: dict[str, FrontierDef] = {}
    for cid, row in raw["capabilities"].items():
        out[cid] = FrontierDef(
            ai_2025=float(row["ai_2025"]),
            robot_2025=float(row["robot_2025"]),
            benchmarks_ai=list(row.get("benchmarks_ai", [])),
            benchmarks_robot=list(row.get("benchmarks_robot", [])),
        )
    return out


@lru_cache(maxsize=1)
def load_occupation_archetypes() -> dict[str, Any]:
    return json.loads((DATA_DIR / "occupation_archetypes.json").read_text(encoding="utf-8"))
