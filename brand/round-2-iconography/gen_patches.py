#!/usr/bin/env python3
"""Field Ops + Crew mission patches."""
from common import *

CLIP = 'clip-path="url(#artclip)"'


def cross(x, y, s, col=HULL_M, w=2.2):
    return (f'<path d="M {x-s},{y} H {x+s} M {x},{y-s} V {y+s}" stroke="{col}" '
            f'stroke-width="{w}" stroke-linecap="round" fill="none"/>')


# ================================================================ FO-01 Sangre de Cristo
def fo01():
    # Crestone Peak (left, massive) + Crestone Needle (right, sharper), jagged connecting ridge
    peaks_back = ("M 42,296 L 108,246 L 146,214 L 178,170 L 196,186 L 214,164 L 252,208 "
                  "L 284,232 L 318,178 L 336,206 L 368,242 L 412,262 L 470,296 Z")
    peak_faces = ("M 214,164 L 252,208 L 232,214 L 214,186 Z "
                  "M 318,178 L 336,206 L 324,214 Z M 178,170 L 196,186 L 184,196 Z")
    dunes = ("M 42,346 C 80,322 118,314 150,332 C 164,308 214,298 252,320 "
             "C 268,306 318,302 352,326 C 384,312 436,320 470,342 L 470,352 L 42,352 Z")
    dune_crests = ('<g fill="none" stroke="#1E2233" stroke-width="2.4" stroke-opacity=".6">'
                   '<path d="M 150,332 C 134,340 104,344 76,342"/>'
                   '<path d="M 252,320 C 232,330 196,336 168,332"/>'
                   '<path d="M 352,326 C 334,334 300,338 274,333"/></g>')
    art = [
        L(f'<g {CLIP}><path d="{peaks_back}" fill="{HULL_D}"/></g>',
          onebit_svg=f'<g {CLIP}><path d="{peaks_back}" stroke-width="0"/></g>'),
        L(f'<g {CLIP}><path d="{peak_faces}" fill="{HULL_M}"/></g>', onebit="skip"),
        L(f'<g {CLIP}><path d="{dunes}" fill="{AMBER}"/>{dune_crests}</g>',
          onebit_svg=f'<g {CLIP}><path d="{dunes}" stroke-width="7"/></g>', onebit="ink"),
        # the 1-bit gap between peaks and dunes:
        L("", onebit="cut",
          onebit_svg=f'<g {CLIP}><path d="M 42,346 C 80,322 118,314 150,332 C 164,308 214,298 252,320 '
                     f'C 268,306 318,302 352,326 C 384,312 436,320 470,342" fill="none" stroke-width="5"/></g>'),
        L(f'<path d="M 64,352 H 448" stroke="{HULL_L}" stroke-width="2.5" fill="none"/>'),
        L(cross(352, 128, 9) + cross(136, 150, 6), onebit="skip"),
    ]
    return patch("NYKO patch FO-01", "FO-01 · SANGRE DE CRISTO", art)


# ================================================================ FO-02 Monarch
def fo02():
    back = "M 42,300 L 150,190 L 230,258 L 330,180 L 470,300 Z"
    front = "M 42,330 L 128,218 L 212,296 L 296,224 L 470,330 Z"
    # descent line: linked S-turns down the front face from the left summit
    descent = ("M 128,222 C 150,238 118,258 140,274 C 162,290 128,306 152,322")
    # Continental Divide obelisk on the right saddle
    def marker(x, y, s=1.0):
        return (f'<g transform="translate({x} {y}) scale({s})">'
                f'<path d="M -7,0 L -4,-34 L 4,-34 L 7,0 Z" fill="{HULL_L}"/>'
                f'<path d="M -4,-34 L 0,-44 L 4,-34 Z" fill="{HULL_L}"/>'
                f'<path d="M -5,-12 H 5 M -5,-20 H 5" stroke="{INK}" stroke-width="2.4" fill="none"/></g>')
    art = [
        L(f'<g {CLIP}><path d="{back}" fill="{HULL_D}" fill-opacity=".55"/></g>', onebit="skip"),
        L(f'<g {CLIP}><path d="{front}" fill="{HULL_D}"/></g>',
          onebit_svg=f'<g {CLIP}><path d="{front}" stroke-width="0"/></g>'),
        L(f'<g {CLIP}><path d="M 42,330 L 128,218 L 212,296 L 296,224 L 470,330" fill="none" '
          f'stroke="{HULL_M}" stroke-width="3"/></g>', onebit="skip"),
        L(f'<path d="{descent}" fill="none" stroke="{EMBER}" stroke-width="5" stroke-linecap="round" '
          f'stroke-dasharray="14 10"/><circle cx="152" cy="322" r="5.5" fill="{EMBER}"/>',
          onebit="cut",
          onebit_svg=f'<path d="{descent}" fill="none" stroke-width="7" stroke-linecap="round" '
                     f'stroke-dasharray="14 10"/><circle cx="152" cy="322" r="7"/>'),
        L(marker(296, 222), onebit="ink",
          onebit_svg=f'<g transform="translate(296 222)"><path d="M -7,0 L -4,-34 L 0,-44 L 4,-34 L 7,0 Z" '
                     f'stroke-width="8"/></g>'
                     f'<g transform="translate(296 222)"><path d="M -7,0 L -4,-34 L 0,-44 L 4,-34 L 7,0 Z" fill="#fff" stroke="none"/></g>'),
        L(cross(368, 136, 9) + cross(150, 142, 6), onebit="skip"),
    ]
    return patch("NYKO patch FO-02", "FO-02 · MONARCH", art)


# ================================================================ FO-03 Ravenna
def fo03():
    def fir(x, base, h, w):
        t1, t2, t3 = base-h, base-h*0.68, base-h*0.36
        return (f"M {x},{t1} L {x+w*0.5},{t2} L {x+w*0.28},{t2} L {x+w*0.74},{t3} L {x+w*0.44},{t3} "
                f"L {x+w},{base} L {x-w},{base} L {x-w*0.44},{t3} L {x-w*0.74},{t3} L {x-w*0.28},{t2} L {x-w*0.5},{t2} Z")
    bankL = "M 42,180 C 130,206 182,258 216,352 L 42,352 Z"
    bankR = "M 470,180 C 382,206 330,258 296,352 L 470,352 Z"
    firsL = "".join(f'<path d="{fir(x, b, h, w)}"/>' for x, b, h, w in
                    [(78, 212, 64, 15), (120, 232, 76, 17), (162, 262, 66, 15), (198, 300, 58, 13)])
    firsR = "".join(f'<path d="{fir(x, b, h, w)}"/>' for x, b, h, w in
                    [(434, 212, 64, 15), (392, 232, 76, 17), (350, 262, 66, 15), (314, 300, 58, 13)])
    creek = (f'<path d="M 236,336 C 248,330 262,332 272,326 M 230,346 C 246,338 268,342 282,334" '
             f'fill="none" stroke="{HULL_L}" stroke-width="2.5" stroke-linecap="round"/>')
    bridge = (f'<g><path d="M 196,258 H 316" stroke="{HULL_L}" stroke-width="5"/>'
              f'<path d="M 196,240 H 316" stroke="{HULL_L}" stroke-width="3"/>'
              f'<path d="M 206,240 L 230,258 M 230,240 L 254,258 M 254,240 L 278,258 M 278,240 L 302,258 '
              f'M 230,258 L 254,240 M 254,258 L 278,240 M 278,258 L 302,240 M 206,258 L 230,240 M 302,258 L 306,240" '
              f'stroke="{HULL_L}" stroke-width="1.6"/>'
              f'<path d="M 216,258 V 300 M 296,258 V 296" stroke="{HULL_L}" stroke-width="4"/></g>')
    art = [
        L(f'<g {CLIP} fill="{HULL_D}"><path d="{bankL}"/><path d="{bankR}"/></g>',
          onebit_svg=f'<g {CLIP} stroke-width="0"><path d="{bankL}"/><path d="{bankR}"/></g>'),
        L(f'<g {CLIP} fill="{HULL_M}">{firsL}{firsR}</g>',
          onebit_svg=f'<g {CLIP} stroke-width="0">{firsL}{firsR}</g>'),
        L(creek, onebit="ink", onebit_svg=creek.replace('stroke-width="2.5"', 'stroke-width="4"')),
        L("", onebit="cut",
          onebit_svg='<g stroke-width="7" fill="none"><path d="M 196,258 H 316"/><path d="M 196,240 H 316"/>'
                     '<path d="M 212,258 V 288 M 300,258 V 290"/></g>'),
        L(bridge),
        L(cross(256, 150, 8) + cross(168, 120, 5), onebit="skip"),
    ]
    return patch("NYKO patch FO-03", "FO-03 · RAVENNA", art)


# ================================================================ FO-04 Mulberry Mountain
def fo04():
    def canopy(pts, y0):
        d = f"M {pts[0][0]},{y0} "
        for i in range(len(pts)-1):
            (x1, y1), (x2, y2) = pts[i], pts[i+1]
            mx = (x1+x2)/2
            d += f"L {x1},{y1} Q {mx},{min(y1,y2)-22} {x2},{y2} "
        d += f"L {pts[-1][0]},{y0} Z"
        return d
    back = canopy([(42,268),(118,258),(196,246),(280,252),(366,246),(470,262)], 352)
    front = canopy([(42,318),(130,302),(226,292),(330,296),(470,312)], 352)
    wave = ("M 256,296 L 256,282 L 244,276 L 270,266 L 240,254 L 272,244 L 246,234 "
            "L 266,226 L 250,218 L 262,210 L 256,202 L 256,190")
    art = [
        L(f'<g {CLIP}><path d="{back}" fill="{HULL_M}" fill-opacity=".55"/></g>', onebit="skip"),
        L(f'<g {CLIP}><path d="{front}" fill="{HULL_D}"/></g>',
          onebit_svg=f'<g {CLIP}><path d="{front}" stroke-width="0"/></g>'),
        L(f'<circle cx="150" cy="156" r="14" fill="{AMBER}"/>', onebit="ink",
          onebit_svg='<circle cx="150" cy="156" r="13" fill="none" stroke-width="6"/>'),
        L(f'<path d="{wave}" stroke="{EMBER}" stroke-width="5" fill="none" stroke-linejoin="round"/>',
          onebit="cut", onebit_svg=f'<path d="{wave}" stroke-width="11" fill="none" stroke-linejoin="round"/>'),
        L("", onebit="ink", onebit_svg=f'<path d="{wave}" fill="none" stroke-width="5.5" stroke-linejoin="round"/>'),
        L(cross(362, 132, 8) + cross(416, 196, 5), onebit="skip"),
    ]
    return patch("NYKO patch FO-04", "FO-04 · MULBERRY MOUNTAIN", art)


PATCHES = [("fo01", fo01), ("fo02", fo02), ("fo03", fo03), ("fo04", fo04)]


# ================================================================ FL-01 First wave (Flight Mode)
# Earned by clearing the first wave of the hero easter egg. The rocket at its 45deg climb fires one
# ember bolt (the patch's only ember element) into an asteroid that has split along a crack.
# Rocket planes are the mark's own paths (nyko-animated.svg, rocket units), flat-filled, no lettering.
RKT = {
    "boosters": "M -175,-46 L -98,-40.5 Q -58,-34 -31,-18.5 L -175,-18.5 Z M -175,46 L -98,40.5 Q -58,34 -31,18.5 L -175,18.5 Z",
    "core": "M -175,-18 L -60,-17.5 Q 10,-15.5 58,-15.5 L 58,15.5 Q 10,15.5 -60,17.5 L -175,18 Z",
    "inter": "M 58,-15.5 L 76,-15.5 L 76,15.5 L 58,15.5 Z",
    "upper": "M 76,-15.5 L 120,-15.5 L 120,15.5 L 76,15.5 Z",
    "fairing": "M 112,-15.5 L 126,-19.5 L 154,-19.5 Q 174,-18 187,-4 L 187,4 Q 174,18 154,19.5 L 126,19.5 L 112,15.5 Z",
    "band": "M 126,-19.5 L 133,-19.5 L 133,19.5 L 126,19.5 Z",
    "nozzles": "M -175,-39 L -183,-36.5 L -183,-26.5 L -175,-24 Z M -175,39 L -183,36.5 L -183,26.5 L -175,24 Z M -175,-9 L -184,-7 L -184,7 L -175,9 Z",
    "flame": "M -183,-38 C -199,-39.5 -216,-35 -246,-31.5 C -216,-28 -199,-23.5 -183,-25 Z "
             "M -183,25 C -199,23.5 -216,28 -246,31.5 C -216,35 -199,39.5 -183,38 Z "
             "M -184,-10.5 C -200,-12 -236,-5.25 -290,0 C -236,5.25 -200,12 -184,10.5 Z",
    "core_flame": "M -184,-4.5 C -200,-6 -210,-2.5 -236,0 C -210,2.5 -200,6 -184,4.5 Z",
}
ROCK = [(0, -44), (28, -36), (44, -12), (40, 18), (20, 40), (-10, 44), (-34, 30), (-44, 4), (-36, -24), (-18, -40)]
CRACK = [(-27, -32), (-12, -15), (-3, -10), (6, 5), (15, 10), (30, 29)]


def fl01():
    rk = 'transform="translate(190 290) rotate(-45) scale(0.52)"'
    def pts(ps):
        return " L ".join(f"{x},{y}" for x, y in ps)
    near = f"M {pts(CRACK + [(20, 40), (-10, 44), (-34, 30), (-44, 4), (-36, -24)])} Z"
    far = f"M {pts(CRACK + [(40, 18), (44, -12), (28, -36), (0, -44), (-18, -40)])} Z"
    # halves part along the crack normal and turn away from each other
    half_n = 'transform="translate(342 138) translate(-9 9) rotate(-10) scale(1.1)"'
    half_f = 'transform="translate(342 138) translate(10 -10) rotate(14) scale(1.1)"'
    craters_n = '<circle cx="-22" cy="18" r="7"/><circle cx="-4" cy="30" r="4"/>'
    craters_f = '<circle cx="22" cy="-18" r="8"/><circle cx="30" cy="8" r="4"/>'
    chips = "M 396,178 l 10,-2 l -3,9 Z M 410,152 l 7,2 l -5,5 Z M 300,96 l -9,-1 l 5,-8 Z"
    bolt = "M 272,208 L 298,182"
    rocket_col = (f'<g {rk}>'
                  f'<path d="{RKT["flame"]}" fill="{AMBER}"/><path d="{RKT["core_flame"]}" fill="{CORE}"/>'
                  f'<path d="{RKT["nozzles"]}" fill="{HULL_D}"/>'
                  f'<path d="{RKT["boosters"]}" fill="{HULL_M}"/><path d="{RKT["core"]}" fill="{HULL_L}"/>'
                  f'<path d="{RKT["inter"]}" fill="{HULL_D}"/><path d="{RKT["upper"]}" fill="{HULL_L}"/>'
                  f'<path d="{RKT["fairing"]}" fill="{HULL_L}"/><path d="{RKT["band"]}" fill="{BLUE}"/></g>')
    rocket_sil = (f'<g {rk} stroke-width="0">'
                  + "".join(f'<path d="{RKT[k]}"/>' for k in ("flame", "nozzles", "boosters", "core", "inter", "upper", "fairing"))
                  + "</g>")
    # 1-bit: separate boosters from core, interstage and the band as knocked-out hairlines
    rocket_cuts = (f'<g {rk} fill="none" stroke-width="5">'
                   f'<path d="M -175,-18.5 L -31,-18.5 M -175,18.5 L -31,18.5 M 58,-15.5 V 15.5 M 76,-15.5 V 15.5 '
                   f'M 126,-19.5 V 19.5 M 133,-19.5 V 19.5"/></g>')
    rock_col = (f'<g {half_n}><path d="{near}" fill="{HULL_M}"/><g fill="{HULL_D}">{craters_n}</g></g>'
                f'<g {half_f}><path d="{far}" fill="{HULL_M}"/><g fill="{HULL_D}">{craters_f}</g></g>'
                f'<path d="{chips}" fill="{HULL_M}"/>')
    rock_sil = (f'<g {half_n}><path d="{near}"/></g><g {half_f}><path d="{far}"/></g><path d="{chips}"/>')
    rock_cuts = f'<g {half_n}>{craters_n}</g><g {half_f}>{craters_f}</g>'
    art = [
        L(cross(132, 160, 8) + cross(392, 292, 7) + cross(330, 340, 4) + cross(214, 112, 5), onebit="skip"),
        L(rock_col, onebit="ink", onebit_svg=rock_sil),
        L("", onebit="cut", onebit_svg=rock_cuts),
        L(f'<g {CLIP}>{rocket_col}</g>', onebit="ink", onebit_svg=f'<g {CLIP}>{rocket_sil}</g>'),
        L("", onebit="cut", onebit_svg=rocket_cuts),
        L(f'<path d="{bolt}" stroke="{EMBER}" stroke-width="7" stroke-linecap="round" fill="none"/>',
          onebit="ink", onebit_svg=f'<path d="{bolt}" stroke-width="7" stroke-linecap="round" fill="none"/>'),
    ]
    return patch("NYKO patch FL-01", "FL-01 · FIRST WAVE", art)


PATCHES.append(("fl01", fl01))



# ================================================================ CR-01 Powder, co-pilot
# Head traced 1:1 from the owner's reference image (see trace_powder.py), recolored:
# white coat, ink lines, light-blue collar, rose-gold bone tag, gold patch trim.
from assets.powder_paths import D_SIL, D_DARK, BBOX as PBB

WHITE = "#FFFFFF"
POWDER_BLUE = "#A6C6E6"
ROSE_GOLD = "#EBC0AE"
GOLD = "#CBA135"
GOLD_HI = "#E8CE7A"


def _bone(fill):
    return (f'<g fill="{fill}"><circle cx="-12" cy="-4" r="5"/><circle cx="-12" cy="4" r="5"/>'
            f'<circle cx="12" cy="-4" r="5"/><circle cx="12" cy="4" r="5"/>'
            f'<rect x="-12" y="-4.5" width="24" height="9"/></g>')


def cr01():
    k = 0.195
    cxs, cys = (PBB[0]+PBB[2])/2, (PBB[1]+PBB[3])/2
    tx, ty = 252 - cxs*k, 232 - cys*k
    T = f'transform="translate({tx:.1f} {ty:.1f}) scale({k})"'
    neck_y = ty + PBB[3]*k          # bottom of traced head
    COLLAR_D = f"M 160,{neck_y-24:.0f} L 281,{neck_y-30:.0f} L 283,{neck_y-5:.0f} L 162,{neck_y:.0f} Z"
    dog = (f'<g {T}>'
           f'<path d="{D_SIL}" fill="{WHITE}" stroke="{INK}" stroke-width="22" stroke-linejoin="round"/>'
           f'<path d="{D_DARK}" fill="{INK}"/></g>')
    collar = f'<path d="{COLLAR_D}" fill="{POWDER_BLUE}" stroke="{INK}" stroke-width="3.5" stroke-linejoin="round"/>'
    tag = f'<g transform="translate(214 {neck_y+22:.0f}) rotate(3)">{_bone(ROSE_GOLD)}</g>'
    ob = [
        L("", "ink", f'<g {T}><path d="{D_SIL}" stroke-width="0"/></g>'),
        L("", "cut", f'<g {T}><path d="{D_DARK}" stroke-width="0"/></g>'),
        L("", "cut", f'<path d="{COLLAR_D}" stroke-width="6"/>'),
        L("", "ink", f'<path d="{COLLAR_D}" stroke-width="0"/>'),
        L("", "cut", f'<g transform="translate(214 {neck_y+22:.0f}) rotate(3)"><g stroke-width="6">{_bone("#000")}</g></g>'),
        L("", "ink", f'<g transform="translate(214 {neck_y+22:.0f}) rotate(3)">{_bone("#fff")}</g>'),
    ]
    art = [
        L(cross(130, 150, 7) + cross(382, 136, 9) + cross(392, 310, 5), onebit="skip"),
        L(dog + collar + tag, onebit="skip"),
    ] + ob
    return patch("NYKO patch CR-01", "CR-01 · POWDER", art, ring_col=GOLD, hair_col=GOLD_HI)


# CR-01 is now hand-drawn: assets/powder-patch.svg is the master and
# nyko-patch-cr01.svg (+ public/patches/) is copied from it. cr01() is kept for
# reference only and no longer regenerated, so it won't overwrite the new art.
# PATCHES.append(("cr01", cr01))

if __name__ == "__main__":
    import os
    os.makedirs(OUT, exist_ok=True)
    for slug, fn in PATCHES:
        c, o = fn()
        write(f"nyko-patch-{slug}.svg", c); write(f"nyko-patch-{slug}-1bit.svg", o)
        png(f"nyko-patch-{slug}.svg"); png(f"nyko-patch-{slug}-1bit.svg")
    print("patches ok")
