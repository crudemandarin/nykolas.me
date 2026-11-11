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
| `nyko-patch-fl01[-1bit].svg` | Flight Mode, first wave cleared: the rocket at its 45° climb fires one **ember bolt** into an asteroid split along a crack. Flat-filled mark planes, no lettering | hull-shadow, hull-mid, hull-light, blue band, amber flame, ember (bolt only) |
| `nyko-patch-cr01[-1bit].svg` | Powder, simple head-and-collar side profile facing right, minimal detail: bright-white head, ink outline, light-blue collar, rose-gold bone tag, gold patch trim | white `#FFFFFF`, powder-blue `#A6C6E6`, rose-gold `#EBC0AE`, gold trim `#CBA135` (palette extension per Nykolas) |

1-bit versions are single black ink (invert freely): ring, silhouette art, knocked-out details, outlined text.
Use on Field Ops cards at 96–128px; 1024px via the paired `.png` or re-render.

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
