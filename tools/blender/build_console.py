"""Builds the 3D kit for the KeepAlive landing page and exports one GLB.

Run from the repository root:  blender -b -P tools/blender/build_console.py

The landing page shows a desk console: a platter holding twelve monthly parcels,
three offer keys, one cancel key, two guardrail knobs and status lamps.
Moving parts are exported as separate objects with their origin at the base
centre, so the page can place and animate them.

Blender axes: X right, Y away from the viewer, Z up (glTF export converts to Y up).
"""

import math
import os

import bpy

OUT = os.path.normpath(
    os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "public", "landing", "console.glb")
)

bpy.ops.wm.read_factory_settings(use_empty=True)

_MATS = {}


def _lin(c):
    c = c / 255.0
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def mat(name, hex_color, rough=0.6, metal=0.0, emit=0.0):
    if name in _MATS:
        return _MATS[name]
    m = bpy.data.materials.new(name)
    try:
        m.use_nodes = True
    except Exception:
        pass
    bsdf = next(n for n in m.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
    h = hex_color.lstrip("#")
    rgb = tuple(_lin(int(h[i : i + 2], 16)) for i in (0, 2, 4))
    bsdf.inputs["Base Color"].default_value = (*rgb, 1.0)
    bsdf.inputs["Roughness"].default_value = rough
    bsdf.inputs["Metallic"].default_value = metal
    if emit:
        bsdf.inputs["Emission Color"].default_value = (*rgb, 1.0)
        bsdf.inputs["Emission Strength"].default_value = emit
    _MATS[name] = m
    return m


ENAMEL = lambda: mat("enamel", "#86CDB1", 0.3)
PLATE = lambda: mat("faceplate", "#F3ECD8", 0.55)
CHROME = lambda: mat("chrome", "#ECECEE", 0.14, 1.0)
ESPRESSO = lambda: mat("espresso", "#2A1917", 0.5)
TOMATO = lambda: mat("tomato", "#EC4427", 0.28)
KEY = lambda: mat("key", "#F8F2E2", 0.32)
KRAFT = lambda: mat("kraft", "#C9A06C", 0.88)
TAPE = lambda: mat("tape", "#EFE3C8", 0.7)
LABEL = lambda: mat("label", "#FFFDF7", 0.8)
LAMP = lambda: mat("lamp", "#FFF2CC", 0.25)
BOT = lambda: mat("bot", "#F5C542", 0.38)
VISOR = lambda: mat("visor", "#1D1320", 0.1)
EYE = lambda: mat("eye", "#9FF5CF", 0.3, 0.0, 3.0)


def _finish(o, material, bevel=0.0, seg=3):
    bpy.context.view_layer.objects.active = o
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    if bevel:
        mod = o.modifiers.new("bevel", "BEVEL")
        mod.width = bevel
        mod.segments = seg
        bpy.ops.object.modifier_apply(modifier=mod.name)
    for p in o.data.polygons:
        p.use_smooth = True
    try:
        wn = o.modifiers.new("wn", "WEIGHTED_NORMAL")
        wn.keep_sharp = True
        bpy.ops.object.modifier_apply(modifier=wn.name)
    except Exception as exc:
        print("weighted normal skipped:", exc)
    o.data.materials.append(material)
    return o


def box(size, loc, material, bevel=0.04, seg=3, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc, rotation=rot)
    o = bpy.context.active_object
    o.scale = size
    return _finish(o, material, bevel, seg)


def cyl(radius, depth, loc, material, bevel=0.03, seg=3, verts=64, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=radius, depth=depth, location=loc, rotation=rot)
    return _finish(bpy.context.active_object, material, bevel, seg)


def ball(radius, loc, material, scale=(1, 1, 1)):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=40, ring_count=20, radius=radius, location=loc)
    o = bpy.context.active_object
    o.scale = scale
    return _finish(o, material)


def torus(major, minor, loc, material, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_torus_add(
        location=loc, rotation=rot, major_radius=major, minor_radius=minor, major_segments=96, minor_segments=16
    )
    return _finish(bpy.context.active_object, material)


def join(parts, name):
    bpy.ops.object.select_all(action="DESELECT")
    for p in parts:
        p.select_set(True)
    bpy.context.view_layer.objects.active = parts[0]
    if len(parts) > 1:
        bpy.ops.object.join()
    o = bpy.context.active_object
    o.name = name
    o.data.name = name
    bpy.context.scene.cursor.location = (0, 0, 0)
    bpy.ops.object.origin_set(type="ORIGIN_CURSOR")
    return o


# Layout shared with src/components/landing/stage.ts (keep both in sync).
TOP = 1.22  # top of the faceplate
PLATTER = (-2.5, 0.0)
OFFER_KEYS = [(1.25, 1.85), (2.61, 1.85), (3.97, 1.85)]
CANCEL = (3.5, -1.5)
KNOBS = [(0.95, -2.05), (1.9, -2.05)]
LCD = (1.35, -0.55)
LAMPS = [(0.65, 0.45), (1.25, 0.45), (1.85, 0.45)]


def build_body():
    parts = [
        box((10.0, 6.3, 0.2), (0, 0, 0.1), CHROME(), 0.05),
        box((10.4, 6.6, 0.92), (0, 0, 0.66), ENAMEL(), 0.3, 7),
        box((9.5, 5.8, 0.12), (0, 0, TOP - 0.06), PLATE(), 0.05, 3),
        # platter well and rim
        cyl(2.53, 0.04, (*PLATTER, TOP + 0.015), ESPRESSO(), 0.0, 1, 96),
        torus(2.6, 0.075, (*PLATTER, TOP + 0.03), CHROME()),
        # hub
        cyl(0.8, 0.34, (*PLATTER, TOP + 0.2), PLATE(), 0.06, 4, 72),
        torus(0.8, 0.05, (*PLATTER, TOP + 0.08), CHROME()),
        # cancel collar
        cyl(1.02, 0.04, (*CANCEL, TOP + 0.015), ESPRESSO(), 0.0, 1, 72),
        torus(1.06, 0.1, (*CANCEL, TOP + 0.04), CHROME()),
        # display bezel
        box((2.24, 0.84, 0.12), (*LCD, TOP + 0.05), ESPRESSO(), 0.05, 4),
    ]
    for x, y in OFFER_KEYS:
        parts.append(box((1.42, 1.22, 0.08), (x, y, TOP + 0.03), CHROME(), 0.03))
        parts.append(box((1.3, 1.1, 0.03), (x, y, TOP + 0.075), ESPRESSO(), 0.0))
    for x, y in KNOBS:
        parts.append(cyl(0.46, 0.05, (x, y, TOP + 0.02), CHROME(), 0.015, 2, 48))
    for x, y in LAMPS:
        parts.append(cyl(0.17, 0.07, (x, y, TOP + 0.03), CHROME(), 0.02, 2, 32))
    return join(parts, "Body")


def build_platter():
    return join([cyl(2.45, 0.12, (0, 0, 0.06), ESPRESSO(), 0.03, 3, 128)], "Platter")


def build_keys():
    join([cyl(0.92, 0.46, (0, 0, 0.23), TOMATO(), 0.14, 7, 72)], "KeyCancel")
    join([box((1.2, 1.0, 0.36), (0, 0, 0.18), KEY(), 0.1, 6)], "KeyOffer")


def build_knob():
    parts = [
        cyl(0.36, 0.42, (0, 0, 0.21), ESPRESSO(), 0.06, 4, 48),
        box((0.07, 0.3, 0.03), (0, 0.17, 0.425), PLATE(), 0.01, 2),
    ]
    return join(parts, "Knob")


def build_lamp():
    return join([ball(0.13, (0, 0, 0.02), LAMP(), (1, 1, 0.85))], "Lamp")


def build_parcel():
    parts = [
        box((0.62, 0.62, 0.44), (0, 0, 0.22), KRAFT(), 0.025, 2),
        box((0.14, 0.632, 0.446), (0, 0, 0.222), TAPE(), 0.0),
        box((0.24, 0.18, 0.01), (0.17, -0.14, 0.446), LABEL(), 0.0),
    ]
    return join(parts, "Parcel")


def build_bot():
    half_pi = math.pi / 2
    parts = [
        ball(0.5, (0, 0, 0), BOT(), (1, 1, 0.92)),
        ball(0.42, (0, -0.2, 0.04), VISOR(), (0.86, 0.72, 0.5)),
        ball(0.065, (0.15, -0.5, 0.06), EYE()),
        ball(0.065, (-0.15, -0.5, 0.06), EYE()),
        cyl(0.025, 0.3, (0, 0, 0.58), CHROME(), 0.0, 1, 16),
        ball(0.075, (0, 0, 0.76), TOMATO()),
        cyl(0.13, 0.1, (0.5, 0, 0), CHROME(), 0.02, 2, 32, (0, half_pi, 0)),
        cyl(0.13, 0.1, (-0.5, 0, 0), CHROME(), 0.02, 2, 32, (0, half_pi, 0)),
        torus(0.3, 0.035, (0, 0, -0.42), CHROME()),
        cyl(0.05, 0.46, (0, -0.12, -0.6), CHROME(), 0.0, 1, 16),
        ball(0.09, (0, -0.12, -0.86), KEY()),
    ]
    return join(parts, "Bot")


build_body()
build_platter()
build_keys()
build_knob()
build_lamp()
build_parcel()
build_bot()

os.makedirs(os.path.dirname(OUT), exist_ok=True)
bpy.ops.object.select_all(action="SELECT")
bpy.ops.export_scene.gltf(filepath=OUT, export_format="GLB", export_apply=True, export_yup=True)
print("exported", OUT, os.path.getsize(OUT), "bytes")
