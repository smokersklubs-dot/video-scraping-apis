"""Build the text prompt that ships with the control video.

The blockout already states geometry, motion and framing. Repeating that in
words is wasted budget and invites the model to re-interpret what is already
locked. The prompt should only carry what the grey render cannot: material,
era, weather, film stock, grade.
"""
from __future__ import annotations

from .spec import ShotSpec

_MOVE_WORDS = {
    "static": "locked-off camera",
    "dolly_in": "slow dolly in",
    "push_out": "slow dolly out",
    "dolly_side": "lateral tracking move",
    "orbit": "arcing move around the subject",
    "crane": "rising crane move",
}


def build_prompt(spec: ShotSpec) -> str:
    p = spec.prompt
    cam = spec.camera
    parts: list[str] = []

    if p.get("subject"):
        parts.append(p["subject"].strip().rstrip("."))
    if p.get("setting"):
        parts.append(p["setting"].strip().rstrip("."))
    if p.get("action"):
        parts.append(p["action"].strip().rstrip("."))

    tech = [f"{int(cam.lens)}mm lens", _MOVE_WORDS.get(cam.move, cam.move)]
    if cam.shake > 0.35:
        tech.append("handheld")
    if p.get("lighting"):
        tech.append(p["lighting"].strip().rstrip("."))
    if p.get("style"):
        tech.append(p["style"].strip().rstrip("."))
    if p.get("grade"):
        tech.append(p["grade"].strip().rstrip("."))
    parts.append(", ".join(tech))

    prompt = ". ".join(x for x in parts if x) + "."
    if p.get("negative"):
        prompt += f"\n\nAvoid: {p['negative'].strip()}"
    return prompt


STRUCTURE_NOTE = (
    "Use the attached video as the structural reference. Preserve its camera "
    "path, framing, subject placement, timing and silhouettes exactly. Replace "
    "only surface: materials, texture, lighting quality and colour."
)


def build_brief(spec: ShotSpec) -> str:
    """Full copy-paste brief for a hosted render-to-video model."""
    return (
        f"# {spec.shot_id}\n\n"
        f"- Duration: {spec.duration_s:g}s @ {spec.fps}fps "
        f"({spec.frame_count} frames)\n"
        f"- Resolution: {spec.resolution[0]}x{spec.resolution[1]}\n"
        f"- Lens: {spec.camera.lens:g}mm, move: {spec.camera.move}\n\n"
        f"## Prompt\n\n{build_prompt(spec)}\n\n"
        f"## Control instruction\n\n{STRUCTURE_NOTE}\n"
    )
