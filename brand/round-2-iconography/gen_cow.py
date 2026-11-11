#!/usr/bin/env python3
"""The abducted cow for the hero UFO's tractor beam (docs/claude/handoffs/UFO-COW-ICON-HANDOFF.md).

    python gen_cow.py     (needs skia-pathops; reuses brand/round-1-launch/geom.py)

Side view facing right (+x), legs dangling: it's being lifted, not standing. viewBox -12 -10 24 20, origin at the
centre of the body. Drawn ~18px long on desktop and ~11px on phones, so it is all silhouette: a white body with
an ink outline (so it holds on the Day grid), big black patches, a pink snout and udder, short horns.
No ember, no green (the beam is green), no shadow or tilt (the code rotates and bobs it).
Writes nyko-cow.svg to public/brand/ (not loose in this folder: it isn't an explorer tile) and qa/cow-qa.svg.
"""
import base64
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, "..", ".."))
sys.path.insert(0, os.path.join(ROOT, "brand", "round-1-launch"))
import geom as G  # noqa: E402

INK, WHITE, PINK, HORN = "#1E2233", "#F6F8FC", "#F2A7B5", "#DDE2EC"
OUT = 0.65  # outline width outside the silhouette, viewBox units (~0.5px at 18px)
SW = 1.0    # line width for the snout, udder and horn

# ── shapes (viewBox units) ─────────────────────────────────────────
body = G.parse("M -8.4,-1.2 C -8.4,-4.6 -6.4,-5 -3.5,-4.9 L 2.5,-4.9 C 5.2,-4.9 6.2,-3.6 6.2,-1.0 "
               "C 6.2,1.9 4.9,3.3 2.2,3.3 L -4.8,3.3 C -7.3,3.3 -8.4,1.9 -8.4,-1.2 Z")
legs = G.union(*[G.parse(f"M {x - 0.7},1.5 L {x + 0.7},1.5 L {x + 0.65},7.6 Q {x},8.0 {x - 0.65},7.6 Z")
                 for x in (-7.0, -3.9, 0.7, 3.8)])
hooves = G.inter(G.dilate(legs, 0.66), G.rect(-12, 6.3, 24, 3))  # out to the outline edge: no seam
head = G.parse("M 4.7,-6.2 C 5.1,-7.6 8.0,-7.8 9.0,-6.6 C 9.9,-5.6 9.8,-4.6 9.6,-3.6 "
               "C 9.2,-1.9 8.0,-0.8 6.6,-1.0 C 5.0,-1.3 4.3,-4.4 4.7,-6.2 Z")
snout = G.ellipse(9.1, -2.6, 1.9, 1.6, -20)
ear = G.ellipse(4.2, -6.0, 1.7, 0.75, 20)
horn = G.parse("M 5.8,-7.2 Q 5.5,-8.7 6.4,-9.3 Q 6.6,-8.4 7.1,-7.5 Z")
tail = G.stroke(G.parse("M -8.0,-3.4 Q -10.4,-2.6 -10.2,1.6", fill="winding"), 0.9, cap="round", join="round")
tuft = G.ellipse(-10.2, 2.2, 0.9, 1.3, 10)
udder = G.ellipse(-1.2, 3.5, 1.7, 1.15)

# Patches: big blobs, intersected with the body/head so they never cross the outline.
patches = G.union(
    G.inter(G.ellipse(-4.4, -2.8, 3.0, 2.3, -15), body),
    G.inter(G.ellipse(1.8, 0.9, 2.5, 2.1, 20), body),
)
eye = G.circle(7.3, -4.7, 0.7)
nostril = G.circle(10.0, -2.9, 0.35)

silhouette = G.union(body, legs, head, ear, tail)
x0, y0, x1, y1 = G.bounds(G.union(G.dilate(silhouette, OUT), G.dilate(snout, SW / 2), G.dilate(horn, SW * 0.4), tuft))
assert -12 <= x0 and x1 <= 12 and -10 <= y0 and y1 <= 10, (x0, y0, x1, y1)

P = lambda p: G.d(p, 2)  # noqa: E731
svg = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="-12 -10 24 20" width="96" height="80"><title>NYKO cow</title>
<!--
  The abducted cow (hero sky, held in the UFO's tractor beam). Origin (0,0) = centre of the body; facing right (+x),
  legs dangling. ~18px long on desktop, ~11px on phones. No shadow or tilt: the code rotates (±20°) and bobs it.
  Ink outline so the white body holds on the Day grid. Source: brand/round-2-iconography/gen_cow.py.
  Groups, back to front: outline (silhouette, stroked), body (fills), marks (patches, hooves, tuft, eye), pink, horn.
-->
<g id="outline"><path d="{P(silhouette)}" fill="{WHITE}" stroke="{INK}" stroke-width="{OUT * 2}" stroke-linejoin="round"/></g>
<g id="body"><path d="{P(silhouette)}" fill="{WHITE}"/></g>
<g id="marks" fill="{INK}"><path d="{P(G.union(patches, hooves, tuft, eye))}"/></g>
<g id="pink" fill="{PINK}"><path d="{P(G.union(snout, udder))}" stroke="{INK}" stroke-width="{SW}"/><path fill="{INK}" d="{P(nostril)}"/></g>
<g id="horn"><path d="{P(horn)}" fill="{HORN}" stroke="{INK}" stroke-width="{SW * 0.8}" stroke-linejoin="round"/></g>
</svg>
"""
open(os.path.join(ROOT, "public", "brand", "nyko-cow.svg"), "w").write(svg)
print("wrote public/brand/nyko-cow.svg")

# ── QA: 11 / 18 / 32px long (and 160 to read the drawing), plain and inside a beam, at 0 / ±20°, Night and Day ──
b64 = base64.b64encode(svg.encode()).decode()
def cow(x, y, px, rot=0):
    h = px * 20 / 24
    return (f'<g transform="translate({x} {y}) rotate({rot})"><image x="{-px / 2}" y="{-h / 2}" width="{px}" height="{h}" '
            f'href="data:image/svg+xml;base64,{b64}"/></g>')
def beam(x, y, px):
    w, h = px * 1.6, px * 2.4
    return f'<path d="M {x - w * 0.25},{y - h / 2} L {x + w * 0.25},{y - h / 2} L {x + w / 2},{y + h / 2} L {x - w / 2},{y + h / 2} Z" fill="#3FD69B" fill-opacity="0.22"/>'
W, rowH = 900, 220
out = ""
for t, bg in enumerate(("#0F1220", "#F2F4F8")):
    y0 = t * rowH
    out += f'<rect y="{y0}" width="{W}" height="{rowH}" fill="{bg}"/>'
    x = 40
    for px in (11, 18, 32):
        cy = y0 + rowH / 2
        out += cow(x, cy - 40, px) + beam(x, cy + 30, px) + cow(x, cy + 30, px, -20 if px != 18 else 20)
        x += px + 50
    out += cow(x + 120, y0 + rowH / 2, 200)
    out += beam(x + 380, y0 + rowH / 2, 60) + cow(x + 380, y0 + rowH / 2, 60, 15)
os.makedirs(os.path.join(HERE, "qa"), exist_ok=True)
open(os.path.join(HERE, "qa", "cow-qa.svg"), "w").write(
    f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{rowH * 2}" viewBox="0 0 {W} {rowH * 2}">{out}</svg>\n')
print("wrote brand/round-2-iconography/qa/cow-qa.svg")
