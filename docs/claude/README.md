# Notes for Claude: nykolas.me

Information and decisions to keep across sessions. Read this before touching brand assets.
Update it when a decision changes; don't leave stale entries.

## Where things live

| What | Where |
|---|---|
| Brand steward handoff (master reference for logo + iconography) | [handoffs/BRAND-HANDOFF.md](handoffs/BRAND-HANDOFF.md) |
| Full brand export (generators, PNG previews, briefs, DESIGN-HANDOFF.md) | `~/Downloads/nyko-brand-export.zip`. Not in the repo. |
| Round-1 assets (lockups, compact mark, UI glyphs) + generator | `brand/round-1-launch/` |
| Round-2 iconography (patches, section marks, map symbols, 404, stencil) + generators | `brand/round-2-iconography/` |
| Favicon set actually in use | `brand/favicon-light/` → `public/favicon.*` |
| Hi-fi logo files served by the site | `public/brand/` |
| Section icons inlined in pages | `src/icons/section-*.svg` (same art as `nyko-section-*.svg`, with a11y attrs, no `<title>`) |
| Hero night-sky canvas (rocket, satellite, UFO, meteors, Earth + Moon, deep-field galaxies) | `src/scripts/hero-sky.ts`, mounted by `src/components/HeroSky.astro`. The laser pod and UFO are ported into `Path2D` there, so if the SVGs change, re-port them. |
| Earth + Moon for the hero (brief) | [handoffs/EARTH-ICON-HANDOFF.md](handoffs/EARTH-ICON-HANDOFF.md). Delivered 2026-11-11: `public/brand/nyko-{earth,moon}.svg` from `brand/round-2-iconography/gen_earth.mjs` (Natural Earth 110m, coarsened and rounded on purpose: small background art; unlit). Wired in: `hero-sky.ts` bakes both via `drawBody()`; the halo, night side and Moon phase stay in code. Galaxies stay procedural |
| Flight Mode game (click the hero rocket) | `src/scripts/flight.ts`. The HUD glyphs are read from `public/brand/ui/nyko-ui-{hull,laser,target}.svg` at build time. |
| Flight Manual iconography explorer | `src/components/IconExplorer.astro` |
| Travel Log globe (data / section / engine) | `src/data/travel.ts`, `src/components/sections/TravelLog.astro`, `src/scripts/globe.ts` |
| Pending art request: Travel Log section mark | [handoffs/TRAVEL-ICON-HANDOFF.md](handoffs/TRAVEL-ICON-HANDOFF.md) |
| Flight Mode pickups (brief) | [handoffs/FLIGHT-PICKUPS-ICON-HANDOFF.md](handoffs/FLIGHT-PICKUPS-ICON-HANDOFF.md). Delivered 2026-11-11: `nyko-pickup-{shield,repair,overclock}.svg` + `nyko-ui-{shield,repair,overclock}.svg` from `gen_flight.py` |
| Wave patches: integration brief for the implementor | [handoffs/WAVE-PATCH-HANDOFF.md](handoffs/WAVE-PATCH-HANDOFF.md) |
| Flight Mode art (brief) | [handoffs/FLIGHT-MODE-ICON-HANDOFF.md](handoffs/FLIGHT-MODE-ICON-HANDOFF.md). All four items delivered |
| Pending art request: Flight Mode pickups (canisters + HUD glyphs) | [handoffs/FLIGHT-PICKUPS-ICON-HANDOFF.md](handoffs/FLIGHT-PICKUPS-ICON-HANDOFF.md). The game uses code-drawn placeholders until it's delivered |
| Flight Mode art (source) | `brand/round-1-launch/gen_flight.py` → `nyko-laser-pod.svg`, `nyko-ui-{hull,laser,target}.svg`, `nyko-flight-los.svg`, `qa/flight-mode-qa.svg`; copies in `public/brand/` and `public/brand/ui/`. Wave patches (FL-01 … any wave): `brand/round-2-iconography/wave-patch.ts` `wavePatch(n)`, the single source (art only; wiring it into the game is the implementor's, see [handoffs/WAVE-PATCH-HANDOFF.md](handoffs/WAVE-PATCH-HANDOFF.md)). `brand/round-2-iconography/gen_wave_patches.mjs` writes the static FL-01 + `qa/wave-progression.svg` |

The logo generator from the export (`logo/gen3.py`) is **not** in the repo. Files in `public/brand/` that came from it are copied outputs.

## Decisions (2026-11-11)

These came out of reconciling `nyko-brand-export.zip` against the repo. The owner made each pick.

- **`nyko-1bit-plain.svg`**: the export version is canonical: rocket, flame and a rounder 196×88 orbit, nothing else. The previous repo version, with the wider 224×74 orbit, orb and satellite, is kept as `public/brand/nyko-1bit-plain-detail.svg`.
- **CR-01 Powder patch**: the **hand-drawn** art is canonical. Master: `brand/round-2-iconography/assets/powder-patch.svg`; copies: `nyko-patch-cr01.svg` in round-2 and `public/patches/`. The handoff doc describes the older *traced* version and its split collar layers. Those are superseded, so don't restore them. `cr01()` in round-2 `gen_patches.py` is deliberately disabled. Don't copy the export's `gen_patches.py` over it, or a re-run will overwrite the hand-drawn art.
- **CR-01 1-bit** (`nyko-patch-cr01-1bit.svg`): known stale. It's still the traced head, so it doesn't match the hand-drawn colour patch. The owner chose not to make new art for it. Leave it until asked.
- **Static `nyko.svg` and `nyko-favicon.svg`** were added to `public/brand/` from the export and listed in the Flight Manual explorer. The site favicon is still the round-1 compact mark; `nyko-favicon.svg` is gallery-only.

## UFO model (`public/brand/nyko-ufo.svg`)

A model only. Someone else is programming it into `HeroSky.astro`, replacing `drawUfo()`. The intended behaviour: the UFO occasionally pulls up beside the NYKO rocket and scans it directly.

- Origin (0,0) is the saucer centre on the rim line; the viewBox is `-136 -72 272 128`.
- Groups, back to front: `underglow`, `dome-interior`, `pilot`, `dome-glass`, `hull`, `rim-lights` (`light-1`…`light-7`), `emitter`.
- The scan beam should originate at the emitter lens, `(0, 31)`.
- The palette matches the rocket's hard-coded hull colours, plus `--nominal` green for the glow, emitter and pilot.
- The green alien pilot must stay clearly visible in the dome. That was the explicit ask.

## Flight Mode laser pod (`public/brand/nyko-laser-pod.svg`)

- Drawn in rocket units with the rocket origin at (0,0), so it goes inside the rocket's transform, after the hull.
- Deploy uses a parallelogram linkage: two arms of length 13 hinge at (16,−17.5) and (36,−17.5). One angle drives it, 180° stowed to 270° deployed. The barrel stays parallel to +x throughout.
- Muzzle anchor (deployed): (81,−33). Groups: `mount`, then `stowed`/`deployed`, each with `-arm-rear`, `-arm-front` and `-gun`. The full recipe is in the file's header comment.
- The file shows the deployed state; `stowed` has `display="none"`.
- `gen_flight.py` only needs `skia-pathops`, not rsvg or Chrome. That isn't installed system-wide, so use a scratch venv. `gen.py` imports its glyphs so a full round-1 run includes them.
- **Wave patches** use one progression pattern, designed 2026-11-11: stars (1–5 per tier), five tiers that change field, ring and speed stripes, and background rocks. The spec is in the round-2 README under "Wave patches". Keep the ember bolt as the only ember element, and keep gold off them (gold trim is CR-01 only). FL patches are not in `gen_patches.py` any more; don't add an `fl01()` back. Keep the generator in `brand/`, not `src/`: the owner wants art and game programming separate.
- Round-2 `gen_patches.py`'s `__main__` writes to `out/` and calls `rsvg-convert`, and neither works in this repo. To rebuild one patch, import the module and call it (e.g. `fo02()`) with the scratch venv (`fonttools`), then write the two SVGs into round-2 and copy the colour one to `public/patches/`.
- QA sheets go in `brand/round-1-launch/qa/`, not loose in round-1. The Flight Manual explorer globs `round-1-launch/*.svg`, so any loose SVG there becomes a gallery tile.

## Working with the owner

See the handoff doc §5. The points that came up again this session:
- **Don't create new art unless asked.** When reconciling or tidying, copy and rename existing files instead of drawing replacements.
- Make a visual comparison page when the owner has to choose between versions; he marks picks there.
- He sometimes edits `src/` in parallel. Leave unrelated working-tree changes alone.

## Tooling

- `rsvg-convert` is not installed on this Mac. To render SVG → PNG for checks, use `sharp` from `node_modules` (`node -e "require('sharp')(svgBuffer,{density:288})..."`).
- Build: `npx astro build`. The Flight Manual page is output to `dist/flight-manual.html`.
