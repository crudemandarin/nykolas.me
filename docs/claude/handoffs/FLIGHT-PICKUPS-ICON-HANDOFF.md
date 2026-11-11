# Iconography handoff: Flight Mode pickups

**From:** site agent · **To:** iconography agent · **Date:** 2026-11-11 · **Status:** gameplay built with placeholders. Art delivered 2026-11-11 (items 1–2, by `brand/round-1-launch/gen_flight.py`). The placeholders can be swapped

Flight Mode, the hero easter egg, now has three pickups. They float in the field as small canisters, and flying through one collects it. Each pickup has a HUD status readout.

| Kind | Effect | Where it comes from | Colour (fixed, both themes) |
|---|---|---|---|
| **Shield** | Absorbs the next hit; lasts 20s | Shooting a meteor (70%), breaking a big rock (10%), clearing a wave, a friendly UFO scan | `#7CC4FF` (the boost/γ blue) |
| **Repair** | +1 hull, or +500 points at full hull | Same sources. Weighted towards repair when damaged; always a repair on a wave clear if damaged | `#3FD69B` (`--nominal`) |
| **Overclock** | Laser becomes a continuous beam with no heat: 5.6s of beam charge, drained only while firing | Same sources | `#FFB300` (`--amber`) |

Context:
- Code: `src/scripts/flight.ts`. See `drawPickup()`, `drawOver()` (the shield bubble) and the HUD section of `drawHud()`.
- Earlier brief, with conventions and delivery pattern: [FLIGHT-MODE-ICON-HANDOFF.md](FLIGHT-MODE-ICON-HANDOFF.md). It's the same family as `nyko-ui-{hull,laser,target}.svg` and `nyko-laser-pod.svg` from `brand/round-1-launch/gen_flight.py`.

**Placeholders in place now** (replace these): a diamond plate, 24px across, outlined in the kind colour, with a code-drawn symbol (a dome for shield, a plus for repair, a zigzag bolt for overclock). Under it is a pulsing halo ring and an 8px mono label. Placeholder HUD symbols are drawn next to `SHIELD 20` and `OVERCLOCK`.

---

## 1. Pickup canisters: `nyko-pickup-{shield,repair,overclock}.svg` (required)

Floating supply canisters, seen at **~28px on screen** (the canvas draws them at a fixed size and doesn't scale them with the rocket).
- Hardware, not gems or power-up orbs. Think small sealed cargo pods or beacons, kin to the satellite and the laser pod: hull greys, ink outline, rocket hull gradient where useful.
- **Exactly one element in the kind colour** per canister (a band, lens or light) identifies it. The three must be told apart by colour *and* by a shape or symbol, since some people can't separate blue, green and amber.
- They should share a silhouette, so they read as one family with three variants.
- Format:
  - viewBox `-16 -16 32 32`, with the origin at the centre (the site draws it centred and rotates it gently).
  - Flat fills, plus `userSpaceOnUse` gradients if needed.
  - Shapes limited to `path`, `rect`, `circle`, `ellipse` and `linearGradient`. No text, filters or `<use>`.
- The halo ring and the label stay in code, so don't draw them.

## 2. HUD status glyphs: `nyko-ui-{shield,repair,overclock}.svg` (required)

These sit beside `SHIELD 18` and `OVERCLOCK` in the bottom-left HUD, next to the existing hull and laser glyphs. Repair shows briefly when it's collected.
- Same rules as `nyko-ui-hull/laser/target`: 24 viewBox, **a single `currentColor` path** (the site lifts the `d` attribute into `Path2D` and tints it), reading down to 14px.
- `shield` must read differently from `nyko-ui-hull`, which is already a hull plate. A bubble or arc over a small hull silhouette would fit.
- `overclock`: suggestion only, the laser pod glyph with a continuous beam line, or a lightning mark.
- Deliver to `brand/round-1-launch/` and `public/brand/ui/`, add them to `gen_flight.py`, and add them to the round-1 README table.

## Not needed (drawn in code)

- The shield bubble around the rocket (dashed blue ellipse).
- The overclock beam.
- Collect sparks and pop-up text (`SHIELD ONLINE`, `HULL +1`, `SUPPLY DROP`…).
- The halo and label under each canister.

## Questions back to the site agent

Note any size or format change in the file's header comment, as with the laser pod. The site will follow it.
