# NYKO Iconography — Round 2 (P1 + P2)

Bespoke marks for nykolas.me per ICONOGRAPHY-BRIEF.md sections E–H + 24–25.
Everything is generated — regenerate with the included scripts rather than hand-editing outputs
(`python3 gen_patches.py && python3 gen_glyphs.py && python3 gen_extra.py && python3 assemble.py`).
Patch telemetry text is outlined IBM Plex Mono Medium (OFL; TTFs included in `fonts/`). No live fonts, no rasters.

Palette tokens as in the brief: ink `#1E2233`, hull-shadow `#525C7A`, hull-mid `#9AA4BE`,
hull-light `#C9CFDE`, hull-xlight `#DDE2EC`, brand-blue `#3238C9`, ember `#FF4A22`, amber `#FFB300`.

## Mission patches (512 viewBox, readable at 96px; 1-bit included)

| File | Art | Colors beyond ink field |
|---|---|---|
| `nyko-patch-fo01[-1bit].svg` | The two Crestones over Great Sand Dunes, hard valley-floor horizon | hull-shadow, hull-mid, **amber dunes**, hull-light |
| `nyko-patch-fo02[-1bit].svg` | Monarch ridge, **ember ski descent line**, Continental Divide obelisk at the pass | hull-shadow, hull-mid, ember, hull-light |
| `nyko-patch-fo03[-1bit].svg` | Ravenna ravine: fir banks, truss footbridge, creek. No accent — quiet, home base | hull-shadow, hull-mid, hull-light |
| `nyko-patch-fo04[-1bit].svg` | Mulberry Mountain: Ozark canopy ridges, **ember signal trace** rising, amber moon | hull-shadow, hull-mid, ember, amber |
| `nyko-patch-fl01[-1bit].svg` | Flight Mode wave 1 (FL-01): the rocket at its 45° climb fires one **ember bolt** into an asteroid split along a crack. It's wave 1 of the generated series below and is written by `gen_wave_patches.mjs`, not `gen_patches.py` | hull-shadow, hull-mid, hull-light, blue band, amber flame, ember (bolt only) |
| `nyko-patch-cr01[-1bit].svg` | Powder, simple head-and-collar side profile facing right, minimal detail: bright-white head, ink outline, light-blue collar, rose-gold bone tag, gold patch trim | white `#FFFFFF`, powder-blue `#A6C6E6`, rose-gold `#EBC0AE`, gold trim `#CBA135` (palette extension per Nykolas) |

1-bit versions are single black ink (invert freely): ring, silhouette art, knocked-out details, outlined text.
Use on Field Ops cards at 96–128px; 1024px via the paired `.png` or re-render.


## Earth and Moon (hero sky)

- **The art:** `earth-art.ts` (this folder) is the Earth as a pure module. `earthLayers(lon)` returns the ocean, grid, land, ice and cloud paths for any rotation, so the hero can spin it. How to wire it in: `docs/claude/handoffs/EARTH-SPIN-HANDOFF.md`.
- **The generator:** `gen_earth.mjs` (`node brand/round-2-iconography/gen_earth.mjs`) bakes the coastline into `earth-art.ts`, then writes:
  - `nyko-earth.svg`: the resting pose, viewBox -64…64, disc r60;
  - `nyko-moon.svg`: viewBox -16…16, disc r15;
  - copies of both in `public/brand/`;
  - `qa/earth-moon-qa.svg`, which shows the sizes, lit and unlit, on Night and Day, plus an 8-step rotation strip.
- **Earth:**
  - **View:** orthographic. The resting pose is centred over North America (28°N 100°W), with Seattle upper-left.
  - **Land:** Natural Earth 110m, coarsened on the sphere (3.5° point spacing). Islands smaller than about 140,000 km² are dropped. Edges are rounded at draw time. The level of detail is low on purpose, so it reads as engineering-cartoon background art at 30–72px.
  - **Grid:** a faint 30° graticule (latitude/longitude lines) over the ocean, which gives the engineering touch and makes the spin readable.
  - **Ice:** a north polar cap and Greenland, in a glacial cyan gradient (`#E2F6F8` at the pole to `#8FD3E3`), so it reads apart from the white clouds.
  - **Clouds:** puffy clusters on both hemispheres, so no view of the globe is empty.
- **Moon:** the near side, with simplified maria.
- **Both:** unlit, because the site shades the night side and the phase from the sun's direction. There is no ember, and the green isn't `--nominal`. The palette is the same in both themes.

## Wave patches (Flight Mode, any wave)

`wave-patch.ts` (this folder) makes the patch for any wave, so the game can award one when a wave is cleared. How to wire it into the game: `docs/claude/handoffs/WAVE-PATCH-HANDOFF.md`.
`wavePatch(n)` returns `{ color, onebit, code, tier, stars }`, where `color` and `onebit` are standalone 512px SVG strings.
The function is pure: wave N always gives the same bytes. It uses the same template as the patches above, and the text is outlined from glyphs baked into the module.

| Signal | Rule | What changes |
|---|---|---|
| Stars | `((n-1) % 5) + 1` | Amber stars with an ink keyline, embroidered on the top of the ring. Each wave in a tier adds one. In 1-bit they are knocked out of the ring. |
| Tier | `min(floor((n-1)/5), 4)` | Every 5 waves the field, ring and speed stripes step up, and the stars reset to one. |
| Contacts | `min(n-1, 8)` | Small background rocks fill in over the early waves. |

| Tier | Waves | Field | Ring | Speed stripes |
|---|---|---|---|---|
| T0 | 1–5 | ink | slate (hull-mid) | none |
| T1 | 6–10 | ink | slate | 1, hull-shadow |
| T2 | 11–15 | ink | hull-light | 2, hull-shadow |
| T3 | 16–20 | deep `#2A3170` | hull-light | 3, blue |
| T4 | 21+ | deep | blue | 3, blue, + amber inner trim. This is the top rank: later waves keep it and only the code changes |

Fixed rules:
- **Ember:** the bolt is the only ember element at every wave.
- **Stripes:** they sit on the rocket's upper-left flank, parallel to its axis like the mark's speed trails, and stay clear of the target and the code.
- **No gold:** gold trim stays exclusive to the crew patch (CR-01).
- **Code text:** `FL-07 · WAVE 7`.

Regenerate:
- `node gen_wave_patches.mjs` (Node 22.6+) writes the static FL-01 files and `qa/wave-progression.svg`, which shows waves 1–25 in colour and 1-bit.
- `python3 gen_wave_font.py` re-bakes the glyphs. It's only needed if the code wording gains new characters.

## Section marks — `nyko-section-<name>.svg` (24px, currentColor) + `-spot.svg` (64px, fixed palette)

overview (launch) · profile (ID plate) · missions (ascent trajectory + ticks) ·
payloads (open fairing + capsule) · fieldops (contour peak) · crew (hatch porthole) · comms (dish).
Glyphs: 1.5px strokes, square caps (round only on trajectories/crosses), one path set, CSS-tintable.
Spots: hull-mid/hull-light linework; single accent — ember flame (overview), ember trajectory (missions),
amber capsule (payloads), ember signal (comms).

## Diagram symbol kit — `nyko-sym-<name>-24.svg` / `-16.svg` (currentColor)

summit · trailhead · campsite · skilift · viewpoint · water · north · scalecaps.
For survey-sheet maps; tint via CSS. Campsite is the one glyph where ember is earned — tint its flame
`#FF4A22` on maps if desired (ships as currentColor).

## 404 — `nyko-404-los[-animated].svg` (320 viewBox)

The Soyuz satellite adrift off a broken dashed trajectory, dash fragments scattering at the break,
star-chart crosses. Animated version: SMIL only — slow 11s/13s drift + wobble on mismatched periods,
fragments breathing; static file is the frozen pose for `prefers-reduced-motion`. Center under
`LOSS OF SIGNAL` on the Night ground.

## P2

- `nyko-wordmark-stencil-{ember,ink,1bit}.svg` — N⅄KO with military stencil slits, for merch.
- `nyko-count-t3/t2/t1.svg` — T–3 / T–2 / T–1 in the wordmark's block-segment geometry, currentColor,
  for a loading/countdown sequence.

## Contact sheets

`contact-sheet-night.png` / `contact-sheet-day.png` — everything on both grounds
(1-bit patches shown inverted on Night, as they'd be used).

## Acceptance checklist status

- 1-bit versions: patches ✓ (dedicated files), stencil ✓, glyphs/symbols are single-color by nature ✓
- Reads on `#101322` and `#F4F5F9` ✓ (see sheets)
- ≤1 ember element per mark ✓ · blue on hardware only (solar panels, collar, fairing band) ✓
- No shadows/glows/gradients except hull shading on the hi-fi 404 satellite ✓
- currentColor + shared stroke logic on UI-tier glyphs ✓
- Animation SMIL-only with frozen static pose ✓
- Generator scripts included ✓
