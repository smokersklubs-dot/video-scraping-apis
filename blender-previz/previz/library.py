"""Grey-primitive set library.

Every builder returns untextured blockout geometry. Detail is deliberately
absent: the AI video model invents surface, the blockout owns form, scale,
occlusion and camera parallax. Adding detail here makes the restyle *worse*,
because it gives the model contradictory texture cues to fight.
"""
from __future__ import annotations

import math

import bpy

CLAY_NAME = "PREVIZ_CLAY"


def clay_material() -> bpy.types.Material:
    """One shared grey material for the whole scene."""
    mat = bpy.data.materials.get(CLAY_NAME)
    if mat:
        return mat
    mat = bpy.data.materials.new(CLAY_NAME)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs["Base Color"].default_value = (0.5, 0.5, 0.5, 1.0)
        bsdf.inputs["Roughness"].default_value = 0.65
    return mat


def _link(obj: bpy.types.Object, parent: bpy.types.Object | None = None) -> bpy.types.Object:
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(clay_material())
    if parent:
        obj.parent = parent
    return obj


def box(name, size=(1, 1, 1), loc=(0, 0, 0), parent=None) -> bpy.types.Object:
    """Axis-aligned box whose origin sits at its centre."""
    mesh = bpy.data.meshes.new(name)
    sx, sy, sz = (s / 2 for s in size)
    verts = [(x * sx, y * sy, z * sz)
             for x in (-1, 1) for y in (-1, 1) for z in (-1, 1)]
    faces = [(0, 1, 3, 2), (4, 6, 7, 5), (0, 4, 5, 1),
             (2, 3, 7, 6), (0, 2, 6, 4), (1, 5, 7, 3)]
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    obj.location = loc
    return _link(obj, parent)


def cylinder(name, radius=0.5, depth=1.0, loc=(0, 0, 0), segments=16,
             rot=(0, 0, 0), parent=None) -> bpy.types.Object:
    mesh = bpy.data.meshes.new(name)
    verts, faces = [], []
    for i in range(segments):
        a = 2 * math.pi * i / segments
        verts.append((math.cos(a) * radius, math.sin(a) * radius, -depth / 2))
        verts.append((math.cos(a) * radius, math.sin(a) * radius, depth / 2))
    for i in range(segments):
        j = (i + 1) % segments
        faces.append((2 * i, 2 * j, 2 * j + 1, 2 * i + 1))
    faces.append(tuple(range(0, 2 * segments, 2)))
    faces.append(tuple(range(2 * segments - 1, 0, -2)))
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    obj.location = loc
    obj.rotation_euler = rot
    return _link(obj, parent)


def empty(name, loc=(0, 0, 0), parent=None) -> bpy.types.Object:
    obj = bpy.data.objects.new(name, None)
    obj.empty_display_size = 0.2
    obj.location = loc
    bpy.context.collection.objects.link(obj)
    if parent:
        obj.parent = parent
    return obj


# --------------------------------------------------------------------------
# Set pieces
# --------------------------------------------------------------------------

def ground(name="ground", size=120.0, **_) -> bpy.types.Object:
    return box(name, size=(size, size, 0.2), loc=(0, 0, -0.1))


def wall(name="wall", size=(8, 0.3, 3), loc=(0, 0, 0), **_) -> bpy.types.Object:
    return box(name, size=size, loc=(loc[0], loc[1], loc[2] + size[2] / 2))


def crate(name="crate", size=(0.8, 0.8, 0.8), loc=(0, 0, 0), **_) -> bpy.types.Object:
    return box(name, size=size, loc=(loc[0], loc[1], loc[2] + size[2] / 2))


def pole(name="pole", height=4.0, radius=0.06, loc=(0, 0, 0), **_) -> bpy.types.Object:
    return cylinder(name, radius=radius, depth=height,
                    loc=(loc[0], loc[1], loc[2] + height / 2))


def storefront(name="storefront", size=(14, 8, 4.2), loc=(0, 0, 0),
               bays=4, sign=True, **_) -> bpy.types.Object:
    """A one-storey shop: back volume, glazed front bays, awning, roof sign.

    The glass is modelled as *recessed voids* between mullions rather than a
    flat plane - that recess is what gives the AI model a reflective interior
    to invent instead of a blank wall.
    """
    w, d, h = size
    root = empty(f"{name}_root", loc=loc)

    box(f"{name}_body", size=(w, d, h), loc=(0, d / 2, h / 2), parent=root)
    # Front facade split into piers so the bays read as recessed glazing.
    pier_w = 0.45
    bay_w = (w - pier_w * (bays + 1)) / bays
    for i in range(bays + 1):
        x = -w / 2 + pier_w / 2 + i * (pier_w + bay_w)
        box(f"{name}_pier_{i}", size=(pier_w, 0.5, h * 0.78),
            loc=(x, -0.15, h * 0.39), parent=root)
    # Header above the glazing + low bulkhead below it.
    box(f"{name}_header", size=(w, 0.6, h * 0.22),
        loc=(0, -0.2, h * 0.89), parent=root)
    box(f"{name}_kick", size=(w, 0.5, 0.35), loc=(0, -0.15, 0.175), parent=root)
    # Awning: a slab that throws the hard shadow line across the facade.
    box(f"{name}_awning", size=(w + 1.2, 2.4, 0.25),
        loc=(0, -1.3, h * 0.82), parent=root)
    box(f"{name}_parapet", size=(w + 0.4, d + 0.4, 0.5),
        loc=(0, d / 2, h + 0.25), parent=root)
    if sign:
        box(f"{name}_sign", size=(w * 0.55, 0.25, 0.9),
            loc=(0, -0.3, h + 0.7), parent=root)
    box(f"{name}_sidewalk", size=(w + 6, 3.5, 0.15),
        loc=(0, -2.0, 0.06), parent=root)
    return root


def sedan(name="sedan", length=5.2, width=2.0, loc=(0, 0, 0), **_) -> bpy.types.Object:
    """Full-size 70s sedan blockout: long hood, low greenhouse, deep trunk."""
    root = empty(f"{name}_root", loc=loc)
    body_h = 0.62
    box(f"{name}_body", size=(length, width, body_h),
        loc=(0, 0, 0.55), parent=root)
    box(f"{name}_cabin", size=(length * 0.44, width * 0.92, 0.66),
        loc=(-length * 0.06, 0, 1.18), parent=root)
    box(f"{name}_hood", size=(length * 0.34, width * 0.94, 0.14),
        loc=(length * 0.31, 0, 0.9), parent=root)
    box(f"{name}_trunk", size=(length * 0.26, width * 0.94, 0.14),
        loc=(-length * 0.36, 0, 0.9), parent=root)
    for sx, sy in ((0.32, 0.5), (0.32, -0.5), (-0.32, 0.5), (-0.32, -0.5)):
        cylinder(f"{name}_wheel", radius=0.36, depth=0.24, segments=20,
                 loc=(length * sx, width * sy, 0.36),
                 rot=(math.pi / 2, 0, 0), parent=root)
    return root


def pallet_stack(name="pallet", rows=3, cols=3, layers=2, roll_r=0.28,
                 roll_h=0.42, loc=(0, 0, 0), on_cart=True, **_) -> bpy.types.Object:
    """A wheeled pallet of stacked cylinders - the reference shot's hero prop."""
    root = empty(f"{name}_root", loc=loc)
    deck_z = 0.22 if on_cart else 0.08
    pw, pd = cols * roll_r * 2.15, rows * roll_r * 2.15
    box(f"{name}_deck", size=(pw, pd, 0.12), loc=(0, 0, deck_z), parent=root)
    if on_cart:
        for sx, sy in ((0.4, 0.4), (0.4, -0.4), (-0.4, 0.4), (-0.4, -0.4)):
            cylinder(f"{name}_caster", radius=0.09, depth=0.06, segments=12,
                     loc=(pw * sx, pd * sy, 0.09),
                     rot=(math.pi / 2, 0, 0), parent=root)
        box(f"{name}_handle", size=(0.06, pd, 0.06),
            loc=(-pw / 2 - 0.1, 0, 1.05), parent=root)
        for sy in (0.45, -0.45):
            box(f"{name}_upright", size=(0.06, 0.06, 0.95),
                loc=(-pw / 2 - 0.1, pd * sy, 0.6), parent=root)
    for layer in range(layers):
        # Small gap between layers so each roll reads as a separate cylinder.
        z = deck_z + 0.06 + roll_h / 2 + layer * (roll_h + 0.03)
        for r in range(rows):
            for c in range(cols):
                x = (c - (cols - 1) / 2) * roll_r * 2.15
                y = (r - (rows - 1) / 2) * roll_r * 2.15
                cylinder(f"{name}_roll", radius=roll_r, depth=roll_h,
                         segments=14, loc=(x, y, z), parent=root)
    return root


def shelf_row(name="shelf", length=6.0, height=1.8, levels=4,
              loc=(0, 0, 0), **_) -> bpy.types.Object:
    root = empty(f"{name}_root", loc=loc)
    for i in range(levels):
        z = 0.25 + i * (height - 0.25) / max(1, levels - 1)
        box(f"{name}_level_{i}", size=(length, 0.6, 0.06),
            loc=(0, 0, z), parent=root)
    for sx in (-0.5, 0.5):
        box(f"{name}_side", size=(0.08, 0.6, height),
            loc=(length * sx, 0, height / 2), parent=root)
    return root


BUILDERS = {
    "ground": ground,
    "wall": wall,
    "crate": crate,
    "pole": pole,
    "storefront": storefront,
    "sedan": sedan,
    "pallet_stack": pallet_stack,
    "shelf_row": shelf_row,
    "box": lambda name="box", size=(1, 1, 1), loc=(0, 0, 0), **_: box(
        name, size=size, loc=(loc[0], loc[1], loc[2] + size[2] / 2)),
}


def sphere(name, radius=0.5, loc=(0, 0, 0), parent=None) -> bpy.types.Object:
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=radius, location=(0, 0, 0))
    obj = bpy.context.object
    obj.name = name
    obj.data.materials.clear()
    obj.data.materials.append(clay_material())
    obj.location = loc
    if parent:
        obj.parent = parent
    return obj
