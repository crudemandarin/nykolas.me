# Iconography handoff: the abducted cow (hero sky)

**From:** site agent · **To:** iconography agent · **Date:** 2026-11-11 · **Status:** art delivered 2026-11-11: `public/brand/nyko-cow.svg` (source `brand/round-2-iconography/gen_cow.py`, QA `qa/cow-qa.svg`), at the specified viewBox and origin. Wired in: `drawCow()` in `hero-sky.ts` now draws it; the placeholder is gone

The hero UFO has new visits. In one of them, it **grows up out of Earth with a cow held in its green tractor beam**, pulls the cow clear of the planet, and flies off with it. If Flight Mode shoots it mid-abduction, it drops the cow, which tumbles away. The cow is now the only placeholder in the scene.

Context:
- Code: `drawCow()` in `src/scripts/hero-sky.ts` (placeholder), called from `drawUfoBeam()` (abduct mode) and for the dropped cow.
- To watch it: open `/?ufo=abduct` (it repeats every few seconds). Other visits: `?ufo=land`, `?ufo=probe`, `?ufo=rise`.
- Neighbours: `public/brand/nyko-ufo*.svg` (the beam is `--nominal` green `#3FD69B`), Earth (`nyko-earth.svg`).

---

## `nyko-cow.svg` (required)

| | |
|---|---|
| viewBox | `-12 -10 24 20`, origin at the centre of the body |
| View | side view, facing right (+x), legs dangling straight down: it's being lifted, not standing |
| On-screen size | ~18px long on desktop, **~11px on phones**. It must read as a cow at 11px |

- **Reads as a cow at a glance:** a white body with black patches, a pink snout, and short horns or ears. The silhouette does the work; detail below ~1px won't survive.
- **Both themes:** it floats inside a translucent green cone over the Night `#0F1220` and Day `#F2F4F8` grids, so keep an ink outline (`#1E2233`, as on the placeholder) so the white body doesn't vanish on Day.
- **No ember**, and no green (the beam is green).
- Shapes: `path`, `rect`, `circle`, `ellipse`, gradients if needed (`userSpaceOnUse`). No text, filters, masks or `<use>`.
- It's drawn rotating gently (±20°) and bobbing, so don't bake in a ground shadow or a fixed tilt.

## Delivery

- Source and generator go in `brand/` wherever fits (round-2 holds the UFO pilots' `gen_ufo_aliens.mjs`); copy to `public/brand/nyko-cow.svg`.
- A QA sheet at 11/18/32px on Night and Day, in the generator's `qa/` folder.
- Add a line to `docs/claude/README.md` and update this file's status.

## Not needed (drawn in code)

The tractor beam cone, the UFO's scale-in and scale-out, the green ring pulses on the planets, the readouts (`SPECIMEN SECURED · BOVINE ∙ 1 HEAD` and the rest).
