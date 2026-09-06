"""Small compatibility shims across Blender API generations.

Blender 4.4 moved animation data into slotted actions, so `action.fcurves` is
gone on 4.4+/5.x. Everything that touches curves goes through here.
"""
from __future__ import annotations

import bpy


def fcurves(obj: bpy.types.Object) -> list[bpy.types.FCurve]:
    """Every F-curve driving `obj`, on legacy and slotted actions alike."""
    anim = obj.animation_data
    if not anim or not anim.action:
        return []
    action = anim.action
    legacy = getattr(action, "fcurves", None)
    if legacy is not None:
        return list(legacy)
    curves: list[bpy.types.FCurve] = []
    for layer in action.layers:
        for strip in layer.strips:
            bag = strip.channelbag(anim.action_slot)
            if bag:
                curves.extend(bag.fcurves)
    return curves


def _first_enabled(sockets, name: str):
    """Nodes with a data_type switch expose several sockets under one name;
    only the ones matching the active type are enabled."""
    for socket in sockets:
        if socket.name == name and socket.enabled:
            return socket
    for socket in sockets:
        if socket.name == name:
            return socket
    raise KeyError(name)


class Compositor:
    """Compositor wiring that works on both node-group (5.x) and
    scene-node-tree (<=4.x) Blender."""

    def __init__(self, scene):
        self.scene = scene
        self.modern = hasattr(scene, "compositing_node_group")
        if self.modern:
            old = scene.compositing_node_group
            group = bpy.data.node_groups.new("previz_comp", "CompositorNodeTree")
            group.interface.new_socket("Image", in_out="OUTPUT",
                                       socket_type="NodeSocketColor")
            scene.compositing_node_group = group
            if old and old.users == 0:
                bpy.data.node_groups.remove(old)
            self.tree = group
            self.output = group.nodes.new("NodeGroupOutput").inputs[0]
        else:
            scene.use_nodes = True
            self.tree = scene.node_tree
            self.tree.nodes.clear()
            self.output = self.tree.nodes.new("CompositorNodeComposite").inputs["Image"]
        self.layers = self.tree.nodes.new("CompositorNodeRLayers")
        self.layers.scene = scene

    def node(self, *idnames):
        """Add the first node id that this Blender knows about."""
        for idname in idnames:
            try:
                return self.tree.nodes.new(idname)
            except RuntimeError:
                continue
        raise RuntimeError(f"no compositor node among {idnames}")

    @staticmethod
    def socket(node, name):
        return _first_enabled(node.inputs, name)

    def link(self, from_socket, to_socket) -> None:
        self.tree.links.new(from_socket, to_socket)

    def to_output(self, from_socket) -> None:
        self.tree.links.new(from_socket, self.output)


def disable_compositor(scene) -> None:
    if hasattr(scene, "compositing_node_group"):
        scene.compositing_node_group = None
    else:
        scene.use_nodes = False
