"""Turn a ShotSpec into a finished Blender scene."""
from __future__ import annotations

import math

import bpy

from . import actors as act
from . import library as lib
from .camera import build_camera
from .spec import ShotSpec


def build_scene(spec: ShotSpec) -> dict[str, bpy.types.Object]:
    bpy.ops.wm.read_factory_settings(use_empty=True)

    scene = bpy.context.scene
    scene.frame_start = 1
    scene.frame_end = spec.frame_count
    scene.render.fps = spec.fps
    scene.render.resolution_x, scene.render.resolution_y = spec.resolution
    scene.render.resolution_percentage = 100

    _build_world(spec)

    targets: dict[str, bpy.types.Object] = {}
    for prop in spec.props:
        builder = lib.BUILDERS.get(prop.type)
        if builder is None:
            raise ValueError(
                f"unknown prop type {prop.type!r}; known: {sorted(lib.BUILDERS)}")
        kwargs = dict(prop.params)
        kwargs.update(name=prop.name or prop.type, loc=prop.loc)
        if prop.size:
            kwargs["size"] = tuple(prop.size)
        obj = builder(**kwargs)
        obj.rotation_euler.z = math.radians(prop.rot_z)
        targets[prop.name or prop.type] = obj

    scene.frame_set(scene.frame_start)
    for actor in spec.actors:
        rig = act.build_mannequin(actor)
        act.animate(actor, rig, scene.frame_start, scene.frame_end)
        # Tracking and focus want the chest, not the feet.
        targets[actor.name] = rig["hips"]
        targets[f"{actor.name}_root"] = rig["root"]
        scene.frame_set(scene.frame_start)
        if actor.carries and actor.carries in targets:
            # Parent keeping the world transform, so the prop stays where the
            # layout put it and then rides with the actor from frame 1.
            carried = targets[actor.carries]
            carried.parent = rig["root"]
            carried.matrix_parent_inverse = rig["root"].matrix_world.inverted()

    build_camera(spec.camera, scene.frame_start, scene.frame_end, targets)
    return targets


def _build_world(spec: ShotSpec) -> None:
    """Key sun + soft sky. Direction matters more than intensity: the AI model
    reads the shadow angle and keeps it."""
    world = bpy.data.worlds.new("previz_world")
    world.use_nodes = True
    bg = world.node_tree.nodes.get("Background")
    if bg:
        bg.inputs["Color"].default_value = (0.55, 0.6, 0.68, 1.0)
        bg.inputs["Strength"].default_value = 1.0
    bpy.context.scene.world = world

    sun_data = bpy.data.lights.new("previz_sun", type="SUN")
    sun_data.energy = 3.0
    sun_data.angle = math.radians(2.0)
    sun = bpy.data.objects.new("previz_sun", sun_data)
    bpy.context.collection.objects.link(sun)
    sun.location = (0, 0, 20)
    sun.rotation_euler = (
        math.radians(90 - spec.sun_elevation), 0.0, math.radians(spec.sun_rotation))
