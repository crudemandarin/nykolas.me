#!/usr/bin/env python3
"""NYKO graphics generator: P0 brand extensions (brief sections A-D, items 1-15).

Emits every SVG as a string from geometry (skia-pathops booleans, see geom.py),
then rasterises PNGs with rsvg-convert and the share card / contact sheet with
headless Chrome. Regenerate; never hand-edit outputs.

    python3 gen.py            # everything
    python3 gen.py --no-chrome  # skip og-card.png + contact-sheet.png

Geometry sources (read at run time, never approximated):
  * nyko-animated.svg : rocket hull planes + the N⅄KO wordmark path
  * nyko-1bit.svg     : the single-plume flame used by the simplified tiers
  * nyko.png          : hi-fi static art placed on the share card
"""
import math
import os
import re
import shutil
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import geom as G  # noqa: E402

SRC = Path("/home/claude/in/design/design package")
OUT = HERE / "out"
BUILD = HERE / "build"          # intermediate SVG/HTML sources for rasters

# ------------------------------------------------------------------ palette --
INK = "#1E2233"
SHADOW = "#525C7A"
MID = "#9AA4BE"
LIGHT = "#C9CFDE"
XLIGHT = "#DDE2EC"
INDIGO = "#2A3170"
BLUE = "#3238C9"
EMBER = "#FF4A22"
AMBER = "#FFB300"
CORE = "#FFF3E0"
NIGHT = "#101322"
DAY = "#F4F5F9"
BLACK = "#000"

# ----------------------------------------------------------- source geometry --
_anim = (SRC / "nyko-animated.svg").read_text()
_rocket = _anim[_anim.index("rotate(-45) scale(0.98)"):]
_rpaths = [m.group(1) for m in re.finditer(r'<path d="([^"]+)" fill="[^"]+"', _rocket)]


def _hull(prefix):
    for dd in _rpaths:
        if dd.startswith(prefix):
            return dd
    raise KeyError(prefix)


HULL = dict(
    booster_top=_hull("M -175,-46"), booster_bot=_hull("M -175,46"),
    core=_hull("M -175,-18"), center=_hull("M -175,-15"),
    interstage=_hull("M 58,-15.5 L 76,-15.5"), stage3=_hull("M 76,-15.5"),
    fairing=_hull("M 112,-15.5"), band=_hull("M 126,-19.5"),
)
WORDMARK_D = re.search(r'<path d="([^"]+)" fill="#FF4A22" fill-rule="evenodd"/>', _anim).group(1)
PLUME_D = re.search(r'<path d="(M -188,[^"]+)" fill="#fff"/>',
                    (SRC / "nyko-1bit.svg").read_text()).group(1)

# The wordmark in nyko-animated.svg sits in the rocket's local frame (inside
# translate(284 230) rotate(-45)). In that frame it is already upright, so
# "undoing the rotation" = using the local coordinates; we only translate the
# glyph box (x -160..-33.5, y -17..17) to the origin.
WM_W, WM_H = 126.5, 34.0


def wordmark(m=G.I):
    p = G.parse(WORDMARK_D, G.chain(m, G.T(160, 17)), fill="evenodd")
    return G.simplify(p)


# --------------------------------------------------------------- svg helpers --
def svg_doc(w, h, body, title=None, vb=None, extra=""):
    vb = vb or f"0 0 {G.fmt(w)} {G.fmt(h)}"
    t = f"<title>{title}</title>" if title else ""
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb}" '
            f'width="{G.fmt(w)}" height="{G.fmt(h)}"{extra}>{t}{body}</svg>\n')


def paths_svg(layers, m=G.I, prec=3):
    out = []
    for p, c in layers:
        q = G.xf(p, m) if m != G.I else p
        dd = G.d(q, prec)
        if dd:
            out.append(f'<path d="{dd}" fill="{c}"/>')
    return "".join(out)


def write(path, text):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text)
    return path


def rsvg(svg_path, png_path, w=None, h=None, bg=None):
    cmd = ["rsvg-convert"]
    if w:
        cmd += ["-w", str(w)]
    if h:
        cmd += ["-h", str(h)]
    if bg:
        cmd += ["-b", bg]
    cmd += [str(svg_path), "-o", str(png_path)]
    subprocess.run(cmd, check=True)


# ======================================================== simplified tier =====
# Compact mark: the hi-fi rocket planes (real hull geometry, core thickened 15%
# for small sizes), the 1-bit tier's single plume, a tilted orbit whose front
# arc crosses the nozzle line, ember on the leading segment, amber orb at the
# 1-bit tier's orbit position. Composed in hi-fi units, then fitted.
CM = dict(
    fat=1.15,          # perpendicular thickening of the hull (legibility at 32px)
    a=205, b=70, rot=16, ox=-25, cross=(-136, 136),   # orbit; front arc passes through `cross`
    w_back=8, w_front=14, gap=9,                      # stroke widths / occlusion gap
    split=118,         # front arc: ember from 0deg (right) to here, slate beyond (leading edge)
    orb_t=55, orb_r=19, ring=7,
)


def _solve_oy(ox, a, b, rot, px, py):
    best = None
    cr, sr = math.cos(math.radians(rot)), math.sin(math.radians(rot))
    for i in range(1, 1800):
        t = math.radians(i / 10)
        x = ox + a * math.cos(t) * cr - b * math.sin(t) * sr
        if best is None or abs(x - px) < best[0]:
            best = (abs(x - px), t)
    t = best[1]
    return py - (a * math.cos(t) * sr + b * math.sin(t) * cr)


def compact_geometry(P=CM):
    """Return a dict of named shapes in hi-fi screen units (rocket origin at 0,0)."""
    m_r = G.chain(G.R(-45), G.S(1, P["fat"]))
    sh = {k: G.parse(v, m_r) for k, v in HULL.items()}
    raw = G.union(sh["booster_top"], sh["booster_bot"], sh["core"], sh["center"],
                  sh["interstage"], sh["stage3"], sh["fairing"])
    # close the hairline slivers between boosters and core for the silhouette
    hull = G.diff(G.dilate(raw, 2.5), G.stroke(G.dilate(raw, 2.5), 5.0))
    hull = G.union(hull, raw)
    flame = G.parse(PLUME_D, m_r)
    a, b, rot, ox = P["a"], P["b"], P["rot"], P["ox"]
    oy = _solve_oy(ox, a, b, rot, *P["cross"])
    back = G.stroke(G.ellipse_arc(ox, oy, a, b, rot, 180, 360), P["w_back"])
    front = G.stroke(G.ellipse_arc(ox, oy, a, b, rot, 0, 180), P["w_front"])
    ex, ey = G.ellipse_point(ox, oy, a, b, rot, P["orb_t"])
    orb = G.circle(ex, ey, P["orb_r"])
    gap = P["gap"]
    front_d = G.dilate(front, gap)
    hull_c = G.diff(hull, front_d)
    flame_c = G.diff(flame, front_d)
    back_c = G.diff(back, G.dilate(G.union(hull, flame), gap))
    front_c = G.diff(front, G.circle(ex, ey, P["orb_r"] + gap))
    lead = G.stroke(G.ellipse_arc(ox, oy, a, b, rot, -3, P["split"]), P["w_front"] * 3)
    front_em = G.inter(front_c, lead)
    front_sl = G.diff(front_c, lead)
    upper = G.rect(-600, -600, 1200, 600, G.R(-45))        # lit (local -y) half
    return dict(sh=sh, hull=hull_c, hull_full=hull, flame=flame_c, back=back_c,
                front_em=front_em, front_sl=front_sl, orb=orb, orb_c=(ex, ey),
                upper=upper, m_r=m_r)


def compact_layers(theme, detail="compact"):
    """theme: night | day | 1bit.  detail: compact (32-40px) | icon (180-512px)."""
    g = compact_geometry()
    sh, hull = g["sh"], g["hull"]
    if theme == "1bit":
        solid = G.union(G.diff(hull, sh["interstage"]), g["flame"], g["back"],
                        g["front_em"], g["front_sl"], g["orb"])
        return [(solid, BLACK)]
    body = G.union(sh["core"], sh["stage3"], sh["fairing"])
    if theme == "night":
        c_top, c_bot, c_ctr, c_back, c_sl = LIGHT, MID, XLIGHT, MID, MID
    else:  # day
        c_top, c_bot, c_ctr, c_back, c_sl = SHADOW, INDIGO, MID, SHADOW, SHADOW
    cut = G.diff(hull, sh["interstage"])
    planes = [
        (G.inter(G.union(sh["booster_top"], G.inter(body, g["upper"])), cut), c_top),
        (G.inter(G.union(sh["booster_bot"], G.diff(body, g["upper"])), cut), c_bot),
        (G.inter(sh["center"], cut), c_ctr),
    ]
    L = [(g["back"], c_back), (g["flame"], AMBER)]
    L += planes
    if detail == "icon":
        L.append((G.inter(sh["band"], cut), BLUE if theme == "night" else LIGHT))
        # interstage X-truss hairlines (hi-fi detail), clipped to the interstage
        trus = []
        for y0, y1 in ((-15.5, -7.8), (-7.8, 0), (0, 7.8), (7.8, 15.5)):
            for (xa, ya, xb, yb) in ((58, y0, 76, y1), (76, y0, 58, y1)):
                trus.append(G.stroke(G.poly([(xa, ya), (xb, yb)], g["m_r"], closed=False), 1.6))
        L.append((G.inter(G.union(*trus), G.inter(sh["interstage"], hull)),
                  LIGHT if theme == "night" else SHADOW))
    L += [(g["front_sl"], c_sl), (g["front_em"], EMBER), (g["orb"], AMBER)]
    if theme == "day":
        ex, ey = g["orb_c"]
        L.append((G.stroke(G.circle(ex, ey, CM["orb_r"] - CM["ring"] / 2), CM["ring"]), INK))
    return L


def fit(layers, height, pad=1.0, width=None):
    """Affine that fits the union of layers into a box of `height` (and optional width)."""
    allp = G.union(*[p for p, _ in layers])
    x0, y0, x1, y1 = allp.bounds
    k = (height - 2 * pad) / (y1 - y0)
    w = (x1 - x0) * k + 2 * pad
    dx = pad
    if width is not None:
        dx = (width - (x1 - x0) * k) / 2
        w = width
    return G.chain(G.T(dx, pad), G.S(k), G.T(-x0, -y0)), w, k


# ============================================================ micro favicon ===
# Drawn on the 16px lattice first. The rocket's sides run on exact 45deg lines
# (constant u+v) with half-integer offsets, so each row is 3 strong pixels with
# faint fringes; the interstage is a one-unit perpendicular notch; the orb is
# snapped to a pixel corner so it lands as a crisp 2x2. 32/48 exports are exact
# 2x/3x of the same lattice.
FV = dict(V0=16, hw=1.5, bw=3.5, ut=-9, ub=-3, ui=(4, 5), un=12, nose=2, tip=0.5,
          orbit=(7.2, 11.2, 6.2, 2.2, 16), w_back=0.85, w_front=1.0, gap=0.5,
          split=115, orb=(11, 14), orb_r=1.2)


def _uv(u, v):
    return ((u + v) / 2.0, (v - u) / 2.0)


def favicon_geometry(P=FV, front_gap=0.0):
    V0, hw, bw = P["V0"], P["hw"], P["bw"]
    ut, ub, un = P["ut"], P["ub"], P["un"]
    prof = [(ut, bw), (ut + (ub - ut) * 0.45, bw - (bw - hw) * 0.30), (ub, hw),
            (un - P["nose"], hw), (un, P["tip"])]
    left = [_uv(u, V0 - w) for u, w in prof]
    right = [_uv(u, V0 + w) for u, w in reversed(prof)]
    hull = G.poly(left + right)
    u0, u1 = P["ui"]
    hull = G.diff(hull, G.poly([_uv(u0, V0 - 6), _uv(u1, V0 - 6), _uv(u1, V0 + 6), _uv(u0, V0 + 6)]))
    ox, oy, a, b, rot = P["orbit"]
    back = G.stroke(G.ellipse_arc(ox, oy, a, b, rot, 180, 360), P["w_back"])
    front = G.stroke(G.ellipse_arc(ox, oy, a, b, rot, 0, 180), P["w_front"])
    ex, ey = P["orb"]
    orb = G.circle(ex, ey, P["orb_r"])
    back = G.diff(back, G.dilate(hull, P["gap"]))
    if front_gap:
        hull = G.diff(hull, G.dilate(front, front_gap))
    front = G.diff(front, G.circle(ex, ey, P["orb_r"] + P["gap"]))
    lead = G.stroke(G.ellipse_arc(ox, oy, a, b, rot, -2, P["split"]), 4)
    return dict(hull=hull, back=back, front_em=G.inter(front, lead),
                front_sl=G.diff(front, lead), orb=orb)


def favicon_svg():
    g = favicon_geometry()
    L = [(G.rect(0, 0, 16, 16), NIGHT), (g["back"], MID), (g["front_sl"], MID),
         (g["hull"], LIGHT), (g["front_em"], EMBER), (g["orb"], AMBER)]
    return svg_doc(16, 16, paths_svg(L), title="NYKO")


def pinned_tab_svg():
    # 1-bit, single path: the 16px favicon lattice with real knock-out gaps
    g = favicon_geometry(front_gap=0.6)
    solid = G.union(g["hull"], g["back"], g["front_em"], g["front_sl"], g["orb"])
    solid = G.drop_specks(solid, 0.8)        # booster sliver left below the front-arc gap
    return svg_doc(16, 16, f'<path d="{G.d(solid)}" fill="#000"/>')


# ================================================================ UI glyphs ===
# 24px grid, 2px padding, 1.5 stroke, butt caps + miter joins (hardware logic).
# Straight strokes sit on the 1.5-unit lattice offset by .75 (0.75, 2.25, 3.75,
# ... 20.25): at 16px those centres land on pixel centres, so a 1.5 stroke is
# exactly 1px and crisp; at 24px it is 1 full + 1 half pixel.
SW = 1.5
HAIR = 1.0


def pl(*pts, closed=False):
    return G.poly(list(pts), closed=closed)


def st(p, w=SW, cap="butt", join="miter", miter=4.0):
    return G.stroke(p, w, cap, join, miter)


def g_arrow_right():
    return G.union(st(pl((3.75, 12.75), (20.25, 12.75))),
                   st(pl((14.25, 6.75), (20.25, 12.75), (14.25, 18.75))))


def g_arrow_up_right():
    return G.union(st(pl((5.25, 18.75), (18.75, 5.25))),
                   st(pl((9.75, 5.25), (18.75, 5.25), (18.75, 14.25))))


def g_arrow_up():
    return G.union(st(pl((12.75, 20.25), (12.75, 3.75))),
                   st(pl((6.75, 9.75), (12.75, 3.75), (18.75, 9.75))))


def g_menu():
    return G.union(*[st(pl((3.75, y), (20.25, y))) for y in (6.75, 12.75, 18.75)])


def g_close():
    return G.union(st(pl((5.25, 5.25), (18.75, 18.75))), st(pl((18.75, 5.25), (5.25, 18.75))))


def _terminator_lit(cx, cy, r, e, gibbous):
    """Lit region of a disc whose terminator is a half-ellipse of x-semi-axis e.
    Light from the right. gibbous=False -> crescent (night side faces us)."""
    disc = G.circle(cx, cy, r)
    right_half = G.rect(cx, cy - r - 1, r + 2, 2 * r + 2)
    term = G.ellipse(cx, cy, e, r + 0.001)
    if gibbous:
        return G.inter(disc, G.union(right_half, term))
    return G.inter(disc, G.diff(right_half, term))


def g_theme(gibbous):
    cx = cy = 12.0
    r = 8.25
    ring = st(G.circle(cx, cy, r))
    lit = _terminator_lit(cx, cy, r + 0.5, 3.75, gibbous)
    return G.union(ring, lit)


def g_theme_night():
    return g_theme(False)


def g_theme_day():
    return g_theme(True)


# Engine: drawn at the mark's 45deg flight attitude (an upright bell in outline
# reads as lab glassware at icon size; tilted, solid hardware does not). Nozzle =
# solid hardware with a knocked-out hairline hoop; flame = three outline plumes
# (long centre, short sides) like the mark's three exhausts. Idle keeps the
# nozzle exactly where it sits when armed, so the toggle never jumps.
ENGINE_AT = (13.2, 10.8)
NOZZLE = ("M0 -4.4 C2.8 -4.0 4.6 -2.5 5.6 -1.25 V-2.35 H8.6 V2.35 H5.6 V1.25 "
          "C4.6 2.5 2.8 4.0 0 4.4 Z")


def _engine_m():
    return G.chain(G.T(*ENGINE_AT), G.R(-45))


def _plume(x0, yc, L, w):
    return G.parse(f"M{x0} {yc-w} C{x0-L*0.35} {yc-w*1.05} {x0-L*0.7} {yc-w*0.4} {x0-L} {yc} "
                   f"C{x0-L*0.7} {yc+w*0.4} {x0-L*0.35} {yc+w*1.05} {x0} {yc+w} Z")


def g_engine_idle():
    noz = G.diff(G.parse(NOZZLE), G.rect(2.5, -6, HAIR, 12))
    return G.xf(noz, _engine_m())


def g_engine_armed():
    out = g_engine_idle()
    for (yc, L, w) in ((-3.9, 4.0, 0.75), (0, 8.2, 1.0), (3.9, 4.0, 0.75)):
        out = G.union(out, st(G.xf(_plume(-1.5, yc, L, w), _engine_m()), miter=8))
    return out


def g_copy():
    front = st(pl((8.25, 8.25), (20.25, 8.25), (20.25, 20.25), (8.25, 20.25), closed=True))
    back = st(pl((5.25, 15.75), (3.75, 15.75), (3.75, 3.75), (15.75, 3.75), (15.75, 5.25)))
    return G.union(front, back)


def g_check():
    return st(pl((3.75, 11.25), (9.75, 17.25), (20.25, 6.75)))


def g_email():
    box = st(pl((3.75, 5.25), (20.25, 5.25), (20.25, 18.75), (3.75, 18.75), closed=True))
    flap = st(pl((3.75, 6.75), (12, 13.5), (20.25, 6.75)), join="miter")
    return G.union(box, G.inter(flap, G.rect(3.75, 4, 16.5, 16)))


def g_document():
    page = st(pl((5.25, 3.75), (14.25, 3.75), (18.75, 8.25), (18.75, 20.25), (5.25, 20.25), closed=True))
    fold = st(pl((14.25, 3.75), (14.25, 8.25), (18.75, 8.25)))
    lines = [st(pl((8.25, y), (15.75, y))) for y in (11.25, 14.25, 17.25)]
    return G.union(page, fold, *lines)


def g_antenna():
    # parabolic dish seen side-on (bowl + rim chord), boresight 45deg up-right,
    # feed arm to the focus, pedestal on a base plate, one signal arc
    d = (math.sqrt(0.5), -math.sqrt(0.5))     # boresight
    n = (math.sqrt(0.5), math.sqrt(0.5))      # across the aperture
    cx, cy, h, sag = 10.25, 11.75, 7.75, 3.25  # aperture centre, half-aperture, depth
    vx, vy = cx - sag * d[0], cy - sag * d[1]  # vertex
    pts = []
    for i in range(0, 25):
        y = -h + 2 * h * i / 24
        x = sag * (y / h) ** 2
        pts.append((vx + x * d[0] + y * n[0], vy + x * d[1] + y * n[1]))
    bowl = G.union(G.poly(pts, closed=True), st(G.poly(pts, closed=True)))   # solid hardware
    fx, fy = cx + 4.25 * d[0], cy + 4.25 * d[1]
    arm = st(pl((cx, cy), (fx, fy)))
    head = st(pl((fx - 1.25 * n[0], fy - 1.25 * n[1]), (fx + 1.25 * n[0], fy + 1.25 * n[1])), 2.0)
    px = vx - 0.25
    mast = st(pl((px, vy + 0.5), (px, 20.25)))
    base = st(pl((4.5, 20.25), (12.75, 20.25)))
    # signal arc around the feed, centred on the boresight
    R0 = 4.5
    a0 = math.degrees(math.atan2(d[1], d[0]))
    arc = G.ellipse_arc(fx, fy, R0, R0, 0, a0 - 38, a0 + 38)
    sig = st(arc)
    return G.union(bowl, arm, head, mast, base, sig)


GLYPHS = {
    "arrow-right": g_arrow_right, "arrow-up-right": g_arrow_up_right, "arrow-up": g_arrow_up,
    "menu": g_menu, "close": g_close, "theme-night": g_theme_night, "theme-day": g_theme_day,
    "engine-armed": g_engine_armed, "engine-idle": g_engine_idle, "copy": g_copy, "check": g_check,
    "email": g_email, "document": g_document, "antenna": g_antenna,
}


from gen_flight import FLIGHT_GLYPHS  # noqa: E402  Flight Mode HUD glyphs (hull, laser, target)
GLYPHS.update(FLIGHT_GLYPHS)


def glyph_svg(name):
    p = GLYPHS[name]()
    x0, y0, x1, y1 = p.bounds
    assert x0 >= 2 - 1e-6 and y0 >= 2 - 1e-6 and x1 <= 22 + 1e-6 and y1 <= 22 + 1e-6, (name, p.bounds)
    return svg_doc(24, 24, f'<path d="{G.d(p)}" fill="currentColor"/>')


# ================================================================ builders ====
def build_wordmarks():
    wm = wordmark()
    for suffix, col in (("", EMBER), ("-ink", INK), ("-1bit", BLACK)):
        write(OUT / f"nyko-wordmark{suffix}.svg",
              svg_doc(WM_W, WM_H, f'<path d="{G.d(wm)}" fill="{col}"/>', title="NYKO"))


LOCK_H = 40.0
LOCK_CAP = 20.0     # wordmark cap height inside a 40-unit lockup
LOCK_GAP = 8.0


def build_compact_and_lockups():
    for theme, suffix in (("night", ""), ("day", "-day"), ("1bit", "-1bit")):
        L = compact_layers(theme)
        m, w, k = fit(L, LOCK_H, pad=1.0)
        write(OUT / f"nyko-mark-compact{suffix}.svg", svg_doc(w, LOCK_H, paths_svg(L, m), title="NYKO"))
        # lockup
        s = LOCK_CAP / WM_H
        x_wm = w + LOCK_GAP
        y_wm = (LOCK_H - LOCK_CAP) / 2
        wm = wordmark(G.chain(G.T(x_wm, y_wm), G.S(s)))
        wcol = {"night": EMBER, "day": INK, "1bit": BLACK}[theme]
        total = x_wm + WM_W * s + 1.0
        if theme == "1bit":
            solid = G.union(G.xf(L[0][0], m), wm)
            body = f'<path d="{G.d(solid)}" fill="#000"/>'
        else:
            body = paths_svg(L, m) + f'<path d="{G.d(wm)}" fill="{wcol}"/>'
        name = {"night": "night", "day": "day", "1bit": "1bit"}[theme]
        write(OUT / f"nyko-lockup-horizontal-{name}.svg", svg_doc(total, LOCK_H, body, title="NYKO"))


def _mark_points(L):
    pts = []
    for p, _ in L:
        for verb, ps in p:
            pts.extend(ps)
    return pts


def icon_svg(size, content, bg=NIGHT, mode="square", show_safe=False):
    """Mark (icon detail tier) centred on a full-bleed ink square.
    mode="square": the mark's bounding box takes `content` of the edge, then is
      shrunk until every point clears an iOS-style rounded mask (r = 22.37%) inset 5%.
    mode="safe": every point of the mark lies inside a circle of radius content*size/2
      (maskable icons: the W3C safe zone is the central circle of radius 40%)."""
    L = compact_layers("night", detail="icon")
    allp = G.union(*[p for p, _ in L])
    x0, y0, x1, y1 = allp.bounds
    cxm, cym = (x0 + x1) / 2, (y0 + y1) / 2
    pts = _mark_points(L)
    if mode == "safe":
        rmax = max(math.hypot(x - cxm, y - cym) for x, y in pts)
        k = (content * size / 2) / rmax
    else:
        k = content * size / max(x1 - x0, y1 - y0)
        r, inset = 0.2237 * size, 0.05 * size

        def inside(px, py):
            lo, hi = inset, size - inset
            if not (lo <= px <= hi and lo <= py <= hi):
                return False
            cx = min(max(px, lo + r), hi - r)
            cy = min(max(py, lo + r), hi - r)
            return math.hypot(px - cx, py - cy) <= r

        while not all(inside(size / 2 + (x - cxm) * k, size / 2 + (y - cym) * k) for x, y in pts):
            k *= 0.98
    m = G.chain(G.T(size / 2, size / 2), G.S(k), G.T(-cxm, -cym))
    body = f'<rect width="{size}" height="{size}" fill="{bg}"/>' + paths_svg(L, m)
    if show_safe:
        body += (f'<circle cx="{size/2}" cy="{size/2}" r="{size*0.4}" fill="none" '
                 f'stroke="#FF4A22" stroke-width="{size/256}" stroke-dasharray="{size/64}"/>')
    return svg_doc(size, size, body, title="NYKO")


def build_icons():
    BUILD.mkdir(parents=True, exist_ok=True)
    fav = write(OUT / "favicon.svg", favicon_svg())
    for s in (16, 32, 48):
        rsvg(fav, OUT / f"favicon-{s}.png", s, s)
    subprocess.run(["convert", str(OUT / "favicon-16.png"), str(OUT / "favicon-32.png"),
                    str(OUT / "favicon-48.png"), str(OUT / "favicon.ico")], check=True)
    write(OUT / "safari-pinned-tab.svg", pinned_tab_svg())
    # app icons: full-bleed ink squares; the mark's farthest point sits on a circle
    a = write(BUILD / "apple-touch-icon.svg", icon_svg(180, 0.84))
    rsvg(a, OUT / "apple-touch-icon.png", 180, 180)
    i = write(BUILD / "icon-512.svg", icon_svg(512, 0.84))
    rsvg(i, OUT / "icon-512.png", 512, 512)
    # maskable: whole mark inside a circle of radius 38% (safe zone is 40%)
    mk = write(BUILD / "icon-maskable-512.svg", icon_svg(512, 0.76, mode="safe"))
    rsvg(mk, OUT / "icon-maskable-512.png", 512, 512)
    write(BUILD / "icon-maskable-512-safezone.svg", icon_svg(512, 0.76, mode="safe", show_safe=True))


def build_glyphs():
    for name in GLYPHS:
        write(OUT / f"nyko-ui-{name}.svg", glyph_svg(name))


# ============================================================ share card ======
FONTS = HERE / "node_modules" / "@fontsource"


def registration_mark(x, y, r=11, arm=20, col="#7E88A6"):
    return (f'<g fill="none" stroke="{col}" stroke-width="1.5">'
            f'<circle cx="{x}" cy="{y}" r="{r}"/>'
            f'<path d="M{x-arm} {y}H{x+arm}M{x} {y-arm}V{y+arm}"/></g>')


def og_html():
    W, H = 1200, 630
    grid = []
    for x in range(0, W + 1, 32):
        col = "#262B42" if x % 128 == 0 else "#161A2C"
        grid.append((x % 128 == 0, f'<path d="M{x+0.5} 0V{H}" stroke="{col}"/>'))
    for y in range(0, H + 1, 32):
        col = "#262B42" if y % 128 == 0 else "#161A2C"
        grid.append((y % 128 == 0, f'<path d="M0 {y+0.5}H{W}" stroke="{col}"/>'))
    # minor first, major on top
    grid_svg = "".join(s for major, s in grid if not major) + "".join(s for major, s in grid if major)
    reg = registration_mark(1136.5, 565.5)
    bs = FONTS / "big-shoulders-display/files/big-shoulders-display-latin-800-normal.woff2"
    ps = FONTS / "ibm-plex-sans/files/ibm-plex-sans-latin-400-normal.woff2"
    pm = FONTS / "ibm-plex-mono/files/ibm-plex-mono-latin-500-normal.woff2"
    for f in (bs, ps, pm):
        assert f.exists(), f
    mark = SRC / "nyko.png"
    return f"""<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>og-card</title>
<style>
@font-face {{ font-family: "OG Display"; font-weight: 800; src: url("file://{bs}") format("woff2"); }}
@font-face {{ font-family: "OG Sans"; font-weight: 400; src: url("file://{ps}") format("woff2"); }}
@font-face {{ font-family: "OG Mono"; font-weight: 500; src: url("file://{pm}") format("woff2"); }}
html, body {{ margin: 0; padding: 0; }}
body {{ width: {W}px; height: {H}px; background: {NIGHT}; position: relative; overflow: hidden; }}
svg.grid {{ position: absolute; left: 0; top: 0; }}
img.mark {{ position: absolute; width: 640px; height: 640px; left: 566px; top: -30px; }}
.name {{ position: absolute; left: 62px; top: 146px; margin: 0; font: 800 132px/0.86 "OG Display";
        letter-spacing: 0.01em; color: #E6E9F2; text-transform: uppercase; }}
.head {{ position: absolute; left: 64px; top: 404px; margin: 0; font: 400 34px/1.2 "OG Sans"; color: #9AA4BE; }}
.role {{ position: absolute; left: 64px; top: 470px; margin: 0; font: 500 18px/1 "OG Mono";
        letter-spacing: 0.12em; text-transform: uppercase; color: #7E88A6; }}
.furn {{ position: absolute; margin: 0; font: 500 14px/1 "OG Mono"; letter-spacing: 0.12em;
        text-transform: uppercase; color: #7E88A6; }}
</style></head>
<body>
<svg class="grid" width="{W}" height="{H}" viewBox="0 0 {W} {H}" fill="none" stroke-width="1">{grid_svg}</svg>
<img class="mark" src="file://{mark}" alt="">
<svg class="grid" width="{W}" height="{H}" viewBox="0 0 {W} {H}">{reg}</svg>
<p class="furn" style="left:64px; top:58px">Sheet 00</p>
<h1 class="name">Nykolas<br>Farhangi</h1>
<p class="head">I build the systems that have to work.</p>
<p class="role">Software Engineer · Stripe · Seattle</p>
<p class="furn" style="left:64px; top:560px">47.61°N 122.33°W</p>
<script>
document.fonts.ready.then(() => {{
  const want = ['800 132px "OG Display"', '400 34px "OG Sans"', '500 18px "OG Mono"'];
  document.body.dataset.fonts = want.map(f => f + '=' + document.fonts.check(f)).join(';') + ';loaded=' +
    [...document.fonts].filter(f => f.status === 'loaded').map(f => f.family).join(',');
}});
</script>
</body></html>
"""


CHROME = "/usr/bin/google-chrome"


def chrome_shot(html_path, png_path, w, h):
    subprocess.run([CHROME, "--headless=new", "--no-sandbox", "--disable-gpu", "--hide-scrollbars",
                    "--allow-file-access-from-files", "--force-device-scale-factor=1",
                    f"--window-size={w},{h}", "--virtual-time-budget=8000",
                    f"--screenshot={png_path}", f"file://{html_path}"],
                   check=True, capture_output=True)


def chrome_dom(html_path):
    r = subprocess.run([CHROME, "--headless=new", "--no-sandbox", "--disable-gpu",
                        "--allow-file-access-from-files", "--virtual-time-budget=8000",
                        "--dump-dom", f"file://{html_path}"], check=True, capture_output=True, text=True)
    return r.stdout


def build_og():
    html = write(BUILD / "og-card.html", og_html())
    dom = chrome_dom(html)
    m = re.search(r'data-fonts="([^"]+)"', dom)
    status = m.group(1) if m else "NO FONT STATUS"
    print("og-card font check:", status.replace("&quot;", '"'))
    if not m or "=false" in status:
        raise SystemExit("share card fonts did not load")
    chrome_shot(html, OUT / "og-card.png", 1200, 630)


# ========================================================== contact sheet =====
def _inline(path):
    s = Path(path).read_text()
    return re.sub(r"<title>.*?</title>", "", s)


def _sized(svg_text, h=None, w=None):
    """Return inline svg with width/height overridden (keeps viewBox)."""
    vb = re.search(r'viewBox="([^"]+)"', svg_text).group(1).split()
    vw, vh = float(vb[2]), float(vb[3])
    if h is not None:
        w = vw * h / vh
    elif w is not None:
        h = vh * w / vw
    svg_text = re.sub(r'width="[^"]+"', f'width="{w:.2f}"', svg_text, count=1)
    svg_text = re.sub(r'height="[^"]+"', f'height="{h:.2f}"', svg_text, count=1)
    return svg_text


def contact_html():
    O = OUT
    grounds = [("Night", NIGHT, "#E6E9F2", "#7E88A6"), ("Day", DAY, INK, SHADOW)]
    cols = []
    for gname, bg, fg, mute in grounds:
        night = gname == "Night"
        c = []

        def sec(title):
            c.append(f'<h2>{title}</h2>')

        def item(inner, label):
            c.append(f'<figure>{inner}<figcaption>{label}</figcaption></figure>')

        def mono(t):
            # 1-bit art is single ink #000; on Night show it inverted (as the handoff prescribes)
            return t.replace('fill="#000"', 'fill="#E6E9F2"') if night else t

        def note(intended):
            if intended == "1bit":
                return " · 1-bit" + (" (shown inverted)" if night else "")
            return "" if intended == gname else f" · made for {intended}, shown here for reference"

        sec("A · Wordmark (1×, 34px cap) and 2×")
        for f, intended in (("nyko-wordmark.svg", "Night"), ("nyko-wordmark-ink.svg", "Day"),
                            ("nyko-wordmark-1bit.svg", "1bit")):
            t = _inline(O / f)
            t = mono(t) if intended == "1bit" else t
            item(_sized(t, h=34) + "&nbsp;&nbsp;" + _sized(t, h=68), f + note(intended))
        sec("A · Horizontal lockups at 40px and 32px (+ 2× reference)")
        for f, intended in (("nyko-lockup-horizontal-night.svg", "Night"), ("nyko-lockup-horizontal-day.svg", "Day"),
                            ("nyko-lockup-horizontal-1bit.svg", "1bit")):
            t = _inline(O / f)
            t = mono(t) if intended == "1bit" else t
            item(_sized(t, h=40) + "&nbsp;&nbsp;" + _sized(t, h=32) + "<br>" + _sized(t, h=80), f + note(intended))
        sec("A · Compact mark at 40 / 32px (+ 2×)")
        for f, intended in (("nyko-mark-compact.svg", "Night"), ("nyko-mark-compact-day.svg", "Day"),
                            ("nyko-mark-compact-1bit.svg", "1bit")):
            t = _inline(O / f)
            t = mono(t) if intended == "1bit" else t
            item(_sized(t, h=40) + "&nbsp;" + _sized(t, h=32) + "&nbsp;" + _sized(t, h=80), f + note(intended))
        sec("B · Favicon: PNG 16 / 32 / 48 at 1×, SVG at 16, 16px zoomed 8× (nearest)")
        fv = _inline(O / "favicon.svg")
        item(f'<img src="file://{O}/favicon-16.png" width="16" height="16"> '
             f'<img src="file://{O}/favicon-32.png" width="32" height="32"> '
             f'<img src="file://{O}/favicon-48.png" width="48" height="48"> '
             + _sized(fv, h=16) +
             f' <img class="px" src="file://{O}/favicon-16.png" width="128" height="128">',
             "favicon-16/32/48.png · favicon.svg · favicon.ico")
        pt = mono(_inline(O / "safari-pinned-tab.svg"))
        item(_sized(pt, h=16) + "&nbsp;" + _sized(pt, h=32) + "&nbsp;" + _sized(pt, h=64),
             "safari-pinned-tab.svg (1-bit; Safari tints it)" + (" · shown inverted" if night else ""))
        sec("B · App icons at 1×")
        item(f'<img src="file://{O}/apple-touch-icon.png" width="180" height="180">', "apple-touch-icon.png 180")
        item(f'<img src="file://{O}/icon-512.png" width="512" height="512">', "icon-512.png")
        item(f'<img src="file://{O}/icon-maskable-512.png" width="512" height="512" '
             f'style="border-radius:50%">', "icon-maskable-512.png (shown in a circle mask)")
        sec("B · Share card 1200×630 at 1×")
        item(f'<img src="file://{O}/og-card.png" width="1200" height="630">', "og-card.png")
        sec("C+D · UI glyphs at 24px and 16px (currentColor)")
        row24, row16, row48, labels = [], [], [], []
        for name in GLYPHS:
            t = _inline(O / f"nyko-ui-{name}.svg")
            row24.append(f'<span class="g">{_sized(t, h=24)}</span>')
            row16.append(f'<span class="g">{_sized(t, h=16)}</span>')
            row48.append(f'<span class="g">{_sized(t, h=48)}</span>')
            labels.append(f'<span class="g lab">{name}</span>')
        c.append('<div class="glyphs">' + "".join(row48) + '</div>')
        c.append('<div class="glyphs">' + "".join(row24) + '</div>')
        c.append('<div class="glyphs">' + "".join(row16) + '</div>')
        c.append('<div class="glyphs">' + "".join(labels) + '</div>')
        cols.append(f'<section style="background:{bg}; color:{fg}; --mute:{mute}">'
                    f'<h1>{gname} ground {bg}</h1>{"".join(c)}</section>')
    return f"""<!DOCTYPE html><html><head><meta charset="utf-8"><style>
@font-face {{ font-family: "CS Mono"; font-weight: 500;
  src: url("file://{FONTS}/ibm-plex-mono/files/ibm-plex-mono-latin-500-normal.woff2") format("woff2"); }}
html, body {{ margin: 0; background: #5a5f70; }}
main {{ display: flex; gap: 0; width: 2640px; }}
section {{ width: 1320px; padding: 40px 60px; box-sizing: border-box; }}
h1 {{ font: 500 18px "CS Mono"; letter-spacing: .12em; text-transform: uppercase; margin: 0 0 24px; }}
h2 {{ font: 500 12px "CS Mono"; letter-spacing: .12em; text-transform: uppercase; color: var(--mute);
     margin: 34px 0 12px; border-top: 1px solid var(--mute); padding-top: 10px; }}
figure {{ display: inline-block; vertical-align: top; margin: 0 40px 18px 0; }}
figure svg, figure img {{ vertical-align: bottom; }}
figcaption {{ font: 500 11px "CS Mono"; letter-spacing: .06em; color: var(--mute); margin-top: 8px; }}
img.px {{ image-rendering: pixelated; }}
.glyphs {{ display: flex; gap: 0; align-items: center; margin: 6px 0; }}
.g {{ display: inline-flex; width: 84px; justify-content: center; }}
.lab {{ font: 500 9px "CS Mono"; color: var(--mute); text-align: center; }}
</style></head><body><main>{"".join(cols)}</main>
<script>document.fonts.ready.then(() => {{
  document.body.dataset.h = Math.ceil(document.querySelector("main").getBoundingClientRect().height);
}});</script></body></html>"""


def build_contact():
    html = write(BUILD / "contact-sheet.html", contact_html())
    h = int(re.search(r'data-h="(\d+)"', chrome_dom(html)).group(1))
    chrome_shot(html, OUT / "contact-sheet.png", 2640, h)


# ==================================================================== main ====
def main():
    OUT.mkdir(parents=True, exist_ok=True)
    BUILD.mkdir(parents=True, exist_ok=True)
    build_wordmarks()
    build_compact_and_lockups()
    build_icons()
    build_glyphs()
    if "--no-chrome" not in sys.argv:
        build_og()
        build_contact()
    print("wrote", len(list(OUT.iterdir())), "files to", OUT)


if __name__ == "__main__":
    main()
