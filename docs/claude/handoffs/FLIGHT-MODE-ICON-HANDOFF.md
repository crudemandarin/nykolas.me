# Iconography handoff: Flight Mode (hero easter egg)

**From:** site agent · **To:** iconography agent · **Date:** 2026-11-11 · **Status:** all four items delivered 2026-11-11 (`brand/round-1-launch/gen_flight.py`; FL-01 in round-2 `gen_patches.py`; see `docs/claude/README.md`).

Clicking the NYKO rocket in the homepage hero starts a hidden mini-game called **Flight Mode**:
- The hero copy fades away and the rocket shrinks to about 0.4× its hero size.
- The visitor flies it with WASD. W fires the main engines; A and D fire small RCS thrusters to rotate; S fires retro thrusters.
- A small laser deploys from the side of the hull and fires straight ahead on Space. It breaks up asteroids and meteors.
- Esc lands the rocket and brings the page back.

Everything is drawn on the existing hero canvas. There are no DOM sprites.

Two pieces of art are required and two are optional. Everything else (bolts, explosions, debris, RCS puffs, asteroids, score pop-ups, the HUD frame) is procedural canvas geometry in the existing style. Please don't draw those.

Context files:
- Hero canvas engine: `src/components/HeroSky.astro`. The rocket and satellite are ported path-for-path from the mark into `Path2D`; see the `R` and `S` objects.
- Rocket source geometry: `public/brand/nyko-animated.svg` (the rocket group inside `translate(284 230) rotate(-45)`).
- The best model for how to deliver hardware art: `public/brand/nyko-ufo.svg`. It has a documented origin, named groups back to front, a named anchor, and a palette that matches the rocket. Please follow that pattern.
- UI glyph family to match: `brand/round-1-launch/` (`nyko-ui-*.svg`, see its README §C).

---

## Rocket local frame (for item 1)

All rocket art is in the mark's own units. The site draws it at scale `s`: **≈0.66 in the hero and ≈0.4 in Flight Mode**. Your art must hold up at **0.4×**, so 1 unit = 0.4px. Use strong silhouettes, few interior lines, and no detail under ~4 units.

```
            −y  (upper flank: the side facing the viewer's upper-left in the hero)
             ↑
 tail −184 ──┼──────────────────────────────→ +x  nose 187
             ↓
            +y
```

| Feature | Local coords |
|---|---|
| Nozzles (flames exit −x) | x −184…−175, at y −31.5 / 0 / +31.5 |
| Boosters (outer hull) | from (−175, ±46) tapering to (−31, ±18.5) |
| Core stage | x −175…58, y ±15.5…18 |
| **N⅄KO lettering, keep clear** | x −160…−33, y ±17 |
| Interstage (dark, lattice) | x 58…76, y ±15.5 |
| Upper stage | x 76…120, y ±15.5 |
| Fairing + blue band | x 112…187, y ±19.5; band at x 126…133 |
| Hull ink / outline | `#1E2233`; outline `rgba(30,34,51,0.75)` at 1.6 |
| Hull gradient | `#C9CFDE` → `#9AA4BE` → `#525C7A` (top to bottom) |

---

## 1. Laser pod: `nyko-laser-pod.svg` (required)

A small side-mounted gun on the **upper flank (−y)** of the core stage. It must look like real hardware bolted to a Soyuz, like the satellite does: a hard point, a short housing and a barrel. Not a sci-fi blaster.

**Two states, one file, as named groups:**
- `stowed`: lies flush along the hull. Nothing extends beyond **y −24**, so the hero silhouette barely changes.
- `deployed`: swung or raised out on a short arm. The barrel axis runs **parallel to +x** at roughly **y −30 to −36**, so it clears the fairing (y −19.5) when it fires forward.

The site animates between the two states in code (about 400ms when Flight Mode starts). Please draw them so a simple interpolation works: the same parts in both groups, with the arm rotated or translated. If they can't share parts, say how you'd animate it, and a crossfade is acceptable.

**Placement:**
- The mount sits on the core-stage hull line (**y ≈ −17.5**) somewhere in **x −25…55**, between the booster tips and the interstage. Your call within that range.
- It must not cover the N⅄KO lettering or the booster outline.
- The barrel tip can reach as far forward as **x ≈ 110**, and no further.

**Anchors (put these in the header comment, as `nyko-ufo.svg` does):**
- `mount`: the hinge point, in rocket units.
- `muzzle`: where bolts spawn in the deployed state, in rocket units. The bolt travels along +x from here.

**File conventions:**
- viewBox in rocket units, with the **rocket origin as (0,0)**, so the site can draw it directly inside the rocket's transform.
- Groups back to front, with ids.
- Palette from the rocket only: hull gradient, `#1E2233`, brand-blue `#3238C9` on at most one small part (blue is for hardware, as on the satellite panels and fairing band).
- **No ember**: the bolt itself will be ember/amber, so the gun stays cool-toned.
- No gradients that rely on `objectBoundingBox`; use `userSpaceOnUse`. Flat fills are fine. No text, no filters, no `<use>`. The site reads this file twice: once as an image, and once by porting its paths into `Path2D`. Please keep it simple: `path`, `rect`, `circle`, `ellipse`, `linearGradient`.

Please also add a QA preview of the pod on the full rocket at 1× and 0.4×, on Night `#101322` and Day `#F4F5F9`.

## 2. HUD glyphs: `nyko-ui-*` additions (required)

There is a small telemetry HUD in the hero corners during Flight Mode. Three glyphs go beside mono numbers. They must match the round-1 UI glyph family: 24 viewBox, single `currentColor` fill/outline construction like `nyko-ui-engine-armed.svg`, reading down to 16px.

| File | Meaning | Notes |
|---|---|---|
| `nyko-ui-hull.svg` | Hull integrity (shown with 3 pips) | Suggestion: a hull-plate / shield section. Not a heart. |
| `nyko-ui-laser.svg` | Weapon ready / heat | Suggestion: the pod silhouette from item 1, reduced, barrel at the family's 45° attitude. |
| `nyko-ui-target.svg` | Score: rocks destroyed | Suggestion: a reticle or crosshair on a tumbling rock. Must not read as the existing `nyko-sym-viewpoint`. |

Deliver them to `brand/round-1-launch/` and `public/brand/ui/`, and add them to the round-1 README table.

## 3. Game-over plate (optional)

When the hull reaches 0, the site shows `LOSS OF SIGNAL` with the score and best score. The current plan reuses `nyko-404-los.svg`, the satellite adrift. If you'd rather give the rocket its own beat (for example, the rocket tumbling with a broken trajectory dash, in the same language), deliver `nyko-flight-los.svg` (320 viewBox, static, Night ground). If you skip this, the 404 art is used.

## 4. Mission patch: `nyko-patch-fl01.svg` (optional)

Earned by clearing the first wave. The site would show it briefly in the HUD and might list it in the Flight Manual. Same template as FO-01…04 (512 viewBox, readable at 96px, 1-bit twin). The subject is your call: the rocket and a broken asteroid would be on theme. **≤1 ember element.**


## 5. Wave patches for every wave (added 2026-11-11)

There is now a patch for every wave, not just FL-01. The integration brief is [WAVE-PATCH-HANDOFF.md](WAVE-PATCH-HANDOFF.md).

---

## Not needed (drawn in code)

- Laser bolts, muzzle flash, impact sparks.
- Explosions, debris and the split pieces of asteroids. Asteroids are random polygons, with `AST-####` tags in place already.
- RCS puffs at the nose and tail.
- Hull-hit flicker and screen shake.
- The HUD frame, corner brackets, keycap hints (`W A S D`, `SPACE`, `ESC`) and score text. These are CSS/mono type in the design system.

## Questions back to the site agent

If anything here doesn't fit the hardware, such as the mount position or barrel height, change it and note it in the file's header comment. The site will follow the anchors you give.
