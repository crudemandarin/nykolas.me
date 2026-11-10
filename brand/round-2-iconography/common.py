"""Shared infra for NYKO iconography: palette, text outlining, patch chrome, rendering."""
import os, subprocess
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "out")

# palette (from ICONOGRAPHY-BRIEF)
INK = "#1E2233"; HULL_D = "#525C7A"; HULL_M = "#9AA4BE"; HULL_L = "#C9CFDE"; HULL_XL = "#DDE2EC"
DEEP = "#2A3170"; BLUE = "#3238C9"; EMBER = "#FF4A22"; AMBER = "#FFB300"; CORE = "#FFF3E0"
NIGHT = "#101322"; DAY = "#F4F5F9"

# ---------------------------------------------------------------- text → paths
_fonts = {}
def _font(weight="Medium"):
    if weight not in _fonts:
        f = TTFont(os.path.join(HERE, "fonts", f"IBMPlexMono-{weight}.ttf"))
        _fonts[weight] = (f, f.getGlyphSet(), f["cmap"].getBestCmap(), f["head"].unitsPerEm)
    return _fonts[weight]

def text_path(s, size=24, tracking=0.12, weight="Medium"):
    """Return (svg path d, total width). tracking = em fraction added per char."""
    font, gs, cmap, upem = _font(weight)
    scale = size / upem
    x = 0.0; ds = []
    for ch in s:
        gname = cmap.get(ord(ch))
        if gname:
            pen = SVGPathPen(gs)
            gs[gname].draw(pen)
            d = pen.getCommands()
            if d:
                ds.append((x, d))
            x += gs[gname].width * scale / 1  # width in font units * scale
        else:
            x += 600 * scale
        x += tracking * size
    # build one path: wrap each glyph with translate+scale(flip y)
    parts = []
    for gx, d in ds:
        parts.append(f'<path transform="translate({gx:.2f} 0) scale({scale:.6f} {-scale:.6f})" d="{d}"/>')
    return "".join(parts), x - tracking * size

def text_group(s, size=24, tracking=0.12, weight="Medium", fill=HULL_L, anchor="middle", x=0, y=0):
    paths, w = text_path(s, size, tracking, weight)
    dx = -w/2 if anchor == "middle" else (-w if anchor == "end" else 0)
    return f'<g transform="translate({x+dx:.2f} {y:.2f})" fill="{fill}">{paths}</g>'

# ---------------------------------------------------------------- layered build (color + 1-bit)
class L:
    """One layer. onebit: 'ink' (draw solid), 'cut' (knock out of what's below), 'skip'."""
    def __init__(self, svg, onebit="ink", onebit_svg=None):
        self.svg = svg; self.onebit = onebit; self.onebit_svg = onebit_svg

def render_layers(layers, size=512, title="", defs=""):
    color = "".join(l.svg for l in layers)
    mask_parts = []
    for l in layers:
        if l.onebit == "skip":
            continue
        src = l.onebit_svg if l.onebit_svg is not None else l.svg
        col = "#fff" if l.onebit == "ink" else "#000"
        mask_parts.append(f'<g fill="{col}" stroke="{col}">{strip_colors(src)}</g>')
    onebit = (f'<defs>{defs}<mask id="m" maskUnits="userSpaceOnUse" x="0" y="0" width="{size}" height="{size}">'
              f'{"".join(mask_parts)}</mask></defs>'
              f'<rect width="{size}" height="{size}" fill="#000" mask="url(#m)"/>')
    head = f'<svg xmlns="http://www.w3.org/2000/svg" width="{size}" height="{size}" viewBox="0 0 {size} {size}"><title>{title}</title>'
    return head + f"<defs>{defs}</defs>" + color + "</svg>", head + onebit + "</svg>"

def strip_colors(svg):
    """Remove fill/stroke color attrs so mask group color applies (keeps stroke-width etc.)."""
    import re
    svg = re.sub(r'fill="(?!none)[^"]*"', '', svg)
    svg = re.sub(r'stroke="(?!none)[^"]*"', '', svg)
    svg = re.sub(r'(fill|stroke)-opacity="[^"]*"', '', svg)
    svg = re.sub(r'opacity="[^"]*"', '', svg)
    return svg

def write(name, content):
    p = os.path.join(OUT, name)
    open(p, "w").write(content)
    return p

def png(svg_name, png_name=None, size=512):
    png_name = png_name or svg_name.replace(".svg", ".png")
    subprocess.run(["rsvg-convert", "-w", str(size), "-h", str(size),
                    os.path.join(OUT, svg_name), "-o", os.path.join(OUT, png_name)], check=True)

# ---------------------------------------------------------------- patch chrome
def patch(name, code_text, art_layers, size=512, ring_col=HULL_M, hair_col=HULL_L):
    """Standard patch: merrow ring, ink field, art, telemetry text. Returns (color, onebit)."""
    c = size/2
    defs = f'<clipPath id="artclip"><circle cx="{c}" cy="{c}" r="214"/></clipPath>' 
    layers = [
        L(f'<circle cx="{c}" cy="{c}" r="230" fill="{INK}"/>', onebit="skip"),
        L(f'<circle cx="{c}" cy="{c}" r="238" fill="none" stroke="{ring_col}" stroke-width="16"/>',
          onebit="ink"),
        L(f'<circle cx="{c}" cy="{c}" r="216" fill="none" stroke="{hair_col}" stroke-width="2" opacity=".6"/>',
          onebit="skip"),
    ]
    _, w = text_path(code_text, 25, 0.14)
    tsize = min(25.0, 25.0 * 286.0 / w)
    layers = layers + art_layers + [
        L(text_group(code_text, size=tsize, tracking=0.14, fill=HULL_L, x=c, y=size-96), onebit="ink"),
    ]
    return render_layers(layers, size, name, defs)
