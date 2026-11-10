#!/usr/bin/env python3
"""PNG previews for every SVG + contact sheets on both grounds."""
import os, subprocess
from PIL import Image
from common import OUT, NIGHT, DAY

PREV = {  # name pattern → (render width, tint for currentColor on night, tint on day)
    "nyko-section-*-spot.svg": 128, "nyko-section-*.svg": 96,
    "nyko-sym-*-24.svg": 96, "nyko-sym-*-16.svg": 64,
    "nyko-count-*.svg": 320, "nyko-wordmark-stencil-*.svg": 576,
}

def render(svg_path, out_path, w, tint=None):
    src = open(svg_path).read()
    if tint and "currentColor" in src:
        src = src.replace("currentColor", tint)
    tmp = "/tmp/_r.svg"; open(tmp, "w").write(src)
    subprocess.run(["rsvg-convert", "-w", str(w), tmp, "-o", out_path], check=True)

def main():
    files = sorted(os.listdir(OUT))
    # previews
    for f in files:
        if not f.endswith(".svg"):
            continue
        base = f[:-4]
        if os.path.exists(os.path.join(OUT, base + ".png")):
            continue
        w = 512
        if "-spot" in f: w = 128
        elif "section" in f: w = 96
        elif "sym-" in f: w = 96 if "-24" in f else 64
        elif "count-" in f: w = 330
        elif "stencil" in f: w = 576
        elif "404" in f and "animated" in f: continue
        render(os.path.join(OUT, f), os.path.join(OUT, base + ".png"), w,
               tint="#C9CFDE" if "stencil" not in f else None)

    # contact sheets
    for ground, gname, tint, sym_tint in [(NIGHT, "night", "#C9CFDE", "#C9CFDE"),
                                          (DAY, "day", "#1E2233", "#1E2233")]:
        W = Image.new("RGB", (1760, 1560), ground)
        def put(svg, x, y, w, tint2=None, nearest=None, invert=False):
            render(os.path.join(OUT, svg), "/tmp/_p.png", w, tint2)
            im = Image.open("/tmp/_p.png").convert("RGBA")
            if invert:
                from PIL import ImageOps
                r, g, b, a = im.split()
                im = Image.merge("RGBA", (ImageOps.invert(r), ImageOps.invert(g), ImageOps.invert(b), a))
            if nearest:
                im = im.resize((im.width*nearest, im.height*nearest), Image.NEAREST)
            W.paste(im, (x, y), im)
        # patches row (color) + 1bit row
        for i, s in enumerate(["fo01", "fo02", "fo03", "fo04", "cr01"]):
            put(f"nyko-patch-{s}.svg", 30 + i*348, 28, 320)
            put(f"nyko-patch-{s}-1bit.svg", 72 + i*348, 372, 236, invert=(gname == "night"))
        # section glyphs + spots
        for i, n in enumerate(["overview", "profile", "missions", "payloads", "fieldops", "crew", "comms"]):
            put(f"nyko-section-{n}.svg", 60 + i*240, 660, 24, tint, nearest=3)
            put(f"nyko-section-{n}-spot.svg", 48 + i*240, 760, 96)
        # symbols 24 + 16
        for i, n in enumerate(["summit", "trailhead", "campsite", "skilift", "viewpoint", "water", "north", "scalecaps"]):
            put(f"nyko-sym-{n}-24.svg", 60 + i*212, 920, 24, sym_tint, nearest=3)
            put(f"nyko-sym-{n}-16.svg", 70 + i*212, 1010, 16, sym_tint, nearest=3)
        # 404 + stencil + countdown
        put("nyko-404-los.svg", 30, 1090, 420)
        put(f"nyko-wordmark-stencil-{'ember' if gname=='night' else 'ink'}.svg", 500, 1130, 540)
        for i, n in enumerate(["t3", "t2", "t1"]):
            put(f"nyko-count-{n}.svg", 1120, 1100 + i*140, 300, tint)
        W.save(os.path.join(OUT, f"contact-sheet-{gname}.png"))
    print("assembled")

if __name__ == "__main__":
    main()
