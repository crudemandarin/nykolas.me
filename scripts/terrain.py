"""Build the FO-01 survey sheet from real elevation data.

Input: data/crestone-z12-64.json — a 64x64 grid sampled from AWS Terrain Tiles
(terrarium, z12, tiles x=845..846, y=1579..1580), each cell the mean of 8x8 source
pixels, stored as uint8 with elevation_m = 2300 + 10 * v. "rows" are per-row byte
sums used to verify transfer.
Output: src/data/terrain-fo01.json — contour paths, markers and a transect profile
in a 640x480 plate.  Run: python3 scripts/terrain.py
"""
import base64, json, math, pathlib
import numpy as np
from scipy import ndimage
import contourpy

ROOT = pathlib.Path(__file__).resolve().parent.parent
raw = json.loads((ROOT / "data/crestone-z12-64.json").read_text())
b = base64.b64decode(raw["b64"])
assert [sum(b[j*64:(j+1)*64]) for j in range(64)] == raw["rows"], "grid checksum mismatch"
g = np.frombuffer(b, dtype=np.uint8).reshape(64, 64).astype(float) * 10 + 2300  # metres

Z, X0, Y0 = 12, 845, 1579
n = 2 ** Z
CELL = 32                    # grid cells per tile
CROP0, CROP1 = 12, 60        # rows kept (north crop) -> 64 x 48 cells
PX = 10                      # plate px per cell -> 640 x 480

def to_grid(lat, lon):
    xt = (lon + 180) / 360 * n
    r = math.radians(lat)
    yt = (1 - math.log(math.tan(r) + 1 / math.cos(r)) / math.pi) / 2 * n
    return (xt - X0) * CELL - 0.5, (yt - Y0) * CELL - 0.5       # (i, j) in cell-centre coords

def to_plate(i, j):
    return round((i + 0.5) * PX, 1), round((j - CROP0 + 0.5) * PX, 1)

def grid_lonlat(i, j):
    xt = X0 + (i + 0.5) / CELL; yt = Y0 + (j + 0.5) / CELL
    lon = xt / n * 360 - 180
    lat = math.degrees(math.atan(math.sinh(math.pi * (1 - 2 * yt / n))))
    return lat, lon

# smooth upsample for clean contours
UP = 4
gu = ndimage.zoom(g, UP, order=3)
scale = 63 / (gu.shape[0] - 1)
ys, xs = np.mgrid[0:gu.shape[0], 0:gu.shape[1]] * scale
gen = contourpy.contour_generator(xs, ys, gu, line_type="Separate")

FT = 0.3048
contours = []
for ft in range(8000, 14400, 400):
    lines = gen.lines(ft * FT)
    parts = []
    for ln in lines:
        pts = [(x, y) for x, y in ln if CROP0 - 1 <= y <= CROP1]
        if len(pts) < 6: continue
        pts = pts[::3] + [pts[-1]]
        d = "M" + "L".join("%d,%d" % tuple(map(round, to_plate(x, y))) for x, y in pts)
        parts.append(d)
    if parts:
        contours.append({"ft": ft, "index": ft % 2000 == 0, "d": " ".join(parts)})

markers = {
    "crestone_town": {"label": "CRESTONE", "lat": 37.99444, "lon": -105.69611, "ft": 7930},
    "crestone_peak": {"label": "CRESTONE PEAK", "lat": 37.96667, "lon": -105.58529, "ft": 14294},
    "crestone_needle": {"label": "CRESTONE NEEDLE", "lat": 37.96472, "lon": -105.57668, "ft": 14197},
}
for m in markers.values():
    i, j = to_grid(m["lat"], m["lon"]); m["x"], m["y"] = to_plate(i, j)

# transect: town -> Crestone Peak, sampled from the DEM
ti, tj = to_grid(markers["crestone_town"]["lat"], markers["crestone_town"]["lon"])
pi_, pj = to_grid(markers["crestone_peak"]["lat"], markers["crestone_peak"]["lon"])
N = 96
ii = np.linspace(ti, pi_, N); jj = np.linspace(tj, pj, N)
el = ndimage.map_coordinates(g, [jj, ii], order=3, mode="nearest")
def hav(a, b):
    R = 6371000; la1, lo1, la2, lo2 = map(math.radians, (*a, *b))
    h = math.sin((la2-la1)/2)**2 + math.cos(la1)*math.cos(la2)*math.sin((lo2-lo1)/2)**2
    return 2 * R * math.asin(math.sqrt(h))
dist_mi = hav((markers["crestone_town"]["lat"], markers["crestone_town"]["lon"]),
              (markers["crestone_peak"]["lat"], markers["crestone_peak"]["lon"])) / 1609.344
profile = [[round(k / (N - 1) * dist_mi, 3), round(float(e) / FT)] for k, e in enumerate(el)]
transect = {"x1": to_plate(ti, tj)[0], "y1": to_plate(ti, tj)[1], "x2": to_plate(pi_, pj)[0], "y2": to_plate(pi_, pj)[1]}

nw = grid_lonlat(-0.5, CROP0 - 0.5); se = grid_lonlat(63.5, CROP1 - 0.5)
km_w = hav((nw[0], nw[1]), (nw[0], se[1])) / 1000
out = {
    "source": "AWS Terrain Tiles (terrarium), z12, resampled to ~240 m cells",
    "width": 640, "height": 480, "interval_ft": 400, "index_ft": 2000,
    "bounds": {"north": round(nw[0], 4), "west": round(nw[1], 4), "south": round(se[0], 4), "east": round(se[1], 4)},
    "km_per_px": km_w / 640,
    "contours": contours, "markers": markers, "transect": transect,
    "profile": profile, "profile_miles": round(dist_mi, 2),
    "grid_min_ft": round(g.min() / FT), "grid_max_ft": round(g.max() / FT),
}
(ROOT / "src/data/terrain-fo01.json").write_text(json.dumps(out))
print(len(contours), "levels;", sum(len(c["d"]) for c in contours) // 1024, "KB paths; transect", round(dist_mi, 2), "mi; plate", round(km_w, 2), "km wide")
print({k: (v["x"], v["y"]) for k, v in markers.items()}, out["bounds"], out["grid_min_ft"], out["grid_max_ft"])

# ── 3D mesh: the same plate, lightly smoothed and resampled to a 129 x 97 vertex grid (uint16 decimetres, little-endian)
COLS, ROWS = 129, 97
uu = np.linspace(0, 1, COLS); vv = np.linspace(0, 1, ROWS)
UI, VJ = np.meshgrid(-0.5 + uu * 64, (CROP0 - 0.5) + vv * (CROP1 - CROP0), indexing="xy")
mesh = ndimage.map_coordinates(ndimage.gaussian_filter(g, 0.6), [VJ, UI], order=3, mode="nearest")
mesh_dm = np.clip(np.round(mesh * 10), 0, 65535).astype("<u2")   # decimetres: no stair-steps on the valley floor
(ROOT / "public/terrain").mkdir(parents=True, exist_ok=True)
(ROOT / "public/terrain/fo01.bin").write_bytes(mesh_dm.tobytes())
out["mesh"] = {"url": "/terrain/fo01.bin", "cols": COLS, "rows": ROWS, "min_m": int(mesh.min()), "max_m": int(np.ceil(mesh.max())), "scale": 0.1,
               "width_km": round(km_w, 3), "depth_km": round(km_w * 480 / 640, 3)}
(ROOT / "src/data/terrain-fo01.json").write_text(json.dumps(out))
print("mesh", COLS, "x", ROWS, round(mesh.min()), round(mesh.max()), len(mesh_dm.tobytes()) // 1024, "KB")
