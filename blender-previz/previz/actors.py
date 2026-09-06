"""Jointed grey mannequins and their keyframed motion.

The mannequin is deliberately crude - the AI model replaces it with a real
human. What must be right is the *silhouette over time*: stride length, weight
shift, where the hands are, how the body occludes the set. Those are exactly
what a video model cannot invent consistently on its own.
"""
from __future__ import annotations

import math

import bpy

from . import library as lib
from .spec import Actor


def build_mannequin(actor: Actor) -> dict[str, bpy.types.Object]:
    """Build a mannequin facing +X. Returns the rig's named pivots."""
    h = actor.height
    root = lib.empty(f"{actor.name}", loc=(actor.loc[0], actor.loc[1], actor.loc[2]))
    root.rotation_euler.z = math.radians(actor.rot_z)

    hip_z = h * 0.52
    hips = lib.empty(f"{actor.name}_hips", loc=(0, 0, hip_z), parent=root)
    lib.box(f"{actor.name}_pelvis", size=(h * 0.15, h * 0.19, h * 0.14),
            loc=(0, 0, 0.02), parent=hips)
    lib.box(f"{actor.name}_torso", size=(h * 0.16, h * 0.22, h * 0.26),
            loc=(0, 0, h * 0.20), parent=hips)
    neck_z = h * 0.36
    lib.cylinder(f"{actor.name}_neck", radius=h * 0.035, depth=h * 0.05,
                 loc=(0, 0, neck_z), parent=hips)
    lib.sphere(f"{actor.name}_head", radius=h * 0.075,
               loc=(0, 0, neck_z + h * 0.09), parent=hips)

    rig: dict[str, bpy.types.Object] = {"root": root, "hips": hips}
    thigh_l, shin_l = h * 0.26, h * 0.26
    arm_l, fore_l = h * 0.17, h * 0.16

    for side, sign in (("L", 1), ("R", -1)):
        hip = lib.empty(f"{actor.name}_hip_{side}",
                        loc=(0, sign * h * 0.055, -h * 0.02), parent=hips)
        lib.cylinder(f"{actor.name}_thigh_{side}", radius=h * 0.042,
                     depth=thigh_l, loc=(0, 0, -thigh_l / 2), parent=hip)
        knee = lib.empty(f"{actor.name}_knee_{side}",
                         loc=(0, 0, -thigh_l), parent=hip)
        lib.cylinder(f"{actor.name}_shin_{side}", radius=h * 0.034,
                     depth=shin_l, loc=(0, 0, -shin_l / 2), parent=knee)
        lib.box(f"{actor.name}_foot_{side}", size=(h * 0.13, h * 0.05, h * 0.03),
                loc=(h * 0.03, 0, -shin_l), parent=knee)

        shoulder = lib.empty(f"{actor.name}_shoulder_{side}",
                             loc=(0, sign * h * 0.115, h * 0.31), parent=hips)
        lib.cylinder(f"{actor.name}_upperarm_{side}", radius=h * 0.03,
                     depth=arm_l, loc=(0, 0, -arm_l / 2), parent=shoulder)
        elbow = lib.empty(f"{actor.name}_elbow_{side}",
                          loc=(0, 0, -arm_l), parent=shoulder)
        lib.cylinder(f"{actor.name}_forearm_{side}", radius=h * 0.026,
                     depth=fore_l, loc=(0, 0, -fore_l / 2), parent=elbow)
        lib.sphere(f"{actor.name}_hand_{side}", radius=h * 0.032,
                   loc=(0, 0, -fore_l), parent=elbow)

        rig[f"hip_{side}"] = hip
        rig[f"knee_{side}"] = knee
        rig[f"shoulder_{side}"] = shoulder
        rig[f"elbow_{side}"] = elbow
    return rig


def _sample_path(path: list[list[float]], frame: float) -> tuple[float, float, float]:
    """Position + cumulative distance at `frame`, linearly along the waypoints."""
    if not path:
        return 0.0, 0.0, 0.0
    if len(path) == 1 or frame <= path[0][2]:
        return path[0][0], path[0][1], 0.0
    dist = 0.0
    for a, b in zip(path, path[1:]):
        seg = math.dist((a[0], a[1]), (b[0], b[1]))
        if frame <= b[2]:
            span = max(1e-6, b[2] - a[2])
            t = (frame - a[2]) / span
            return (a[0] + (b[0] - a[0]) * t,
                    a[1] + (b[1] - a[1]) * t,
                    dist + seg * t)
        dist += seg
    return path[-1][0], path[-1][1], dist


def animate(actor: Actor, rig: dict[str, bpy.types.Object],
            frame_start: int, frame_end: int, step: int = 2) -> None:
    """Bake the walk/push cycle. Sampling every `step` frames keeps the curve
    honest: the phase comes from distance travelled, so the feet cannot slide."""
    root = rig["root"]
    swing = math.radians(26 if actor.anim != "idle" else 3)
    arm_swing = math.radians(20 if actor.anim == "walk" else 0)

    for frame in range(frame_start, frame_end + 1, step):
        x, y, dist = _sample_path(actor.path, frame) if actor.path else (
            actor.loc[0], actor.loc[1], 0.0)
        if actor.path:
            nx, ny, _ = _sample_path(actor.path, frame + 1)
            if abs(nx - x) > 1e-6 or abs(ny - y) > 1e-6:
                root.rotation_euler.z = math.atan2(ny - y, nx - x)
            root.location = (x, y, actor.loc[2])
            root.keyframe_insert("location", frame=frame)
            root.keyframe_insert("rotation_euler", frame=frame)

        phase = 2 * math.pi * dist / max(0.05, actor.step_length)
        # Vertical bob: two bounces per stride, the tell that reads as weight.
        rig["hips"].location.z = actor.height * 0.52 + math.sin(phase * 2) * actor.height * 0.012
        rig["hips"].keyframe_insert("location", frame=frame)

        for side, off in (("L", 0.0), ("R", math.pi)):
            p = phase + off
            # Negative Y rotation swings a limb toward +X, the facing direction.
            rig[f"hip_{side}"].rotation_euler.y = -math.sin(p) * swing
            rig[f"knee_{side}"].rotation_euler.y = max(0.0, -math.sin(p - 0.6)) * swing * 1.5
            rig[f"hip_{side}"].keyframe_insert("rotation_euler", frame=frame)
            rig[f"knee_{side}"].keyframe_insert("rotation_euler", frame=frame)

            if actor.anim == "push":
                # Both arms locked forward and down onto the handle.
                rig[f"shoulder_{side}"].rotation_euler.y = math.radians(-58)
                rig[f"elbow_{side}"].rotation_euler.y = math.radians(-18)
            else:
                # Arms counter-swing against the legs.
                rig[f"shoulder_{side}"].rotation_euler.y = math.sin(p) * arm_swing
                rig[f"elbow_{side}"].rotation_euler.y = math.radians(-12)
            rig[f"shoulder_{side}"].keyframe_insert("rotation_euler", frame=frame)
            rig[f"elbow_{side}"].keyframe_insert("rotation_euler", frame=frame)
