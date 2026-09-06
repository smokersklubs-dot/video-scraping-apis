"""Command line entry point: `python -m previz <shot.json>`."""
from __future__ import annotations

import argparse
import sys
import time
from pathlib import Path

from .prompt import build_brief
from .render import PASSES, encode


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="previz",
                                     description="Blender blockout -> AI video control passes")
    parser.add_argument("shot", help="path to a shot spec JSON")
    parser.add_argument("--out", default="out", help="output directory")
    parser.add_argument("--passes", default="", help="comma list; default: spec's own")
    parser.add_argument("--res", default="", help="override, e.g. 960x540")
    parser.add_argument("--frames", type=int, default=0, help="cap frame count (quick tests)")
    parser.add_argument("--no-video", action="store_true", help="skip mp4 encoding")
    parser.add_argument("--save-blend", action="store_true", help="also write the .blend")
    args = parser.parse_args(argv)

    from .spec import ShotSpec
    spec = ShotSpec.load(args.shot)
    if args.res:
        w, h = args.res.lower().split("x")
        spec.resolution = [int(w), int(h)]

    import bpy  # imported late so --help works without Blender

    from .build import build_scene
    from . import render as R

    build_scene(spec)
    scene = bpy.context.scene
    if args.frames:
        scene.frame_end = min(scene.frame_end, args.frames)

    out_dir = Path(args.out) / spec.shot_id
    out_dir.mkdir(parents=True, exist_ok=True)

    wanted = [p.strip() for p in args.passes.split(",") if p.strip()] or spec.passes
    unknown = [p for p in wanted if p not in PASSES]
    if unknown:
        parser.error(f"unknown pass(es) {unknown}; available: {list(PASSES)}")

    actor_names = [a.name for a in spec.actors]
    renderers = {
        "clay": lambda: R.render_clay(scene, out_dir),
        "depth": lambda: R.render_depth(scene, out_dir, spec.depth_near, spec.depth_far),
        "normal": lambda: R.render_normal(scene, out_dir),
        "edge": lambda: R.render_edge(scene, out_dir),
        "mask": lambda: R.render_mask(scene, out_dir, actor_names),
    }

    for name in wanted:
        t0 = time.time()
        folder = renderers[name]()
        print(f"[previz] {name}: {len(list(folder.glob('*.png')))} frames "
              f"in {time.time() - t0:.1f}s -> {folder}")
        if not args.no_video:
            mp4 = encode(folder, spec.fps, out_dir / f"{spec.shot_id}_{name}.mp4")
            if mp4:
                print(f"[previz] {name}: {mp4}")

    brief = out_dir / f"{spec.shot_id}_brief.md"
    brief.write_text(build_brief(spec), encoding="utf-8")
    print(f"[previz] brief: {brief}")

    if args.save_blend:
        blend = out_dir / f"{spec.shot_id}.blend"
        bpy.ops.wm.save_as_mainfile(filepath=str(blend))
        print(f"[previz] blend: {blend}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
