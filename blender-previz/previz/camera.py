"""Camera rig: the one thing the AI video model must never be allowed to invent.

Lens, height, distance and move are locked here in metres and millimetres, so
every regeneration of the shot reproduces the same parallax and the same
framing. That repeatability is the whole reason to blockout in 3D at all.
"""
from __future__ import annotations

import math

import bpy

from .bcompat import fcurves
from .spec import Camera as CamSpec


def _look_rotation(loc, target) -> tuple[float, float, float]:
    dx, dy, dz = (target[i] - loc[i] for i in range(3))
    flat = math.hypot(dx, dy)
    return (math.atan2(flat, -dz), 0.0, math.atan2(dy, dx) + math.pi / 2)


def build_camera(spec: CamSpec, frame_start: int, frame_end: int,
                 targets: dict[str, bpy.types.Object]) -> bpy.types.Object:
    cam_data = bpy.data.cameras.new("previz_cam")
    cam_data.lens = spec.lens
    cam_data.sensor_width = spec.sensor
    cam = bpy.data.objects.new("previz_cam", cam_data)
    bpy.context.collection.objects.link(cam)
    bpy.context.scene.camera = cam

    start = list(spec.loc)
    look = list(spec.look_at)

    # Forward / right unit vectors in world space, used by the move types.
    fwd = [look[i] - start[i] for i in range(3)]
    length = max(1e-6, math.sqrt(sum(c * c for c in fwd)))
    fwd = [c / length for c in fwd]
    # Screen-right: rotate the flattened forward vector -90 deg about Z.
    right = [fwd[1], -fwd[0], 0.0]
    rlen = max(1e-6, math.hypot(right[0], right[1]))
    right = [right[0] / rlen, right[1] / rlen, 0.0]

    a = spec.move_amount
    end = list(start)
    end_look = list(look)
    if spec.move == "dolly_in":
        end = [start[i] + fwd[i] * a for i in range(3)]
    elif spec.move == "push_out":
        end = [start[i] - fwd[i] * a for i in range(3)]
    elif spec.move == "dolly_side":
        end = [start[i] + right[i] * a for i in range(3)]
        end_look = [look[i] + right[i] * a for i in range(3)]
    elif spec.move == "crane":
        end = [start[0], start[1], start[2] + a]
    elif spec.move == "orbit":
        ang = math.radians(a)
        ox, oy = start[0] - look[0], start[1] - look[1]
        end = [look[0] + ox * math.cos(ang) - oy * math.sin(ang),
               look[1] + ox * math.sin(ang) + oy * math.cos(ang),
               start[2]]

    cam.location = start
    cam.rotation_euler = _look_rotation(start, look)
    cam.keyframe_insert("location", frame=frame_start)
    cam.keyframe_insert("rotation_euler", frame=frame_start)
    cam.location = end
    cam.rotation_euler = _look_rotation(end, end_look)
    cam.keyframe_insert("location", frame=frame_end)
    cam.keyframe_insert("rotation_euler", frame=frame_end)

    # Ease the move so it starts and stops like a real dolly, not a robot.
    for fcurve in fcurves(cam):
        for kp in fcurve.keyframe_points:
            kp.interpolation = "BEZIER"
            kp.easing = "EASE_IN_OUT"

    if spec.track and spec.track in targets:
        con = cam.constraints.new("TRACK_TO")
        con.target = targets[spec.track]
        con.track_axis = "TRACK_NEGATIVE_Z"
        con.up_axis = "UP_Y"

    if spec.shake > 0:
        _add_handheld(cam, spec.shake, frame_end - frame_start)

    if spec.dof_target and spec.dof_target in targets:
        cam_data.dof.use_dof = True
        cam_data.dof.focus_object = targets[spec.dof_target]
        cam_data.dof.aperture_fstop = spec.fstop
    return cam


def _add_handheld(cam: bpy.types.Object, amount: float, frames: int) -> None:
    """Noise modifiers on the camera curves: cheap, and the model reads it as
    an operator holding the shot rather than a rendered flythrough."""
    for fcurve in fcurves(cam):
        noise = fcurve.modifiers.new("NOISE")
        rotational = fcurve.data_path == "rotation_euler"
        noise.strength = amount * (0.012 if not rotational else 0.010)
        noise.scale = max(4.0, frames / 8.0)
        noise.phase = fcurve.array_index * 17.0 + (3.0 if rotational else 0.0)
