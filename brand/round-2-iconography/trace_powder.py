#!/usr/bin/env python3
"""Trace the user's reference head image into exact vector paths → assets/powder_paths.py"""
from PIL import Image, ImageFilter
import numpy as np, potrace, os

SRC = "/mnt/user-data/uploads/f9d2d1de-image.png"
UP = 6

im = Image.open(SRC).convert("RGB")
im6 = im.resize((im.width*UP, im.height*UP), Image.LANCZOS)
s = np.array(im6).astype(int).sum(axis=2)

def smooth(mask, radius):
    m = Image.fromarray((mask * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(radius))
    return np.array(m) > 127

def trace(mask, turd=120, alphamax=1.34, radius=7, tol=1.3):
    p = potrace.Bitmap(~smooth(mask, radius)).trace(alphamax=alphamax, turdsize=turd, opticurve=1, opttolerance=tol)
    out = []
    for curve in p:
        pts = [f"M {curve.start_point.x:.1f},{curve.start_point.y:.1f}"]
        for seg in curve:
            if seg.is_corner:
                pts.append(f"L {seg.c.x:.1f},{seg.c.y:.1f} L {seg.end_point.x:.1f},{seg.end_point.y:.1f}")
            else:
                pts.append(f"C {seg.c1.x:.1f},{seg.c1.y:.1f} {seg.c2.x:.1f},{seg.c2.y:.1f} "
                           f"{seg.end_point.x:.1f},{seg.end_point.y:.1f}")
        pts.append("Z")
        out.append(" ".join(pts))
    return " ".join(out)

d_sil = trace(s < 720, turd=2000, radius=9)
d_dark = trace(s < 392, turd=350, radius=4.5)
d_line = ''

ys, xs = np.where(s < 720)
bbox = (int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max()))

os.makedirs("assets", exist_ok=True)
with open("assets/powder_paths.py", "w") as f:
    f.write(f"BBOX = {bbox}\n")
    f.write(f"D_SIL = '''{d_sil}'''\n")
    f.write(f"D_DARK = '''{d_dark}'''\n")
    f.write(f"D_LINE = '''{d_line}'''\n")
print("bbox", bbox, "| sil:", d_sil.count("M"), "| dark:", d_dark.count("M"), "| line:", d_line.count("M"))
