"""Geometry helpers for the NYKO generator.

Everything is built as skia-pathops paths so booleans (knock-outs, occlusion
gaps, unions for 1-bit single paths) are exact, and emitted as plain SVG `d`
strings. No masks, no rasters, no fonts in any output.
"""
import math
import re

import pathops

CAP = {"butt": pathops.LineCap.BUTT_CAP, "round": pathops.LineCap.ROUND_CAP,
       "square": pathops.LineCap.SQUARE_CAP}
JOIN = {"miter": pathops.LineJoin.MITER_JOIN, "round": pathops.LineJoin.ROUND_JOIN,
        "bevel": pathops.LineJoin.BEVEL_JOIN}

# ---------------------------------------------------------------- affine ----
# affine = (a, b, c, d, e, f) as in SVG matrix(a b c d e f)
I = (1, 0, 0, 1, 0, 0)


def mul(m, n):
    """m after n (apply n first, then m)."""
    a, b, c, d, e, f = m
    A, B, C, D, E, F = n
    return (a * A + c * B, b * A + d * B, a * C + c * D, b * C + d * D,
            a * E + c * F + e, b * E + d * F + f)


def T(x, y):
    return (1, 0, 0, 1, x, y)


def S(sx, sy=None):
    return (sx, 0, 0, sx if sy is None else sy, 0, 0)


def R(deg):
    r = math.radians(deg)
    return (math.cos(r), math.sin(r), -math.sin(r), math.cos(r), 0, 0)


def chain(*ms):
    """chain(A, B, C) = A·B·C : C applied first (SVG transform-list order)."""
    out = I
    for m in ms:
        out = mul(out, m)
    return out


def apply(m, x, y):
    a, b, c, d, e, f = m
    return (a * x + c * y + e, b * x + d * y + f)


# ------------------------------------------------------------- parsing -----
_TOK = re.compile(r"[A-Za-z]|[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?")


def parse(d, m=I, fill="winding"):
    """SVG path data -> pathops.Path (M L H V Q C A Z, abs + rel), transformed by m."""
    toks = _TOK.findall(d)
    p = pathops.Path()
    i = 0
    cmd = None
    cx = cy = sx = sy = 0.0
    open_ = False

    def num():
        nonlocal i
        v = float(toks[i])
        i += 1
        return v

    while i < len(toks):
        if toks[i].isalpha():
            cmd = toks[i]
            i += 1
            if cmd in "Zz":
                p.close()
                cx, cy = sx, sy
                open_ = False
                continue
        rel = cmd.islower()
        C = cmd.upper()
        ox, oy = (cx, cy) if rel else (0.0, 0.0)
        if C == "M":
            x, y = num() + ox, num() + oy
            p.moveTo(x, y)
            cx, cy = sx, sy = x, y
            open_ = True
            cmd = "l" if rel else "L"
        elif C == "L":
            x, y = num() + ox, num() + oy
            p.lineTo(x, y)
            cx, cy = x, y
        elif C == "H":
            x = num() + (cx if rel else 0)
            p.lineTo(x, cy)
            cx = x
        elif C == "V":
            y = num() + (cy if rel else 0)
            p.lineTo(cx, y)
            cy = y
        elif C == "Q":
            x1, y1, x, y = num() + ox, num() + oy, num() + ox, num() + oy
            p.quadTo(x1, y1, x, y)
            cx, cy = x, y
        elif C == "C":
            x1, y1, x2, y2 = num() + ox, num() + oy, num() + ox, num() + oy
            x, y = num() + ox, num() + oy
            p.cubicTo(x1, y1, x2, y2, x, y)
            cx, cy = x, y
        elif C == "A":
            rx, ry, rot, la, sw = num(), num(), num(), num(), num()
            x, y = num() + ox, num() + oy
            p.arcTo(rx, ry, rot,
                    pathops.ArcSize.LARGE if la else pathops.ArcSize.SMALL,
                    pathops.Direction.CW if sw else pathops.Direction.CCW, x, y)
            cx, cy = x, y
        else:
            raise ValueError("unsupported path command " + cmd)
    if fill == "evenodd":
        p.fillType = pathops.FillType.EVEN_ODD
    if m != I:
        p = p.transform(*m)
        if fill == "evenodd":
            p.fillType = pathops.FillType.EVEN_ODD
    return p


# ------------------------------------------------------------ builders -----
def poly(pts, m=I, closed=True):
    p = pathops.Path()
    x, y = apply(m, *pts[0])
    p.moveTo(x, y)
    for q in pts[1:]:
        p.lineTo(*apply(m, *q))
    if closed:
        p.close()
    return p


def rect(x, y, w, h, m=I):
    return poly([(x, y), (x + w, y), (x + w, y + h), (x, y + h)], m)


def circle(cx, cy, r, m=I):
    return ellipse(cx, cy, r, r, 0, m)


def ellipse(cx, cy, rx, ry, rot=0, m=I):
    """Closed ellipse from 4 cubic arcs (k = 0.5523), clockwise in screen space."""
    k = 0.5522847498
    pts = [(rx, 0), (rx, k * ry), (k * rx, ry), (0, ry), (-k * rx, ry), (-rx, k * ry),
           (-rx, 0), (-rx, -k * ry), (-k * rx, -ry), (0, -ry), (k * rx, -ry), (rx, -k * ry)]
    mm = chain(m, T(cx, cy), R(rot))
    tp = [apply(mm, *q) for q in pts]
    p = pathops.Path()
    p.moveTo(*tp[0])
    for j in range(4):
        a, b, c = tp[3 * j + 1], tp[3 * j + 2], tp[(3 * j + 3) % 12]
        p.cubicTo(a[0], a[1], b[0], b[1], c[0], c[1])
    p.close()
    return p


def ellipse_arc(cx, cy, rx, ry, rot, t0, t1, m=I, n=None):
    """Open elliptical arc from parameter angle t0 to t1 (degrees), cubic pieces."""
    if n is None:
        n = max(1, int(math.ceil(abs(t1 - t0) / 30.0)))
    mm = chain(m, T(cx, cy), R(rot))
    p = pathops.Path()
    dt = math.radians(t1 - t0) / n
    kk = 4.0 / 3.0 * math.tan(dt / 4)
    t = math.radians(t0)

    def pt(t):
        return (rx * math.cos(t), ry * math.sin(t))

    def dv(t):
        return (-rx * math.sin(t), ry * math.cos(t))

    p.moveTo(*apply(mm, *pt(t)))
    for _ in range(n):
        a, b = pt(t), pt(t + dt)
        da, db = dv(t), dv(t + dt)
        c1 = (a[0] + kk * da[0], a[1] + kk * da[1])
        c2 = (b[0] - kk * db[0], b[1] - kk * db[1])
        q1, q2, q3 = apply(mm, *c1), apply(mm, *c2), apply(mm, *b)
        p.cubicTo(q1[0], q1[1], q2[0], q2[1], q3[0], q3[1])
        t += dt
    return p


def ellipse_point(cx, cy, rx, ry, rot, t, m=I):
    tt = math.radians(t)
    return apply(chain(m, T(cx, cy), R(rot)), rx * math.cos(tt), ry * math.sin(tt))


# ----------------------------------------------------------- operations ----
def stroke(p, w, cap="butt", join="miter", miter=4.0):
    q = pathops.Path()
    q.addPath(p)
    q.stroke(w, CAP[cap], JOIN[join], miter)
    return simplify(q)


def _noconic(p):
    q = pathops.Path()
    q.addPath(p)
    q.fillType = p.fillType
    q.convertConicsToQuads()
    return q


def simplify(p):
    return pathops.simplify(_noconic(p), fix_winding=True, keep_starting_points=False,
                            clockwise=True)


def union(*ps):
    ps = [p for p in ps if p is not None]
    if not ps:
        return pathops.Path()
    out = simplify(ps[0])
    for p in ps[1:]:
        out = pathops.op(out, _noconic(p), pathops.PathOp.UNION, fix_winding=True,
                         keep_starting_points=False, clockwise=True)
    return out


def diff(a, *bs):
    out = a
    for b in bs:
        out = pathops.op(_noconic(out), _noconic(b), pathops.PathOp.DIFFERENCE, fix_winding=True,
                         keep_starting_points=False, clockwise=True)
    return out


def inter(a, b):
    return pathops.op(_noconic(a), _noconic(b), pathops.PathOp.INTERSECTION, fix_winding=True,
                      keep_starting_points=False, clockwise=True)


def dilate(p, r, join="round"):
    """Grow a filled shape by r (used for occlusion gaps)."""
    return union(p, stroke(p, 2 * r, "butt", join))


def xf(p, m):
    q = p.transform(*m)
    return q


# -------------------------------------------------------------- output -----
def fmt(v, prec=3):
    s = f"{v:.{prec}f}".rstrip("0").rstrip(".")
    return "0" if s in ("-0", "") else s


def d(p, prec=3):
    """pathops.Path -> compact absolute SVG path data."""
    q = pathops.Path()
    q.addPath(p)
    try:
        q.convertConicsToQuads()
    except Exception:
        pass
    out = []
    V = pathops.PathVerb
    for verb, pts in q:
        if verb == V.MOVE:
            out.append("M" + fmt(pts[0][0], prec) + " " + fmt(pts[0][1], prec))
        elif verb == V.LINE:
            out.append("L" + fmt(pts[0][0], prec) + " " + fmt(pts[0][1], prec))
        elif verb == V.QUAD:
            out.append("Q" + " ".join(fmt(v, prec) for pt in pts for v in pt))
        elif verb == V.CUBIC:
            out.append("C" + " ".join(fmt(v, prec) for pt in pts for v in pt))
        elif verb == V.CLOSE:
            out.append("Z")
        else:
            raise ValueError(verb)
    return "".join(out)


def bounds(p):
    return p.bounds  # (xmin, ymin, xmax, ymax)


def contour_area(pts):
    a = 0.0
    for i in range(len(pts)):
        x0, y0 = pts[i]
        x1, y1 = pts[(i + 1) % len(pts)]
        a += x0 * y1 - x1 * y0
    return abs(a) / 2


def drop_specks(p, min_area):
    """Remove closed contours whose (control-polygon) area is below min_area."""
    out = pathops.Path()
    for c in p.contours:
        pts = [pt for _, seg in c for pt in seg]
        if len(pts) >= 3 and contour_area(pts) < min_area:
            continue
        out.addPath(c)
    return simplify(out)
