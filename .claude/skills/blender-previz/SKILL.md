---
name: blender-previz
description: Build animated grey blockouts in Blender headlessly and render depth/edge/clay control passes to drive AI video generation (render-to-video). Use when the user wants 3D previz, a Blender animation, a control/reference video for Seedance, Runway Aleph, Kling, Veo, or a ControlNet/VACE ComfyUI graph, or asks how to make high-end AI video with locked camera moves and multi-shot continuity.
---

# Blender previz for AI video

The deliverable is **never** a finished render. It is a grey, untextured,
animated blockout plus its control passes. A video model supplies material,
light and grain; the blockout supplies what the model cannot keep stable:
camera path, framing, timing, occlusion, silhouettes.

Adding detail, texture or nice materials to the blockout makes the final
result **worse** — it gives the model contradictory surface cues to fight.

Toolkit lives in `blender-previz/` (see its README for the full pipeline).

## Setup

```bash
pip install bpy==5.0.1 imageio-ffmpeg   # Blender as a Python module, ~1 GB
export LIBGL_ALWAYS_SOFTWARE=1          # required on machines with no GPU
```

Needs `libegl1 libgl1 libglx-mesa0` present, or `import bpy` dies on
`libEGL.so.1`. Workbench and Cycles both render fine on CPU; EEVEE is
unreliable without a real GPU.

## Workflow

1. **Write the shot spec** — `blender-previz/shots/<name>.json`. Metres,
   degrees, millimetres, frame numbers. Real-world scale is not optional: it
   is what makes the perspective legible to the video model.
2. **Iterate cheap and LOOK at the frames.**
   ```bash
   python -m previz shots/<name>.json --res 480x270 --frames 3 --no-video
   ```
   Then actually read the PNG with the Read tool. Blocking mistakes —
   a limb bent backwards, a camera trucking away from its subject, a prop
   behind a wall — are invisible in the JSON and obvious in one frame.
3. **Render the passes** at final resolution once the framing holds.
4. **Send `clay.mp4` + the generated brief** to a hosted R2V model, or
   `depth.mp4` + `edge.mp4` into ControlNet/VACE locally.

## Prompt discipline

Describe only what the grey render cannot: material, era, weather, film stock,
grade. Never restate motion, framing or camera move — they are already in the
pixels, and repeating them invites reinterpretation. Always ship the structure
instruction (`previz.prompt.STRUCTURE_NOTE`).

For a sequence, keep `style` and `grade` byte-identical across shots and keep
`sun_elevation`/`sun_rotation` fixed. That, not the prompt wording, is what
makes shots feel like one film.

## Conventions that bite

- Mannequins face **+X**. Negative Y-rotation swings a limb forward; positive
  bends a knee backward. Get the sign wrong and the character moonwalks.
- Screen-right is `(fwd.y, -fwd.x)`. The opposite sign makes a tracking shot
  drift away from the subject it is meant to follow.
- Walk phase must come from **distance travelled**, never from frame number,
  or the feet slide whenever speed changes.
- Blender 4.4+ removed `action.fcurves` (slotted actions) and Blender 5.0
  replaced `scene.node_tree` with `scene.compositing_node_group`, where
  `Composite` is gone (use a `NodeGroupOutput`) and Map Range / Math / Mix are
  the `ShaderNode*` variants. `previz/bcompat.py` absorbs both.
- Cycles' normal pass is **world space**; ControlNet expects camera space.
  `render_normal` projects onto the camera basis via a `frame_change_pre`
  handler.
- Freestyle (`edge`) is the slow pass. Leave it out of preview loops.

## When the user wants something the library lacks

Add a builder function to `previz/library.py` that stacks primitives, register
it in `BUILDERS`, and drive it from the spec's `params`. Do not model by hand
in a GUI — the whole point is that a shot is a diffable file.
