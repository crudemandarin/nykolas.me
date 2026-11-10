#!/usr/bin/env python3
"""Section marks (24px glyph + 64px spot) and diagram symbol kit (16/24px)."""
from common import *
import os

S = 'stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="square" stroke-linejoin="miter"'
SR = 'stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round"'  # trajectories/crosses only
F = 'fill="currentColor"'

# ---------------------------------------------------------------- section marks @24
def g_overview():
    return (f'<path d="M 7.2,16.8 L 9.4,10.4 L 14,5.8 Q 17.4,3.6 20.4,3.6 Q 20.4,6.6 18.2,10 L 13.6,14.6 L 7.2,16.8 Z" {F}/>'
            f'<path d="M 9.4,10.4 L 6,10.9 L 4.4,13.6 M 13.6,14.6 L 13.1,18 L 10.4,19.6" {S}/>'
            f'<path d="M 6.8,17.2 L 3.6,20.4" {SR}/>')

def g_profile():
    return (f'<rect x="3.2" y="5.2" width="17.6" height="13.6" rx="1.6" {S}/>'
            f'<rect x="6.2" y="8.6" width="4.6" height="4.6" {S}/>'
            f'<path d="M 13.4,9.4 H 17.8 M 13.4,12.4 H 17.8 M 6.2,16 H 17.8" {S}/>')

def g_missions():
    return (f'<path d="M 3.2,20.8 C 10,20 16,15.5 19.6,6.4" {SR}/>'
            f'<path d="M 15.6,7.2 L 19.6,6.4 L 18.9,10.4" {SR}/>'
            f'<path d="M 8.9,19 L 10,21.4 M 14.3,15.3 L 16.1,17.1 M 17.7,10.6 L 20.1,11.6" {SR}/>')

def g_payloads():
    return (f'<path d="M 8.6,3.6 C 4.8,7.2 4,14.4 6.6,20.4 M 15.4,3.6 C 19.2,7.2 20,14.4 17.4,20.4" {S}/>'
            f'<path d="M 12,8.4 Q 14.6,10.2 14.6,13.2 L 14.6,15 L 9.4,15 L 9.4,13.2 Q 9.4,10.2 12,8.4 Z" {F}/>'
            f'<path d="M 10.2,17 H 13.8" {S}/>')

def g_fieldops():
    return (f'<path d="M 3.6,19.4 L 12,4.8 L 20.4,19.4 Z" {S}/>'
            f'<path d="M 9.2,13.2 Q 12,11.4 14.8,13.2" {S}/>'
            f'<path d="M 7,16.6 Q 12,14.2 17,16.6" {S}/>')

def g_crew():
    import math
    bolts = "".join(f'<circle cx="{12+6.8*math.cos(math.radians(a)):.2f}" cy="{12+6.8*math.sin(math.radians(a)):.2f}" r="0.95" fill="currentColor"/>'
                    for a in range(0, 360, 60))
    return (f'<circle cx="12" cy="12" r="8.8" {S}/><circle cx="12" cy="12" r="4.6" {S}/>'
            + bolts + f'<path d="M 9.8,12 H 14.2" {S}/>')

def g_comms():
    return (f'<path d="M 5,7.4 L 16.6,19 A 8.2,8.2 0 0 1 5,7.4 Z" {S}/>'
            f'<path d="M 10.8,13.2 L 15.4,8.6" {S}/><circle cx="16.2" cy="7.8" r="1.4" {F}/>'
            f'<path d="M 17.6,3.4 Q 20.2,4.2 21,6.8" {SR}/>'
            f'<path d="M 12.6,19.8 L 11,21.8 M 15,19.9 L 16,21.8" {S}/>')

SECTIONS = [
    ("overview", g_overview), ("profile", g_profile), ("missions", g_missions),
    ("payloads", g_payloads), ("fieldops", g_fieldops), ("crew", g_crew), ("comms", g_comms),
]

# spot accents: which subpath gets the accent color in the 64px spot version
SPOT_STYLE = {
    "overview":  [("currentColor", HULL_L), ('d="M 6.8,17.2 L 3.6,20.4"', EMBER)],
    "missions":  [("currentColor", HULL_M), ('d="M 15.6,7.2', EMBER), ('d="M 3.2,20.8', EMBER)],
    "payloads":  [("currentColor", HULL_M), ('Q 14.6,10.2', AMBER)],
    "profile":   [("currentColor", HULL_M)],
    "fieldops":  [("currentColor", HULL_M)],
    "crew":      [("currentColor", HULL_M)],
    "comms":     [("currentColor", HULL_M), ('d="M 17.6,3.4', EMBER)],
}

def spotify(body, name):
    """64px spot: recolor currentColor → slate, flagged subpaths → accent."""
    rules = SPOT_STYLE[name]
    default = rules[0][1]
    out = []
    for piece in body.split("/>"):
        if not piece.strip():
            continue
        col = default
        for sig, c in rules[1:]:
            if sig in piece:
                col = c
        out.append(piece.replace("currentColor", col) + "/>")
    return "".join(out)

# ---------------------------------------------------------------- symbol kit @24 (auto 16)
def s_summit():   return f'<path d="M 3.6,19.6 L 12,5 L 20.4,19.6 Z" {F}/>'
def s_trailhead():return f'<rect x="6" y="6" width="12" height="12" {S}/>'
def s_campsite():
    return (f'<path d="M 12,5 Q 15.8,9 15.8,12.6 Q 15.8,16.4 12,16.4 Q 8.2,16.4 8.2,12.6 '
            f'Q 8.2,10.6 9.8,8.6 Q 9.8,11 11.2,12 Q 11.4,8.4 12,5 Z" {F}/>'
            f'<path d="M 5.6,19.6 L 18.4,19.6 M 7,17.2 L 9.2,19.4 M 17,17.2 L 14.8,19.4" {S}/>')
def s_skilift():
    return (f'<path d="M 3,6 L 21,10.2" {S}/>'
            f'<path d="M 12.4,8.2 V 12.6 M 9.4,12.6 V 17.4 M 9.4,17.4 H 15.6 M 15.6,14.6 V 17.4" {S}/>')
def s_viewpoint():
    return (f'<path d="M 9.2,20 A 2.8,2.8 0 0 1 14.8,20 Z" {F}/>'
            f'<path d="M 12,15.6 V 10 M 7.6,16.4 L 4.8,11.6 M 16.4,16.4 L 19.2,11.6" {S}/>')
def s_water():
    return (f'<path d="M 3,9.6 Q 5.25,7.2 7.5,9.6 T 12,9.6 T 16.5,9.6 T 21,9.6 '
            f'M 3,14.8 Q 5.25,12.4 7.5,14.8 T 12,14.8 T 16.5,14.8 T 21,14.8" {SR}/>')
def s_north():
    return (f'<path d="M 12,3 L 8,19 L 12,15.6 Z" {S}/>'
            f'<path d="M 12,3 L 16,19 L 12,15.6 Z" {F}/>')
def s_scalecaps():
    return f'<path d="M 4.4,7.6 V 16.4 M 4.4,12 H 19.6 M 19.6,7.6 V 16.4 M 12,9.8 V 14.2" {S}/>'

SYMBOLS = [
    ("summit", s_summit), ("trailhead", s_trailhead), ("campsite", s_campsite),
    ("skilift", s_skilift), ("viewpoint", s_viewpoint), ("water", s_water),
    ("north", s_north), ("scalecaps", s_scalecaps),
]

def glyph_svg(body, size=24, vb=24, title=""):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="{size}" height="{size}" '
            f'viewBox="0 0 {vb} {vb}"><title>{title}</title>{body}</svg>')

def main():
    os.makedirs(OUT, exist_ok=True)
    for name, fn in SECTIONS:
        body = fn()
        write(f"nyko-section-{name}.svg", glyph_svg(body, 24, 24, f"NYKO section {name}"))
        spot = (f'<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24">'
                f'<title>NYKO section {name} spot</title>{spotify(body, name)}</svg>')
        write(f"nyko-section-{name}-spot.svg", spot)
    for name, fn in SYMBOLS:
        body = fn()
        write(f"nyko-sym-{name}-24.svg", glyph_svg(body, 24, 24, f"NYKO sym {name}"))
        write(f"nyko-sym-{name}-16.svg", glyph_svg(body, 16, 24, f"NYKO sym {name}"))
    print("glyphs ok")

if __name__ == "__main__":
    main()
