#!/usr/bin/env python3
"""NYKO Flight Mode art: laser pod + three HUD glyphs + QA sheet.

Brief: docs/claude/handoffs/FLIGHT-MODE-ICON-HANDOFF.md. Regenerate; never hand-edit outputs.

    python3 gen_flight.py     # needs skia-pathops (geom.py)

Writes, relative to the repo root:
  brand/round-1-launch/nyko-laser-pod.svg  + copy in public/brand/
  brand/round-1-launch/nyko-ui-{hull,laser,target,shield,repair,overclock}.svg  + copies in public/brand/ui/
  brand/round-1-launch/nyko-pickup-{shield,repair,overclock}.svg  + copies in public/brand/
  brand/round-1-launch/nyko-flight-los.svg  (game-over plate) + copy in public/brand/
  brand/round-1-launch/qa/flight-mode-qa.svg  (pod on the rocket at 1x and 0.4x, glyphs at 24/16, Night + Day)

The glyph functions are also exported as FLIGHT_GLYPHS so gen.py includes them in a full run.
"""
import math
import re
import shutil
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent
sys.path.insert(0, str(HERE))
import geom as G  # noqa: E402

INK = "#1E2233"
SHADOW = "#525C7A"
MID = "#9AA4BE"
LIGHT = "#C9CFDE"
BLUE = "#3238C9"
NIGHT = "#101322"
DAY = "#F4F5F9"
OUTLINE = 'stroke="rgba(30,34,51,0.75)" stroke-width="1.6" stroke-linejoin="round"'
EDGE = f'stroke="{INK}" stroke-width="1" stroke-linejoin="round"'


def f(v):
    return G.fmt(v, 2)


# =============================================================== laser pod ====
# Rocket units, rocket origin. A parallelogram linkage: two equal arms hinge on a
# hard-point plate on the core stage and carry the gun, so the barrel stays
# parallel to +x through the whole swing. One angle drives everything:
#   gun origin = HINGE_REAR + ARM * (cos a, sin a),  a: 180deg stowed -> 270deg deployed
HINGE_REAR = (16.0, -17.5)
HINGE_FRONT = (36.0, -17.5)
ARM = 13.0
A_STOWED, A_DEPLOYED = 180.0, 270.0
AXIS = -2.5          # barrel axis, gun-local y
MUZZLE_X = 65.0      # gun-local x of the muzzle face


def hull_y(x):
    """Core-stage upper edge in the mark: M -60,-17.5 Q 10,-15.5 58,-15.5 (y = -15.5 - 2(1-t)^2)."""
    lo, hi = 0.0, 1.0
    for _ in range(60):
        t = (lo + hi) / 2
        xt = -60 * (1 - t) ** 2 + 20 * t * (1 - t) + 58 * t * t
        lo, hi = (t, hi) if xt < x else (lo, t)
    return -15.5 - 2 * (1 - t) ** 2


def gun_origin(a):
    r = math.radians(a)
    return (HINGE_REAR[0] + ARM * math.cos(r), HINGE_REAR[1] + ARM * math.sin(r))


def pod_plate():
    # hard-point saddle: follows the hull line, flat top just above the hinge pins
    xs = [9 + i * 34 / 12 for i in range(13)]
    under = " ".join(f"L {f(x)},{f(hull_y(x) + 0.6)}" for x in reversed(xs))
    d = f"M {f(xs[0])},{f(hull_y(xs[0]))} L 12,-19.5 L 40,-19.5 L {f(xs[-1])},{f(hull_y(xs[-1]))} {under} Z"
    return (f'<path d="{d}" fill="{SHADOW}" {EDGE}/>'
            f'<circle cx="{f(HINGE_REAR[0])}" cy="{f(HINGE_REAR[1])}" r="1.6" fill="{INK}"/>'
            f'<circle cx="{f(HINGE_FRONT[0])}" cy="{f(HINGE_FRONT[1])}" r="1.6" fill="{INK}"/>')


def pod_arm(hinge, a, gid):
    # arm-local: hinge at (0,0), gun pin at (ARM,0)
    return (f'<g id="{gid}" transform="translate({f(hinge[0])} {f(hinge[1])}) rotate({f(a)})">'
            f'<rect x="-2.2" y="-2.2" width="{f(ARM + 4.4)}" height="4.4" rx="2.2" fill="{MID}" {EDGE}/>'
            f'<circle cx="{f(ARM)}" cy="0" r="1.2" fill="{INK}"/></g>')


def pod_gun(origin, gid):
    # gun-local: rear pin at (0,0), front pin at (20,0), barrel axis y = AXIS, muzzle face x = MUZZLE_X
    housing = "M -10,-3.7 Q -10,-5.7 -8,-5.7 L 20,-5.7 L 26,-4.4 L 26,-0.6 L 20,0.8 L -8,0.8 Q -10,0.8 -10,-1.2 Z"
    return (f'<g id="{gid}" transform="translate({f(origin[0])} {f(origin[1])})">'
            f'<rect x="25" y="-5" width="34" height="5" fill="{MID}" {EDGE}/>'               # barrel
            f'<rect x="29" y="-5.75" width="5" height="6.5" fill="{BLUE}" {EDGE}/>'               # focusing coil
            f'<rect x="58" y="-5.75" width="7" height="6.5" fill="{INK}"/>'                    # muzzle brake
            f'<path d="{housing}" fill="url(#pod-hull)" {OUTLINE}/>'                           # housing
            f'<path d="M 9,-5.7 V 0.8" fill="none" stroke="{INK}" stroke-opacity=".4" stroke-width="1"/>'
            f'<circle cx="0" cy="0" r="1.2" fill="{INK}"/><circle cx="20" cy="0" r="1.2" fill="{INK}"/>'
            f'</g>')


def pod_state(name, a):
    return (f'<g id="{name}">' + pod_arm(HINGE_REAR, a, f"{name}-arm-rear")
            + pod_arm(HINGE_FRONT, a, f"{name}-arm-front") + pod_gun(gun_origin(a), f"{name}-gun") + "</g>")


def pod_defs():
    # userSpaceOnUse in gun-local units (the gradient is resolved inside the gun's transform)
    return ('<linearGradient id="pod-hull" x1="0" y1="-5.7" x2="0" y2="0.8" gradientUnits="userSpaceOnUse">'
            f'<stop offset="0" stop-color="{LIGHT}"/><stop offset="0.55" stop-color="{MID}"/>'
            f'<stop offset="1" stop-color="{SHADOW}"/></linearGradient>')


def pod_body(state="deployed"):
    """Plate + both states; only `state` is displayed."""
    other = "stowed" if state == "deployed" else "deployed"
    s = {"stowed": pod_state("stowed", A_STOWED), "deployed": pod_state("deployed", A_DEPLOYED)}
    return (f'<g id="mount">{pod_plate()}</g>'
            + s[other].replace(f'<g id="{other}">', f'<g id="{other}" display="none">', 1) + s[state])


def pod_svg():
    so, do = gun_origin(A_STOWED), gun_origin(A_DEPLOYED)
    muzzle = (do[0] + MUZZLE_X, do[1] + AXIS)
    head = f"""<!--
  NYKO laser pod (Flight Mode). Units = rocket units; (0,0) = the rocket origin, so draw it inside the
  rocket's own transform, after the hull. Brief: docs/claude/handoffs/FLIGHT-MODE-ICON-HANDOFF.md.

  Groups, back to front: mount (fixed plate + hinge pins), then one state group, each holding
  <state>-arm-rear, <state>-arm-front, <state>-gun. Both states share the same parts; only transforms differ.
  `deployed` is displayed; `stowed` carries display="none". Ignore display when porting.

  Anchors (rocket units):
    mount         rear hinge {f(HINGE_REAR[0])},{f(HINGE_REAR[1])}   (front hinge {f(HINGE_FRONT[0])},{f(HINGE_FRONT[1])})
    muzzle        {f(muzzle[0])},{f(muzzle[1])}   deployed; bolts travel +x from here
    muzzle (stowed, for reference)  {f(so[0] + MUZZLE_X)},{f(so[1] + AXIS)}

  Deploy = parallelogram linkage, one parameter. Arm length {f(ARM)}. Arm angle a: {f(A_STOWED)}deg stowed -> {f(A_DEPLOYED)}deg deployed
  (SVG angles, y down). For t in 0..1:
    a   = {f(A_STOWED)} + {f(A_DEPLOYED - A_STOWED)}*ease(t)
    arm-rear  : translate({f(HINGE_REAR[0])} {f(HINGE_REAR[1])}) rotate(a)
    arm-front : translate({f(HINGE_FRONT[0])} {f(HINGE_FRONT[1])}) rotate(a)
    gun       : translate({f(HINGE_REAR[0])}+{f(ARM)}*cos(a), {f(HINGE_REAR[1])}+{f(ARM)}*sin(a))   barrel stays parallel to +x
  Gun origin: stowed {f(so[0])},{f(so[1])} -> deployed {f(do[0])},{f(do[1])}. Barrel axis y: {f(so[1] + AXIS)} stowed, {f(do[1] + AXIS)} deployed.

  Clearances: stowed top edge y -23.2 (outline to -24.0), so it stays inside y -24. Deployed barrel tip x {f(muzzle[0])}, which is under 110.
  Footprint x {f(so[0] - 10)}..{f(muzzle[0])}, clear of the N-Y-K-O lettering (x <= -33) and the booster tips (x -31).
  Palette: rocket hull gradient, ink, one blue part (focusing coil). No ember.
-->"""
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="-16 -44 116 32" width="464" height="128">'
            f'<title>NYKO laser pod</title>\n{head}\n<defs>{pod_defs()}</defs>\n{pod_body()}\n</svg>\n')


# ============================================================== HUD glyphs ====
# 24 grid, 2px padding, one currentColor path, SW 1.5 / HAIR 1, butt caps, mitre joins (README C).
SW = 1.5
HAIR = 1.0


def st(p, w=SW, cap="butt", join="miter", miter=4.0):
    return G.stroke(p, w, cap, join, miter)


def pl(*pts, closed=False):
    return G.poly(list(pts), closed=closed)


def g_hull():
    # A curved hull plate (a section of the stage skin): solid plate crossed by two riveted seams.
    # Top and bottom edges curve together so it reads as bent sheet, not a shield.
    bow = 3.0
    def arc_y(x, y0):
        return y0 - bow * (1 - ((x - 12) / 8.25) ** 2)
    plate = G.parse(f"M3.75 6.75 Q12 {6.75 - 2 * bow} 20.25 6.75 L20.25 20.25 Q12 {20.25 - 2 * bow} 3.75 20.25 Z")
    cuts = []
    for y0 in (11.25, 15.75):
        cuts.append(st(G.parse(f"M2 {y0} Q12 {y0 - 2 * bow} 22 {y0}"), HAIR))
        for x in (7.0, 12.0, 17.0):
            cuts.append(G.circle(x, arc_y(x, y0), 0.95))
    return G.diff(plate, *cuts)


LASER_AT = (10.65, 13.05)


def _laser_m():
    return G.chain(G.T(*LASER_AT), G.R(-45))


def g_laser():
    # The pod's gun at the family's 45deg attitude: boxy housing on a hinge foot, focusing coil,
    # short barrel, muzzle brake, and two bolt dashes ahead (as engine-armed has plumes).
    # Knocked-out hairline = the joint between housing and coil.
    m = _laser_m()
    housing = G.parse("M-8 -3.25 L-1.8 -3.25 L-0.8 -2.25 L-0.8 2.25 L-1.8 3.25 L-8 3.25 Z")
    coil = G.rect(-0.8, -2.25, 2.3, 4.5)
    barrel = G.rect(1.5, -1.1, 3.2, 2.2)
    brake = G.rect(4.7, -2.0, 2.2, 4.0)
    foot = G.parse("M-6.6 3.0 L-2.8 3.0 L-2.1 4.75 L-7.3 4.75 Z")
    gun = G.diff(G.union(housing, coil, barrel, brake, foot), G.rect(-1.3, -4, HAIR, 8))
    bolts = G.union(st(pl((8.25, 0), (11.25, 0))), st(pl((12.75, 0), (14.25, 0))))
    return G.xf(G.union(gun, bolts), m)


def g_target():
    # Target lock: four corner brackets (the HUD's own frame language) around a tumbling rock,
    # solid with a knocked-out crater. Deliberately no crosshair, so it can't read as sym-viewpoint.
    a, b, k = 3.75, 20.25, 4.5
    brackets = G.union(
        st(pl((a, a + k), (a, a), (a + k, a))), st(pl((b - k, a), (b, a), (b, a + k))),
        st(pl((b, b - k), (b, b), (b - k, b))), st(pl((a + k, b), (a, b), (a, b - k))))
    rock_pts = [(12.4, 6.6), (16.1, 8.0), (17.4, 11.6), (15.9, 15.9), (11.6, 17.4), (7.6, 15.6),
                (6.6, 11.4), (8.6, 7.9)]
    rock = G.poly(rock_pts, closed=True)
    crater = st(G.circle(13.6, 10.6, 1.55), HAIR)
    pit = G.circle(9.9, 14.2, 0.9)
    return G.union(brackets, G.diff(rock, crater, pit))


def _ring_gaps(cx, cy, r, gaps, gap_deg):
    """A 1.5 circle with short gaps at the given angles (deg, SVG y-down): reads as a field, not a frame."""
    ring = st(G.circle(cx, cy, r))
    for a in gaps:
        t = math.radians(a)
        x, y = cx + r * math.cos(t), cy + r * math.sin(t)
        w = 2 * r * math.sin(math.radians(gap_deg) / 2)
        cut = G.xf(G.rect(-w / 2, -2, w, 4), G.chain(G.T(x, y), G.R(a + 90)))
        ring = G.diff(ring, cut)
    return ring


def _mini_rocket(m):
    # the mark at icon size: body, nose, two fins; solid hardware, nose along +x
    body = G.parse("M-5.2 -1.7 L2.4 -1.7 C4.2 -1.7 5.6 -0.9 6.4 0 C5.6 0.9 4.2 1.7 2.4 1.7 L-5.2 1.7 Z")
    fins = G.parse("M-5.2 -1.7 L-2.4 -1.7 L-4.6 -4.2 L-6.2 -4.2 Z M-5.2 1.7 L-2.4 1.7 L-4.6 4.2 L-6.2 4.2 Z")
    band = G.rect(1.6, -3, HAIR * 0.9, 6)
    return G.xf(G.diff(G.union(body, fins), band), m)


def g_shield():
    # Shield: a small rocket at the family's 45deg attitude inside a broken bubble ring (the in-game shield is a
    # dashed bubble). The ring is what separates it from nyko-ui-hull's riveted plate.
    ring = _ring_gaps(12, 12, 8.25, (-135, -45, 45, 135), 22)
    return G.union(ring, _mini_rocket(G.chain(G.T(12.2, 11.8), G.R(-45))))


def g_repair():
    # Repair: an open-ended spanner at 45deg, solid, jaw up-right. Hull +1 is the HUD's text; the tool is the sign.
    head = G.circle(0, 0, 4.4)
    jaw = G.union(G.rect(0.2, -1.55, 6, 3.1), G.circle(0.2, 0, 1.55))
    handle = G.parse("M-1.5 1.6 L-13.2 1.6 Q-14.8 1.6 -14.8 0 Q-14.8 -1.6 -13.2 -1.6 L-1.5 -1.6 Z")
    spanner = G.diff(G.union(head, handle, G.circle(-14.0, 0, 2.6)), jaw, G.circle(-14.0, 0, 1.15))
    return G.xf(spanner, G.chain(G.T(16.6, 7.4), G.R(-45)))


def g_overclock():
    # Overclock: an angular bolt with mitred hardware corners. Distinct from the laser glyph's dashed bolts at 14px.
    return G.poly([(14.25, 2.25), (6.0, 13.0), (11.6, 13.0), (8.25, 21.75), (18.0, 9.75), (12.4, 9.75), (16.5, 2.25)])


FLIGHT_GLYPHS = {"hull": g_hull, "laser": g_laser, "target": g_target,
                 "shield": g_shield, "repair": g_repair, "overclock": g_overclock}


# ============================================================ pickup canisters ====
# Floating supply beacons, ~28px on screen. viewBox -16 -16 32 32, origin at the centre (the site draws
# them centred and rotates them gently). One silhouette for all three: a sealed canister seen end-on, hull
# disc with four ink grapple lugs and an ink collar round the lens. Exactly one element in the kind colour
# (the lens); the ink symbol on it separates the kinds without colour (dome = shield, plus = repair,
# bolt = overclock).
PICKUPS = {"shield": "#7CC4FF", "repair": "#3FD69B", "overclock": "#FFB300"}
PICKUP_SYMBOL = {
    "shield": "M -4.1,1.1 A 4.1 4.1 0 0 1 4.1,1.1 Z M -4.5,2 H 4.5 V 3.5 H -4.5 Z",
    "repair": "M -1.3,-4.3 H 1.3 V -1.3 H 4.3 V 1.3 H 1.3 V 4.3 H -1.3 V 1.3 H -4.3 V -1.3 H -1.3 Z",
    "overclock": "M 1.3,-4.8 L -3,0.8 L -0.2,0.8 L -1.3,4.8 L 3,-0.8 L 0.2,-0.8 Z",
}


def pickup_svg(kind):
    col = PICKUPS[kind]
    lugs = "".join(f'<rect x="9.2" y="-2" width="5.6" height="4" rx="1" transform="rotate({a})"/>' for a in (45, 135, 225, 315))
    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="-16 -16 32 32" width="32" height="32"><title>NYKO pickup: {kind}</title>
<!--
  Flight Mode pickup canister ({kind}), seen end-on. Origin (0,0) = centre; drawn ~28px on screen.
  Generated by brand/round-1-launch/gen_flight.py. Groups, back to front: lugs, hull, collar,
  lens (the only {col} element), symbol. Brief: docs/claude/handoffs/FLIGHT-PICKUPS-ICON-HANDOFF.md.
  Halo + label stay in code. Fits inside r 15.
-->
<defs><linearGradient id="pk-{kind}-hull" x1="-8" y1="-11" x2="8" y2="11" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="{LIGHT}"/><stop offset="0.55" stop-color="{MID}"/><stop offset="1" stop-color="{SHADOW}"/></linearGradient></defs>
<g id="lugs" fill="{INK}">{lugs}</g>
<g id="hull"><circle r="11" fill="url(#pk-{kind}-hull)" stroke="{INK}" stroke-width="1.2"/></g>
<g id="collar"><circle r="8.2" fill="{INK}"/></g>
<g id="lens"><circle r="6.7" fill="{col}"/></g>
<g id="symbol"><path d="{PICKUP_SYMBOL[kind]}" fill="{INK}"/></g>
</svg>
"""


def glyph_svg(name):
    p = FLIGHT_GLYPHS[name]()
    x0, y0, x1, y1 = p.bounds
    assert x0 >= 2 - 1e-6 and y0 >= 2 - 1e-6 and x1 <= 22 + 1e-6 and y1 <= 22 + 1e-6, (name, p.bounds)
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">'
            f'<path d="{G.d(p)}" fill="currentColor"/></svg>')


# =============================================================== QA sheet ====
def rocket_markup():
    """The rocket group (hull + flames + lettering) and its gradients from the static mark."""
    s = (ROOT / "public/brand/nyko.svg").read_text()
    i = s.index("rotate(-45) scale(0.98)")
    i = s.index(">", i) + 1
    depth, j = 1, i
    for m in re.finditer(r"<g\b|</g>", s[i:]):
        depth += 1 if m.group(0) == "<g" else -1
        if depth == 0:
            j = i + m.start()
            break
    defs = "".join(re.findall(r"<(?:linear|radial)Gradient id=\"g(?:Hull|HullC|Flame)\".*?</(?:linear|radial)Gradient>", s, re.S))
    return defs, s[i:j]


def _b64(s):
    import base64
    return base64.b64encode(s.encode()).decode()


def qa_svg():
    rdefs, rocket = rocket_markup()
    glyphs = {n: G.d(fn()) for n, fn in FLIGHT_GLYPHS.items()}
    W, H = 1200, 1080
    out = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}">',
           f"<defs>{rdefs}{pod_defs()}</defs>"]
    for col, (ground, ink) in enumerate(((NIGHT, "#E6E9F2"), (DAY, INK))):
        x0 = col * W / 2
        out.append(f'<rect x="{x0}" y="0" width="{W/2}" height="{H}" fill="{ground}"/>')
        # 1x: stowed above, deployed below (rocket horizontal so the frame matches the brief's diagram)
        for row, state in enumerate(("stowed", "deployed")):
            out.append(f'<g transform="translate({x0 + 330} {150 + row * 170})">{rocket}{pod_body(state)}</g>')
        # 0.4x, at the hero's -45deg flight attitude
        for k, state in enumerate(("stowed", "deployed")):
            out.append(f'<g transform="translate({x0 + 140 + k * 220} 560) rotate(-45) scale(0.4)">{rocket}{pod_body(state)}</g>')
        # glyphs at 24 and 16 px
        for k, (n, d) in enumerate(glyphs.items()):
            gx = x0 + 40 + k * 92
            out.append(f'<g transform="translate({gx} 720) scale(2)" fill="{ink}"><path d="{d}"/></g>')
            out.append(f'<g transform="translate({gx} 790)" fill="{ink}"><path d="{d}"/></g>')
            out.append(f'<g transform="translate({gx + 34} 794) scale({14/24})" fill="{ink}"><path d="{d}"/></g>')
        # pickups at 4x and at the in-game 28px
        for k, kind in enumerate(PICKUPS):
            px = x0 + 90 + k * 170
            out.append(f'<image x="{px - 64}" y="860" width="128" height="128" href="data:image/svg+xml;base64,{_b64(pickup_svg(kind))}"/>')
            out.append(f'<image x="{px - 14}" y="1010" width="28" height="28" href="data:image/svg+xml;base64,{_b64(pickup_svg(kind))}"/>')
    out.append("</svg>\n")
    return "\n".join(out)


# ========================================================= game-over plate ====
# "LOSS OF SIGNAL" for Flight Mode, in the 404 art's language (nyko-404-los.svg): a dashed trajectory
# that breaks, drifting dash fragments, hairline crosses, transparent ground for Night. Here the
# trajectory is the rocket's climb, and past the break the rocket tumbles with its engines out.
def flight_los_svg():
    rdefs, rocket = rocket_markup()
    rdefs = re.sub(r'<(linear|radial)Gradient id="gFlame".*?</\1Gradient>', "", rdefs, flags=re.S)
    rocket = re.sub(r'<path [^>]*fill="(?:url\(#gFlame\)|#FFB300|#FFF3E0)"[^>]*>(?:</path>)?', "", rocket)
    climb = "M 26,306 C 70,270 104,236 128,204"          # dashed, as flown
    stub = "M 140,186 C 146,177 150,170 153,165"          # last stretch past the break, fainter
    frags = ""
    for i, (x, y, rot) in enumerate(((150, 196, -30), (162, 208, -62), (174, 190, -12))):
        frags += (f'<path d="M {x},{y} l 10,0" stroke="{MID}" stroke-width="2.4" stroke-linecap="round" '
                  f'opacity="{.6 - .15 * i:.2f}" transform="rotate({rot} {x} {y})"/>')
    chips = (f'<path d="M 268,176 l 9,-2 l -3,8 Z M 284,150 l 6,2 l -5,4 Z M 176,150 l -7,-2 l 5,-6 Z" fill="{MID}" opacity=".8"/>')
    crosses = ""
    for x, y, sz in ((52, 50, 6), (282, 268, 5), (38, 200, 4), (300, 118, 4)):
        crosses += (f'<path d="M {x - sz},{y} H {x + sz} M {x},{y - sz} V {y + sz}" stroke="{MID}" stroke-width="1.5" '
                    f'stroke-linecap="round" fill="none" opacity=".55"/>')
    return f"""<svg xmlns="http://www.w3.org/2000/svg" width="320" height="320" viewBox="0 0 320 320">
  <title>NYKO Flight Mode: loss of signal</title>
  <!-- Game-over plate for Flight Mode. Static, transparent; drawn for the Night ground like nyko-404-los.svg.
       Generated by brand/round-1-launch/gen_flight.py. -->
  <defs>{rdefs}</defs>
  {crosses}
  <path d="{climb}" fill="none" stroke="{MID}" stroke-width="2" stroke-dasharray="7 9" stroke-linecap="round" opacity=".7"/>
  <path d="{stub}" fill="none" stroke="{MID}" stroke-width="2" stroke-dasharray="7 9" stroke-linecap="round" opacity=".35"/>
  {frags}
  {chips}
  <g transform="translate(228 100) rotate(124) scale(0.4)">{rocket}</g>
</svg>
"""


def write(path, text):
    path.write_text(text)
    print("wrote", path.relative_to(ROOT))


def main():
    write(HERE / "nyko-laser-pod.svg", pod_svg())
    shutil.copy(HERE / "nyko-laser-pod.svg", ROOT / "public/brand/nyko-laser-pod.svg")
    for n in FLIGHT_GLYPHS:
        write(HERE / f"nyko-ui-{n}.svg", glyph_svg(n))
        shutil.copy(HERE / f"nyko-ui-{n}.svg", ROOT / f"public/brand/ui/nyko-ui-{n}.svg")
    for kind in PICKUPS:
        write(HERE / f"nyko-pickup-{kind}.svg", pickup_svg(kind))
        shutil.copy(HERE / f"nyko-pickup-{kind}.svg", ROOT / f"public/brand/nyko-pickup-{kind}.svg")
    write(HERE / "nyko-flight-los.svg", flight_los_svg())
    shutil.copy(HERE / "nyko-flight-los.svg", ROOT / "public/brand/nyko-flight-los.svg")
    (HERE / "qa").mkdir(exist_ok=True)
    write(HERE / "qa" / "flight-mode-qa.svg", qa_svg())


if __name__ == "__main__":
    main()
