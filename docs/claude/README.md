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
| Hero night-sky canvas (rocket, satellite, UFO, meteors) | `src/components/HeroSky.astro` |
| Flight Manual iconography explorer | `src/components/IconExplorer.astro` |
| Travel Log globe (data / section / engine) | `src/data/travel.ts`, `src/components/sections/TravelLog.astro`, `src/scripts/globe.ts` |
| Pending art request: Travel Log section mark | [handoffs/TRAVEL-ICON-HANDOFF.md](handoffs/TRAVEL-ICON-HANDOFF.md) |
| Pending art request: Flight Mode laser pod + HUD glyphs | [handoffs/FLIGHT-MODE-ICON-HANDOFF.md](handoffs/FLIGHT-MODE-ICON-HANDOFF.md) |

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

## Working with the owner

See the handoff doc §5. The points that came up again this session:
- **Don't create new art unless asked.** When reconciling or tidying, copy and rename existing files instead of drawing replacements.
- Make a visual comparison page when the owner has to choose between versions; he marks picks there.
- He sometimes edits `src/` in parallel. Leave unrelated working-tree changes alone.

## Tooling

- `rsvg-convert` is not installed on this Mac. To render SVG → PNG for checks, use `sharp` from `node_modules` (`node -e "require('sharp')(svgBuffer,{density:288})..."`).
- Build: `npx astro build`. The Flight Manual page is output to `dist/flight-manual.html`.
