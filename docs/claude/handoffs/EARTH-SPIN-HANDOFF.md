# Handoff: a slowly rotating Earth in the hero

**From:** iconography · **To:** hero-sky implementor · **Date:** 2026-11-11 · **Status:** art done, not wired in

The hero Earth should turn slowly on its axis. The art for any rotation angle now exists as a small, pure module. This doc covers how to wire it into `src/scripts/hero-sky.ts`. Nothing in `src/` has been changed for this.

**It is decoration only.** The Earth must not be interactive in any way: no hover, click, cursor change, tooltip, focus or label. It sits between the rocket, the UFO and the Flight Mode targets, and anything that catches the pointer there would get in their way.

## What you get

`brand/round-2-iconography/earth-art.ts` is pure: no DOM and no randomness, so the same angle always gives the same paths. Its only dependency is `d3-geo`, which the site already uses for the Travel Log globe.

```ts
const { earthLayers, EARTH } = await import('../../brand/round-2-iconography/earth-art');

const L = earthLayers(lon, cloudShift);
// L.ocean  -- not a path: fill a circle of radius EARTH.R (60)
// L.grid   -- path data, STROKE (1 unit wide, EARTH.grid at EARTH.gridAlpha)
// L.land   -- path data, fill EARTH.land
// L.ice    -- path data, fill with a linear gradient EARTH.ice[0] -> [1], from (0,-60) to (0,-30)
// L.clouds -- path data, fill EARTH.cloud
```

**Coordinates.** All paths are in the same box as `nyko-earth.svg`: -64 to 64, origin at the centre, disc radius 60. Nothing goes outside r = 60.

**`lon`** is the longitude at the centre of the disc, in degrees.
- `EARTH.REST_LON` (-100) is the resting pose. `earthLayers(EARTH.REST_LON)` is pixel-identical to `/brand/nyko-earth.svg`, so swapping from the SVG to live drawing doesn't jump.
- Earth turns eastward, so **decrease** `lon` over time.

**`cloudShift`** (degrees, optional) moves the clouds east relative to the ground, for a slow weather drift. Pass 0 to fix the clouds to the ground.

**Ocean gradient:** a linear gradient from `EARTH.ocean[0]` at (-42,-42) to `EARTH.ocean[1]` at (42,42). This is the same as the SVG.

The static `nyko-earth.svg` is written from this same module (`earthSvg()`), so the two can't drift apart.

## Wiring it into `hero-sky.ts`

The Earth is currently drawn by `drawBody(EARTH, …)` from the static SVG. Keep that path. It's both the resting pose and the fallback.

1. **Load only when it can move.** After the first frame, and only if the motion is not idle, `import()` the module. Vite will put `d3-geo` in a chunk shared with the Travel Log globe. Until the import resolves, keep drawing the SVG.
2. **Angle.** When the module loads, note the world clock as `wt0`. Then use:
   ```ts
   lon = EARTH.REST_LON - SPIN * (wt - wt0)    // SPIN = 3 (degrees per second): one turn in two minutes
   cloudShift = 0.25 * (wt - wt0)              // optional slow weather drift
   ```
   Starting from `REST_LON` makes the swap from the SVG seamless. Use the dilated world clock `wt`, like the Moon and the satellite, so the Earth slows with the rest of the sky during a boost or Flight Mode.
3. **Bake to an offscreen canvas and redraw only when needed.** Re-render when `lon` has moved by at least 0.4° since the last bake, or when the drawn size changes, as `drawBody` already does. At 3°/s that's about 7 bakes a second, and every other frame just uses `drawImage`. The bake:
   ```ts
   const k = px / 128;                                  // px = bake canvas size, as in drawBody
   b.setTransform(k, 0, 0, k, px / 2, px / 2);
   b.clearRect(-64, -64, 128, 128);
   b.beginPath(); b.arc(0, 0, 60, 0, TAU); b.fillStyle = oceanGradient; b.fill(); b.clip();
   b.globalAlpha = EARTH.gridAlpha; b.lineWidth = 1; b.strokeStyle = EARTH.grid; b.stroke(new Path2D(L.grid)); b.globalAlpha = 1;
   b.fillStyle = EARTH.land; b.fill(new Path2D(L.land));
   b.fillStyle = iceGradient; b.fill(new Path2D(L.ice));
   b.fillStyle = EARTH.cloud; b.fill(new Path2D(L.clouds));
   ```
   Then `drawImage` it exactly where `drawBody` puts the SVG bake.
4. **Everything else stays as it is:** the atmosphere halo, `shadeFrom()` (the night side follows the sun, not the rotation), the Moon and its orbit, the `EARTH` callout and the draw order.
5. **Engines off (`data-motion="idle"`) and reduced motion:**
   - If motion is idle at load, never import the module. The SVG is the resting pose.
   - If motion switches to idle mid-session, go back to the SVG (`lon = REST_LON`), so the sky parks in the same pose every time.
6. **No interaction.** Don't add the Earth to `hitsShip`, the pointer handlers, the cursor logic, the Flight Mode collision or target lists, or any accessibility label. Pointer events over the Earth should behave as if it weren't there.

## Performance (measured)

| | Cost |
|---|---|
| Download: `earth-art` + the parts of `d3-geo` it uses | ~13 KB gzipped. `d3-geo` is shared with the Travel Log globe chunk, so the net addition to the home page is about 6 KB. |
| `earthLayers()` per call (Node, M-series laptop) | ~2 ms |
| Bakes at 3°/s with a 0.4° threshold | ~7 per second, so about 1.5% of one core. Other frames cost a single `drawImage`. |
| First paint | Unchanged. The static SVG draws first, and the module loads after it. |

If profiling shows the bakes matter on slow phones, raise the threshold to 0.6°. At the 30px phone size you won't see the difference.

## Rules to keep

- **Don't edit the art in `earth-art.ts`** (palette, clouds, ice cap, grid, coastline detail). Ask for it as an art change. The coastline block between the `<land>` markers is generated by `brand/round-2-iconography/gen_earth.mjs`, which also rewrites the static SVG and the QA sheet. Reading `EARTH.*` is fine.
- **No ember, and no theme tinting.** The palette is fixed in both themes, like the UFO's.
- **Don't draw the Earth bigger than about 160px** without asking. The detail level is tuned for 30–72px.

## Acceptance checklist

- [ ] On load, the Earth matches the static SVG exactly, then starts turning eastward with no jump.
- [ ] One full turn takes about two minutes, and the turn slows with the world clock during a boost or Flight Mode.
- [ ] The night side stays on the side away from the sun as the globe turns.
- [ ] The coastline and grid hold their shape while turning, with no wobble or flicker.
- [ ] Engines off: no import, the Earth is still and in the resting pose. Switching Engines off mid-spin snaps it back to rest.
- [ ] Hovering, clicking or tapping the Earth does nothing: no cursor change and no tooltip. The rocket, UFO and Flight Mode behave as before.
- [ ] Night and Day both checked, at 1440px, 900px and phone width.
- [ ] `npm run build` passes, and the page weight on the Flight Manual (`budget.json`) moves by roughly the figures above.
