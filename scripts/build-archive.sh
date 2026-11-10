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

# v2 project images: originally served from an S3 bucket that is now gone (403).
# The same files are in the app repo, so serve those instead.
mkdir -p "$DIST/v2/media"
cp "$ROOT/archive/v2/app/src/resources/logos/"{1a.png,dc2.png,dino.gif} "$DIST/v2/media/"

# v2 API: each endpoint returned { <name>: data/<name>.json }, so write the same shape,
# pointing the dead S3 image URLs at /v2/media/
mkdir -p "$DIST/v2/api"
for name in experiences skills projects; do
  node -e 'const fs=require("fs");const[n,src,out]=process.argv.slice(1);const txt=fs.readFileSync(src,"utf8").replaceAll("https://s3.amazonaws.com/nykolas.me/","/v2/media/");fs.writeFileSync(out,JSON.stringify({[n]:JSON.parse(txt)}))' \
    "$name" "$ROOT/archive/v2/api/data/$name.json" "$DIST/v2/api/$name"
done
if grep -l "s3.amazonaws.com/nykolas.me/[^\"]*\.\(png\|gif\|jpe\?g\)" "$DIST/v2/api/"*; then
  echo "unmapped S3 image left in the v2 API data" >&2; exit 1
fi

echo "archive ok: dist/v1, dist/v2"
