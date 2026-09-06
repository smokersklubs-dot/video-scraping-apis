"""Multi-pass renderer: one blockout, several control signals.

Passes are not decoration. Each one drives a different consumer:
  clay   - the reference/structure video for a hosted R2V model (Seedance,
           Runway Aleph, Kling): it carries form, layout and motion.
  depth  - ControlNet-Depth / VACE in a local ComfyUI graph: strongest hold on
           3D structure, tolerant of restyling.
  normal - surface orientation; keeps flat walls flat under heavy restyle.
  edge   - Freestyle lines, the Canny-equivalent: locks hard silhouettes.
  mask   - per-actor grey levels for inpainting or region-locked edits.
"""
from __future__ import annotations

import shutil
import subprocess
from pathlib import Path

import bpy
from mathutils import Vector

from .bcompat import Compositor, disable_compositor

PASSES = ("clay", "depth", "normal", "edge", "mask")


def _png(scene, folder: Path) -> None:
    folder.mkdir(parents=True, exist_ok=True)
    scene.render.filepath = str(folder / "f_")
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGB"
    scene.render.image_settings.color_depth = "8"
    scene.render.film_transparent = False


def _cycles(scene, samples: int = 1) -> None:
    scene.render.engine = "CYCLES"
    scene.cycles.device = "CPU"
    scene.cycles.samples = samples
    scene.cycles.use_denoising = False
    scene.cycles.max_bounces = 2


def render_clay(scene, out_dir: Path) -> Path:
    """Workbench studio clay - the exact grey look of the reference workflow."""
    scene.render.engine = "BLENDER_WORKBENCH"
    shading = scene.display.shading
    shading.light = "STUDIO"
    shading.color_type = "SINGLE"
    shading.single_color = (0.5, 0.5, 0.5)
    shading.show_cavity = True
    shading.cavity_type = "BOTH"
    shading.show_shadows = True
    shading.show_object_outline = False
    scene.display.render_aa = "8"
    scene.render.use_freestyle = False
    disable_compositor(scene)
    folder = out_dir / "clay"
    _png(scene, folder)
    bpy.ops.render.render(animation=True)
    return folder


def auto_depth_range(scene, exclude=("ground",)) -> tuple[float, float]:
    """Fit the depth ramp to the geometry that actually matters.

    A fixed 2-40m ramp wastes almost the whole 8-bit range on empty asphalt;
    fitting it to the set bounds is what makes the depth pass usable as a
    ControlNet input rather than a flat grey card."""
    cam = scene.camera
    if cam is None:
        return 2.0, 40.0
    samples: list[float] = []
    frames = {scene.frame_start, (scene.frame_start + scene.frame_end) // 2,
              scene.frame_end}
    current = scene.frame_current
    for frame in sorted(frames):
        scene.frame_set(frame)
        origin = cam.matrix_world.translation
        for obj in scene.objects:
            if obj.type != "MESH" or any(x in obj.name for x in exclude):
                continue
            for corner in obj.bound_box:
                world = obj.matrix_world @ Vector(corner)
                samples.append((world - origin).length)
    scene.frame_set(current)
    if not samples:
        return 2.0, 40.0
    samples.sort()
    near = max(0.1, samples[0] * 0.92)
    far = samples[int(len(samples) * 0.98) - 1] * 1.06
    return near, max(near + 1.0, far)


def render_depth(scene, out_dir: Path, near: float | None = None,
                 far: float | None = None) -> Path:
    """Normalised inverse depth: near = white, far = black (ControlNet's
    convention, and what every depth-conditioned video model expects)."""
    if near is None or far is None:
        near, far = auto_depth_range(scene)
    _cycles(scene)
    scene.render.use_freestyle = False
    bpy.context.view_layer.use_pass_z = True
    comp = Compositor(scene)
    remap = comp.node("ShaderNodeMapRange", "CompositorNodeMapRange")
    remap.clamp = True
    comp.socket(remap, "From Min").default_value = near
    comp.socket(remap, "From Max").default_value = far
    comp.socket(remap, "To Min").default_value = 1.0
    comp.socket(remap, "To Max").default_value = 0.0
    comp.link(comp.layers.outputs["Depth"], comp.socket(remap, "Value"))
    comp.to_output(remap.outputs["Result"] if "Result" in remap.outputs
                   else remap.outputs[0])
    folder = out_dir / "depth"
    _png(scene, folder)
    bpy.ops.render.render(animation=True)
    return folder


def render_normal(scene, out_dir: Path) -> Path:
    """Camera-space normals remapped from [-1,1] to [0,1]."""
    _cycles(scene)
    scene.render.use_freestyle = False
    bpy.context.view_layer.use_pass_normal = True
    comp = Compositor(scene)

    # Cycles gives world-space normals; ControlNet-Normal and every
    # normal-conditioned video model expect camera space. Project onto the
    # camera basis with three dot products, refreshed each frame by a handler.
    dots = []
    for _ in range(3):
        dot = comp.node("ShaderNodeVectorMath")
        dot.operation = "DOT_PRODUCT"
        comp.link(comp.layers.outputs["Normal"], dot.inputs[0])
        dots.append(dot)
    combine = comp.node("ShaderNodeCombineXYZ")
    for i, dot in enumerate(dots):
        comp.link(dot.outputs["Value"], combine.inputs[i])

    remap = comp.node("ShaderNodeMapRange", "CompositorNodeMapRange")
    remap.data_type = "FLOAT_VECTOR"
    remap.clamp = True
    comp.socket(remap, "From Min").default_value = (-1.0, -1.0, -1.0)
    comp.socket(remap, "From Max").default_value = (1.0, 1.0, 1.0)
    comp.socket(remap, "To Min").default_value = (0.0, 0.0, 0.0)
    comp.socket(remap, "To Max").default_value = (1.0, 1.0, 1.0)
    comp.link(combine.outputs["Vector"], comp.socket(remap, "Vector"))
    comp.to_output(remap.outputs["Vector"])

    def sync_basis(scn, _depsgraph=None):
        basis = scn.camera.matrix_world.to_3x3()
        for i, dot in enumerate(dots):
            dot.inputs[1].default_value = basis.col[i].normalized()

    sync_basis(scene)
    bpy.app.handlers.frame_change_pre.append(sync_basis)
    try:
        folder = out_dir / "normal"
        _png(scene, folder)
        bpy.ops.render.render(animation=True)
    finally:
        bpy.app.handlers.frame_change_pre.remove(sync_basis)
    return folder


def render_edge(scene, out_dir: Path, thickness: float = 1.6) -> Path:
    """White Freestyle lines on black: a clean, temporally stable Canny."""
    _cycles(scene)
    disable_compositor(scene)
    if scene.world and scene.world.use_nodes:
        bg = scene.world.node_tree.nodes.get("Background")
        if bg:
            bg.inputs["Strength"].default_value = 0.0
    for light in [o for o in scene.objects if o.type == "LIGHT"]:
        light.hide_render = True

    scene.render.use_freestyle = True
    view_layer = bpy.context.view_layer
    view_layer.use_freestyle = True
    fs = view_layer.freestyle_settings
    for existing in list(fs.linesets):
        fs.linesets.remove(existing)
    lineset = fs.linesets.new("previz_lines")
    lineset.select_silhouette = True
    lineset.select_border = True
    lineset.select_crease = True
    lineset.linestyle.color = (1.0, 1.0, 1.0)
    lineset.linestyle.thickness = thickness

    folder = out_dir / "edge"
    _png(scene, folder)
    bpy.ops.render.render(animation=True)

    scene.render.use_freestyle = False
    for light in [o for o in scene.objects if o.type == "LIGHT"]:
        light.hide_render = False
    if scene.world and scene.world.use_nodes:
        bg = scene.world.node_tree.nodes.get("Background")
        if bg:
            bg.inputs["Strength"].default_value = 1.0
    return folder


def render_mask(scene, out_dir: Path, actor_names: list[str]) -> Path:
    """One grey level per actor, background black - drives regional edits."""
    if not actor_names:
        actor_names = []
    index_of = {name: i + 1 for i, name in enumerate(actor_names)}
    for obj in scene.objects:
        obj.pass_index = 0
        for name, idx in index_of.items():
            if obj.name == name or obj.name.startswith(f"{name}_"):
                obj.pass_index = idx

    _cycles(scene)
    scene.render.use_freestyle = False
    bpy.context.view_layer.use_pass_object_index = True
    comp = Compositor(scene)
    div = comp.node("ShaderNodeMath", "CompositorNodeMath")
    div.operation = "DIVIDE"
    div.inputs[1].default_value = float(max(1, len(index_of)))
    index_out = ("Object Index" if "Object Index" in comp.layers.outputs
                 else "IndexOB")
    comp.link(comp.layers.outputs[index_out], div.inputs[0])
    comp.to_output(div.outputs[0])
    folder = out_dir / "mask"
    _png(scene, folder)
    bpy.ops.render.render(animation=True)
    return folder


def encode(folder: Path, fps: int, out_file: Path) -> Path | None:
    """PNG sequence -> H.264 mp4. yuv420p + even dimensions so every hosted
    model's uploader accepts it."""
    ffmpeg = shutil.which("ffmpeg")
    if not ffmpeg:
        try:
            import imageio_ffmpeg
            ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
        except Exception:
            return None
    out_file.parent.mkdir(parents=True, exist_ok=True)
    cmd = [ffmpeg, "-y", "-loglevel", "error", "-framerate", str(fps),
           "-pattern_type", "glob", "-i", str(folder / "*.png"),
           "-vf", "pad=ceil(iw/2)*2:ceil(ih/2)*2", "-c:v", "libx264",
           "-preset", "slow", "-crf", "16", "-pix_fmt", "yuv420p",
           str(out_file)]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError(f"ffmpeg failed: {result.stderr[:500]}")
    return out_file
