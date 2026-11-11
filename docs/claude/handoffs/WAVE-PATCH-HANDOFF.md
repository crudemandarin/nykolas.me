# Handoff: wave patches in Flight Mode

**From:** iconography · **To:** Flight Mode implementor · **Date:** 2026-11-11 · **Status:** art done, not wired in

Today the game awards one patch: FL-01, for clearing wave 1. The art now exists for **every wave**, generated on the spot. This doc covers how to wire it into `src/scripts/flight.ts`. Nothing in `src/` has been changed for this.

## What you get

`brand/round-2-iconography/wave-patch.ts` is a pure module: no DOM, no randomness, no dependencies. Wave N always gives byte-identical SVG.

```ts
import { wavePatch, waveTier, waveStars, waveCode, TOP_TIER } from '../../brand/round-2-iconography/wave-patch';

const p = wavePatch(7);
// p.wave   7
// p.code   'FL-07 · WAVE 7'
// p.tier   1        (0..4)
// p.stars  2        (1..5)
// p.color  standalone 512×512 SVG string, about 15 KB. Use this in the game.
// p.onebit 1-bit twin (print/merch). Don't use it in the game.
```

How the patches progress (the full spec and visuals are in `brand/round-2-iconography/README.md` under "Wave patches"; the QA sheet is `brand/round-2-iconography/qa/wave-progression.svg`):
- **Stars:** each wave adds an amber star on the ring, 1 to 5.
- **Tiers:** every 5 waves the patch goes up a tier (new field, ring and speed stripes) and the stars reset to 1. Tier 4 (wave 21+) is the top rank: from there only the code changes.
- **Rocks:** background rocks fill in over waves 2–9.

`/patches/nyko-patch-fl01.svg` is exactly `wavePatch(1).color`, so wave 1 looks the same either way.

## How to turn it into something drawable

The patch is a full-colour SVG, so draw it with `drawImage`. Don't port it to `Path2D`.

```ts
const patchImg = new Map<number, HTMLImageElement>();
function patchArt(wave: number): HTMLImageElement {
  let img = patchImg.get(wave);
  if (!img) {
    img = new Image();
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(wavePatch(wave).color);
    patchImg.set(wave, img);
  }
  return img;
}
```

- Decoding is async. Keep using the existing `isReady(img)` guard before drawing.
- Call `patchArt(wave)` when a wave **starts**, so the image is decoded before the wave is cleared.
- Cache by wave. A run only ever needs the current wave's patch and the best one.
- Don't regenerate per frame.
- Don't inline the SVG strings into the DOM. They're meant to be images. (Their ids are prefixed per wave, `fl7-art`, `fl7-m`, so inlining wouldn't break, but it isn't needed.)

## Changes in `flight.ts`

The current FL-01 code paths map one-to-one.

| Today (FL-01 only) | Change to |
|---|---|
| `ART_FL01` image loaded in `start` (~line 90) | `patchArt(wave)` from `startWave()`. Keep loading `ART_LOS` as now. |
| `if (wave === 1) { patchT = 0; … }` on wave clear (~line 499) | Award on **every** clear: `earned = wave`, then start the award animation. |
| `fl01Run`: earned this run | `runBest`: the highest wave patch earned this run (0 = none). |
| `fl01Ever` + `localStorage['nk-flight-fl01']` | `everBest` in a new key, `nk-flight-patch` (highest wave, as a number). **Migrate:** if the old key is `'1'` and the new key is missing, start at 1. |
| HUD badge after `FLIGHT MODE · WAVE nn` (~line 651), 20px | Draw `patchArt(runBest)`. It updates as the run goes on. |
| `drawPatchAward`: label `MISSION PATCH FL-01 · EARNED` | Label: `` `MISSION PATCH ${waveCode(w)} · EARNED` ``. See the timing note below. |
| Game-over plate (~line 770): FL-01 at 44px with label `FL-01` | Show `patchArt(everBest)`, labelled `FL-nn` (or `runBest` if you'd rather show this run; the owner can decide). |
| `announce('Mission patch FL-01 earned.')` | `` announce(`Mission patch FL-${pad(w, 2)} earned.`) `` |

**Award timing.** Awarding on every wave would make the current 3.4s pop-and-hold, plus the extra wave delay (`nextWaveT = 3.6`), get repetitive. Recommended:
- **Tier-up waves** (`waveStars(w) === 1`: waves 1, 6, 11, 16, 21) get the full award: the 112px pop, the 3.4s hold and the extra delay. That's when the patch visibly changes colour.
- **Other waves** add a star. Use a short beat: about 1.2s at 72px, with no extra delay before the next wave. The new star is what reads.
- **After wave 21** nothing changes visually except the code, so the short beat is right.

## Rules to keep

- **Engines switch:** respect `data-motion="idle"` and reduced motion. Skip the pop scale and fades, and show the patch static for the same hold time.
- **Both themes:** the patch has its own ink or deep field, so it reads on Night and Day without changes. Don't tint it or apply `globalCompositeOperation` to it.
- **Sizes:** don't draw it below 20px. At 20px (the HUD) only the ring colour and stars read, and that's intended. The award should be at least 72px.
- **Don't edit the generator** to change the art (colours, star rules, tier thresholds). Ask for it as an art change, so the brand docs and QA sheet stay in step. Reading `waveTier`/`waveStars`/`TOP_TIER` for game logic is fine.
- **No new ember** around the patch. Its bolt is already the one ember element. Use amber for the label, as `drawPatchAward` does today.

## Optional

- **Flight Manual:** the "Flight Mode" or iconography section could show the series. Render `wavePatch(n).color` for waves 1, 6, 11, 16 and 21 (one per tier) at build time in an `.astro` component, as `<img src="data:…">` with `alt={code}`. No client JS is needed.
- **Static files:** the brand script only writes FL-01, so `public/patches/` has no other wave files. If you want static files for sharing or OG images, ask and they can be emitted the same way.

## Acceptance checklist

- [ ] Clearing waves 1–6 in one run shows FL-01 to FL-06. Waves 1 and 6 get the full award; 2–5 get the short beat.
- [ ] The HUD badge always shows the latest patch earned this run.
- [ ] The game-over plate shows the patch and its `FL-nn` label.
- [ ] Reloading the page keeps the best patch.
- [ ] An existing `nk-flight-fl01 = '1'` migrates to wave 1.
- [ ] Private mode (localStorage throws) still plays, with nothing persisted.
- [ ] Engines off: no patch animation, same timings.
- [ ] Night and Day both checked.
- [ ] `npm run build` passes.
