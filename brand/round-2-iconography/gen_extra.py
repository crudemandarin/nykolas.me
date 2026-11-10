#!/usr/bin/env python3
"""404 LOSS OF SIGNAL + P2: stencil wordmark, countdown numerals."""
import sys, os, math
sys.path.insert(0, "/home/claude/logo")
from common import *
from gen3 import satellite, wordmark

SAT_DEFS = f'''
  <linearGradient id="gSat" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#FFFFFF"/><stop offset=".45" stop-color="{HULL_L}"/><stop offset="1" stop-color="{HULL_M}"/>
  </linearGradient>'''


# ---------------------------------------------------------------- 404
def loss_of_signal(animate):
    cx, cy, rx, ry, tilt = 160, 178, 118, 42, -14
    # broken trajectory: two dashed arcs with a gap at the departure point (upper right)
    def arc(a0, a1, n=48):
        pts = []
        for i in range(n+1):
            a = math.radians(a0 + (a1-a0)*i/n)
            pts.append(f"{rx*math.cos(a):.1f},{ry*math.sin(a):.1f}")
        return "M " + " L ".join(pts)
    ring_main = arc(-28, 248)      # most of the ellipse
    ring_tail = arc(272, 304)      # short stub on the far side of the gap
    # three drifting dash fragments just past the break
    frags = [(-12, 10, -26), (-2, 26, -38), (8, 44, -52)]  # (deg on ellipse, drift px, rot)
    frag_svg = ""
    for i, (ang, dr, rot) in enumerate(frags):
        a = math.radians(ang)
        x, y = rx*math.cos(a), ry*math.sin(a)
        nx, ny = math.cos(a)/rx, math.sin(a)/ry
        L = math.hypot(nx, ny); nx, ny = nx/L, ny/L
        anim = (f'<animateTransform attributeName="transform" type="translate" dur="{7+i*1.8}s" '
                f'repeatCount="indefinite" values="0 0;{nx*6:.1f} {ny*6:.1f};0 0" calcMode="spline" '
                f'keySplines=".45 0 .55 1;.45 0 .55 1"/>') if animate else ""
        frag_svg += (f'<g>{anim}<path d="M {x+nx*dr:.1f},{y+ny*dr:.1f} l {12*math.cos(a+1.57):.1f},{5*math.sin(a+1.57):.1f}" '
                     f'stroke="{HULL_M}" stroke-width="2.4" stroke-linecap="round" opacity="{.6-.15*i:.2f}" '
                     f'transform="rotate({rot} {x+nx*dr:.1f} {y+ny*dr:.1f})"/></g>')
    # satellite adrift above the break, nose pitched off-tangent
    sat_x, sat_y = cx + 86, cy - 102
    if animate:
        drift = ('<animateTransform attributeName="transform" type="translate" dur="11s" repeatCount="indefinite" '
                 'values="0 0;9 -7;0 0" calcMode="spline" keySplines=".45 0 .55 1;.45 0 .55 1"/>')
        wobble = (f'<animateTransform attributeName="transform" type="rotate" dur="13s" repeatCount="indefinite" '
                  f'values="-5 {sat_x} {sat_y};4 {sat_x} {sat_y};-5 {sat_x} {sat_y}" calcMode="spline" '
                  f'keySplines=".45 0 .55 1;.45 0 .55 1"/>')
    else:
        drift = wobble = ""
    crosses = ""
    for x, y, s, dur, b in [(52, 50, 6, 3.4, 0), (268, 250, 5, 4.2, -1.6), (38, 236, 4, 2.9, -.8)]:
        a = (f'<animate attributeName="opacity" values=".2;.8;.2" dur="{dur}s" begin="{b}s" repeatCount="indefinite"/>'
             if animate else "")
        crosses += (f'<path d="M {x-s},{y} H {x+s} M {x},{y-s} V {y+s}" stroke="{HULL_M}" stroke-width="1.5" '
                    f'stroke-linecap="round" fill="none" opacity=".55">{a}</path>')
    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="320" height="320" viewBox="0 0 320 320">
  <title>NYKO 404 — loss of signal</title><defs>{SAT_DEFS}</defs>
  {crosses}
  <g transform="translate({cx} {cy}) rotate({tilt})">
    <path d="{ring_main}" fill="none" stroke="{HULL_M}" stroke-width="2" stroke-dasharray="7 9"
      stroke-linecap="round" opacity=".7"/>
    <path d="{ring_tail}" fill="none" stroke="{HULL_M}" stroke-width="2" stroke-dasharray="7 9"
      stroke-linecap="round" opacity=".4"/>
    {frag_svg}
  </g>
  <g>{drift}<g>{wobble}<g transform="translate({sat_x} {sat_y}) rotate(22) scale(1.15)">{satellite()}</g></g></g>
</svg>'''


# ---------------------------------------------------------------- P2: stencil wordmark
def stencil_wordmark(color):
    word = wordmark()  # x -160..-33.5, y -17..17
    slits = [
        (-160.5, -8, 10, 3),      # N left stem
        (-143.5, 5, 10, 3),       # N right stem
        (-118.3, -11.5, 9.6, 3),  # Y stem (upside-down: stem on top)
        (-127.5, 7.5, 28, 3),     # Y arms
        (-85.3, -17.5, 3, 35),    # K: separate arms from stem
        (-48.2, -17.5, 3, 7),     # O top
        (-48.2, 10.5, 3, 7),      # O bottom
    ]
    cuts = "".join(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="#000"/>' for x, y, w, h in slits)
    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="432" height="120" viewBox="0 0 144 40">
  <title>NYKO stencil wordmark</title>
  <defs><mask id="m" maskUnits="userSpaceOnUse" x="0" y="0" width="144" height="40">
    <g transform="translate(168.5 20)"><path d="{word}" fill="#fff" fill-rule="evenodd"/>{cuts}</g>
  </mask></defs>
  <rect width="144" height="40" fill="{color}" mask="url(#m)"/>
</svg>'''


# ---------------------------------------------------------------- P2: countdown numerals
def _rects(rs):
    return " ".join(f"M {x},{y} h {w} v {h} h {-w} Z" for x, y, w, h in rs)

T_ = _rects([(0, -17, 26, 8.5), (8.75, -17, 8.5, 34)])
DASH = _rects([(0, -4.25, 15, 8.5)])
D1 = _rects([(8.75, -17, 8.5, 34)]) + " M 8.75,-17 L 1.5,-10 L 8.75,-10 Z"
D2 = _rects([(0, -17, 26, 8.5), (17.5, -17, 8.5, 17), (0, -4.25, 26, 8.5), (0, 0, 8.5, 17), (0, 8.5, 26, 8.5)])
D3 = _rects([(0, -17, 26, 8.5), (17.5, -17, 8.5, 34), (3, -4.25, 23, 8.5), (0, 8.5, 26, 8.5)])

def countdown(digit_path, name):
    x = 0; parts = []
    for d, w in [(T_, 26), (DASH, 15), (digit_path, 26)]:
        parts.append(f'<path transform="translate({x} 0)" d="{d}" fill="currentColor"/>')
        x += w + 7.5
    total = x - 7.5
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="{(total+16)*3:.0f}" height="150" '
            f'viewBox="0 0 {total+16:.0f} 50"><title>{name}</title>'
            f'<g transform="translate(8 25)">{"".join(parts)}</g></svg>')


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    write("nyko-404-los-animated.svg", loss_of_signal(True))
    write("nyko-404-los.svg", loss_of_signal(False))
    png("nyko-404-los.svg", size=640)
    write("nyko-wordmark-stencil-ember.svg", stencil_wordmark(EMBER))
    write("nyko-wordmark-stencil-ink.svg", stencil_wordmark(INK))
    write("nyko-wordmark-stencil-1bit.svg", stencil_wordmark("#000000"))
    for d, n in [(D3, "t3"), (D2, "t2"), (D1, "t1")]:
        write(f"nyko-count-{n}.svg", countdown(d, f"NYKO countdown {n.upper()}"))
    print("extra ok")
