"""Shot specification: the single JSON contract between an AI agent and Blender.

An agent (Claude / Codex) never touches the Blender GUI. It writes a shot spec,
the builder turns it into a scene, the renderer turns it into control passes.
"""
from __future__ import annotations

import json
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any


@dataclass
class Prop:
    """One piece of set dressing, built from the grey-primitive library."""

    type: str
    name: str = ""
    loc: list[float] = field(default_factory=lambda: [0.0, 0.0, 0.0])
    rot_z: float = 0.0
    size: list[float] | None = None
    params: dict[str, Any] = field(default_factory=dict)


@dataclass
class Actor:
    """A mannequin. Grey, jointed, keyframed - never detailed."""

    name: str
    height: float = 1.8
    loc: list[float] = field(default_factory=lambda: [0.0, 0.0, 0.0])
    rot_z: float = 0.0
    # [[x, y, frame], ...] - the mannequin walks through these, facing travel.
    path: list[list[float]] = field(default_factory=list)
    anim: str = "walk"          # walk | idle | push
    step_length: float = 0.75   # metres per stride, drives the leg cycle
    carries: str = ""           # name of a prop parented to the actor


@dataclass
class Camera:
    lens: float = 35.0
    sensor: float = 36.0
    loc: list[float] = field(default_factory=lambda: [0.0, -8.0, 1.6])
    look_at: list[float] = field(default_factory=lambda: [0.0, 0.0, 1.5])
    move: str = "static"        # static | dolly_in | dolly_side | orbit | crane | push_out
    move_amount: float = 3.0    # metres (or degrees for orbit)
    track: str = ""             # actor name to keep framed
    shake: float = 0.0          # 0 = tripod, 1 = aggressive handheld
    dof_target: str = ""
    fstop: float = 2.8


@dataclass
class ShotSpec:
    shot_id: str
    duration_s: float = 5.0
    fps: int = 24
    resolution: list[int] = field(default_factory=lambda: [1280, 720])
    sun_elevation: float = 35.0
    sun_rotation: float = 130.0
    props: list[Prop] = field(default_factory=list)
    actors: list[Actor] = field(default_factory=list)
    camera: Camera = field(default_factory=Camera)
    passes: list[str] = field(default_factory=lambda: ["clay", "depth", "edge"])
    # Depth ramp in metres; None on either side means "fit to the set".
    depth_near: float | None = None
    depth_far: float | None = None
    prompt: dict[str, Any] = field(default_factory=dict)

    @property
    def frame_count(self) -> int:
        return max(2, int(round(self.duration_s * self.fps)))

    @classmethod
    def load(cls, path: str | Path) -> "ShotSpec":
        data = json.loads(Path(path).read_text(encoding="utf-8"))
        return cls.from_dict(data)

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "ShotSpec":
        data = dict(data)
        data["props"] = [Prop(**p) for p in data.get("props", [])]
        data["actors"] = [Actor(**a) for a in data.get("actors", [])]
        data["camera"] = Camera(**data.get("camera", {}))
        known = {f for f in cls.__dataclass_fields__}
        return cls(**{k: v for k, v in data.items() if k in known})
