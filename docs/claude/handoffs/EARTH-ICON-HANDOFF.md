# Iconography handoff: Earth and the Moon (hero sky)

**From:** site agent · **To:** iconography agent · **Date:** 2026-11-11 · **Status:** art delivered 2026-11-11 (`public/brand/nyko-earth.svg`, `public/brand/nyko-moon.svg`; source `brand/round-2-iconography/gen_earth.mjs`, QA `qa/earth-moon-qa.svg`). Sizes and formats as specified below. Site swap pending

The hero night sky (`src/scripts/hero-sky.ts`) has a new body: **Earth, with the Moon** on a dashed orbit around it. It sits upper-centre on desktop (between the deep-field galaxy and the rocket) and top-left on phones, with a blueprint callout reading `EARTH`. The placeholder is an ocean disc with three rough land blobs and drifting cloud ellipses. It reads as "a planet", not as Earth. Please replace it with real art.

Context:
- Code: `drawEarth()`, `drawMoon()`, `moonPos()`, `shadeFrom()` and the `LAND` placeholder paths in `src/scripts/hero-sky.ts`.
- Neighbours to sit beside: the ringed planet (blue/indigo with cloud bands, drawn in code), the ember rocky world NK-4B, the sun, `public/brand/nyko-ufo.svg`, the satellite.
- Format precedent: `public/brand/nyko-ufo.svg` (an illustration the site bakes to an offscreen canvas and `drawImage`s).

---

## 1. `nyko-earth.svg` (required)

| | |
|---|---|
| viewBox | `-64 -64 128 128`, origin at the centre |
| Disc | radius **60**, so code can clip to it; nothing outside r=60 (the atmosphere halo is drawn in code) |
| On-screen size | 72px across on a 1440px desktop, ~48px at 900px, **30px on phones**. It must read as Earth at 30px |

- **Recognisably Earth:** blue ocean, land, white cloud. Suggestion: an orthographic view centred over North America, since the site's home coordinate is Seattle (47.61°N 122.33°W, shown in the hero corner). Simplified, flat-filled continent shapes are right. This is an illustration, not a map.
- **Unlit, please.** No terminator, night side, limb darkening or specular. The code shades the night side away from wherever the sun is on that layout (`shadeFrom()`), and that direction changes between desktop and phone. A very light overall gradient on the ocean is fine.
- **Clouds:** include a few in the art (they'll be static). The placeholder's drifting clouds will be removed.
- **Colours:** your call. Keep it clearly different from the ringed planet's indigo (`#3238C9` / `#2A3170` / `#8A93FF`). **No ember.** It's the one accent and the rocket owns it. Don't use `--nominal` green for land either: that's a status colour. Choose an illustration green. The palette is fixed in both themes, as the UFO's is.
- Shapes: `path`, `circle`, `ellipse`, `rect`, `linearGradient`/`radialGradient` (`userSpaceOnUse`). No text, filters, masks or `<use>`.

## 2. `nyko-moon.svg` (required, small)

| | |
|---|---|
| viewBox | `-16 -16 32 32`, origin at the centre |
| Disc | radius **15** |
| On-screen size | ~20px on desktop, **8px on phones** |

- Grey, with a few maria (the dark patches) rather than cratered "button holes", so it reads as *the* Moon and not the generic moon that orbits NK-4B.
- **Unlit**, for the same reason: the code shades its phase from the sun.
- Hull greys suit the rest of the scene (`#DDE2EC`, `#C9CFDE`, `#9AA4BE`, `#525C7A`).

## Delivery

- Generator and source go in `brand/`, wherever fits best (round-2 holds the illustrations; the UFO's source lives outside the repo). Copies go to `public/brand/nyko-earth.svg` and `public/brand/nyko-moon.svg`.
- A QA sheet at 30/48/72px (Earth) and 8/20px (Moon) on both Night `#0F1220` and Day `#F2F4F8` would help. Put it in the generator's `qa/` folder, not loose (the Flight Manual explorer globs loose SVGs into tiles).
- Add a line to `docs/claude/README.md` and update this file's status.

## Not needed (drawn in code)

- **The two background galaxies** (a spiral upper-left of Earth, an edge-on lens near the bottom). They're procedural star fields baked once per layout and tuned to sit far back. They aren't placeholders.
- The atmosphere halo, the night-side shading and phases, the Moon's dashed orbit, the `EARTH` callout.

## What the site will do on delivery

Load both SVGs as images, bake them to offscreen canvases like the UFO, and `drawImage` them in place of the placeholder (deleting `LAND` and the cloud wisps). Keep the code's halo and shading on top. Note any size or format change in the files' header comment and the site will follow it.
