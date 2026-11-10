#!/usr/bin/env bash
# Builds the archived sites into dist/ so they ship with the main site:
#   archive/v1      -> dist/v1   (nykolas.me/v1, static HTML as-is)
#   archive/v2/app  -> dist/v2   (nykolas.me/v2, React build)
#   archive/v2/api  -> dist/v2/api  (the Express API's JSON, frozen as static files)
# Run after `npm run build`.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DIST="$ROOT/dist"
[ -d "$DIST" ] || { echo "dist/ not found: run npm run build first" >&2; exit 1; }

# v1: copy as-is
rm -rf "$DIST/v1" && mkdir -p "$DIST/v1"
rsync -a --exclude README.md --exclude .DS_Store "$ROOT/archive/v1/" "$DIST/v1/"

# v2: build the React app for the /v2 subpath, pointing it at the static API
rm -rf "$DIST/v2"
(
  cd "$ROOT/archive/v2/app"
  npm ci --no-audit --no-fund --loglevel=error
  CI=false GENERATE_SOURCEMAP=false PUBLIC_URL=/v2 REACT_APP_SERVICE_URL=/v2/api/ \
    BUILD_PATH="$DIST/v2" npm run build
)

# v2 images: originally served from an S3 bucket that is now gone (403).
# Copies live in archive/v2/media; images.json maps them onto the API data.
mkdir -p "$DIST/v2/media"
cp "$ROOT/archive/v2/media/"* "$DIST/v2/media/"
rm -f "$DIST/v2/media/images.json"

# v2 API: each endpoint returned { <name>: data/<name>.json }, so write the same shape,
# with project images and experience logos pointed at /v2/media/
mkdir -p "$DIST/v2/api"
node - "$ROOT/archive/v2" "$DIST/v2/api" <<'JS'
const fs = require("fs");
const [src, out] = process.argv.slice(2);
const map = JSON.parse(fs.readFileSync(`${src}/media/images.json`, "utf8"));
const read = (n) => JSON.parse(fs.readFileSync(`${src}/api/data/${n}.json`, "utf8"));
const media = (f) => `/v2/media/${f}`;
const projects = read("projects").map((p) => ({ ...p, img: map.projects[p.title] ? media(map.projects[p.title]) : p.img }));
const experiences = read("experiences").map((e) => (map.experiences[e.company] ? { ...e, logo: media(map.experiences[e.company]) } : e));
const data = { projects, experiences, skills: read("skills") };
for (const [n, v] of Object.entries(data)) {
  const missing = n === "projects" ? v.filter((p) => !p.img?.startsWith("/v2/media/")).map((p) => p.title)
    : n === "experiences" ? v.filter((e) => !e.logo).map((e) => e.company) : [];
  if (missing.length) { console.error(`v2 ${n} missing images: ${missing.join(", ")}`); process.exit(1); }
  for (const p of [...new Set(JSON.stringify(v).match(/\/v2\/media\/[^"]+/g) || [])])
    if (!fs.existsSync(`${src}/media/${p.slice(10)}`)) { console.error(`missing file ${p}`); process.exit(1); }
  fs.writeFileSync(`${out}/${n}`, JSON.stringify({ [n]: v }));
}
JS

# Archive banner: inject a small "you're viewing an archive" bar at the top of each page
node - "$DIST" <<'JS'
const fs = require("fs");
const dist = process.argv[2];
const bar = (label) =>
  `<div role="note" style="all:initial;display:flex;flex-wrap:wrap;justify-content:center;gap:4px 12px;padding:8px 16px;background:#101322;color:#C9CFDE;border-bottom:2px solid #FF4A22;font:500 12px/1.5 'IBM Plex Mono',ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.04em;text-align:center">` +
  `<span>ARCHIVE &middot; ${label}</span>` +
  `<a href="/" style="color:#FF4A22;text-decoration:underline;font:inherit">Go to the latest nykolas.me &rarr;</a></div>`;
for (const [v, label] of [["v1", "nykolas.me v1 (2020)"], ["v2", "nykolas.me v2 (2021&ndash;2023)"]]) {
  const f = `${dist}/${v}/index.html`;
  const html = fs.readFileSync(f, "utf8");
  if (!/<body[^>]*>/.test(html)) { console.error(`no <body> in ${f}`); process.exit(1); }
  fs.writeFileSync(f, html.replace(/<body[^>]*>/, (m) => m + bar(label)));
}
JS

echo "archive ok: dist/v1, dist/v2"
