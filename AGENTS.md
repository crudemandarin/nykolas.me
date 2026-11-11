# AGENTS.md

nykolas.me is the personal site of Nykolas Farhangi. It's a static Astro 5 site deployed to GitHub Pages, styled entirely from its own design system, **Flight Manual**, under the **NYKO** identity (a Soyuz-style rocket on an orbit). The whole site uses a spaceflight metaphor: sections are "Mission Profile", "Crew", "Comms"; the changelog is the "Flight Log"; the colophon is the "Flight Manual".

## Commands

Node 22 (`.nvmrc`).

```sh
npm install
npm run dev            # tokens + astro dev → http://localhost:4321
npm run build          # tokens + astro build → dist/, then measure.mjs rewrites src/data/budget.json
npm run preview        # serve dist/
npm run build:archive  # after build: adds /v1 and /v2 to dist/ (runs npm ci in archive/v2/app)
npm run terrain        # rebuild src/data/terrain-fo01.json (needs python3 + numpy, scipy, contourpy)
```

There are no tests, linter or formatter. **`npm run build` succeeding is the check.** Pages compile to flat files (`dist/index.html`, `dist/flight-manual.html`, …) because of `build.format: 'file'` and `trailingSlash: 'never'`.

Deploy: pushing to `main` runs `.github/workflows/deploy.yml` (build, then build:archive, then Pages). PRs build but don't deploy. Changes that only touch `archive/` don't trigger a deploy.

## Layout

```
src/
  pages/        index, flight-manual, flight-log, 404
  layouts/      Base.astro: <head>, masthead, footer, and the one inline script (theme/motion switches, clock, copy buttons, nav highlight)
  components/   Header, StatusBar, Footer, HeroSky (canvas night sky), Orbit, IconExplorer, TopoMap/Transect/Terrain3D (FO-01 survey)
  components/sections/   Missions, Payloads, FieldOps: home-page sections that can be toggled off
  data/site.ts  ALL site copy: person, sections, profile, missions, payloads, fieldOps, crew, flightLog
  data/*.json   generated: budget.json (measure.mjs, every build), terrain-fo01.json (terrain.py)
  design/tokens.json   Flight Manual design tokens (source of truth)
  styles/       tokens.css (GENERATED), components.css (nk-* primitives), site.css (layout)
  icons/        section-*.svg, inlined with ?raw
  scripts/terrain3d.ts   hand-written WebGL 2 survey model, lazy-loaded
public/         served as-is: brand marks, patches, crew photos, favicons, terrain mesh
brand/          identity source art and Python generators (not served)
scripts/        tokens.mjs, measure.mjs, terrain.py, build-archive.sh
data/           raw elevation grid for FO-01
archive/v1, archive/v2   earlier sites, served at /v1 and /v2
docs/claude/    cross-session notes and brand decisions (read before brand work)
```

## Conventions

**Copy lives in `src/data/site.ts`.** Components only lay it out. To change wording, edit that file and not the markup. To take a home-page section off the site, set `hidden: true` in `allSections` rather than deleting it; visible sections are renumbered 00, 01, 02… automatically. Missions, Payloads and Field Ops are currently hidden.

**Design tokens.** Edit `src/design/tokens.json`, never `src/styles/tokens.css`, which `npm run dev`/`build` regenerates. Use the CSS variables (`var(--ember)`, `var(--space-6)`) and the type classes (`display-lg`, `lead`, `body-sm`, `nk-label`, `data`…); don't hard-code colours, sizes or fonts. Each token's `usage` field says where it may and may not go. Respect it, especially the contrast notes (e.g. `ink-subtle` never on `surface-300`; text on ember is `on-ember`, never white).

**Design rules** (from the Flight Manual's principles):
- One accent, `ember`, under roughly 10% of any viewport, for the thing that matters on that screen.
- No shadows. Depth comes from overlap and line weight.
- Both themes: Night (`data-theme="dark"`, default) and Day (`light`). Check both.
- Motion: everything must park in a resting pose when `data-motion="idle"` (the "Engines" switch, or OS reduced-motion). Gate animation on that attribute.
- Focus is a solid 2 px ring. Keep components keyboard-reachable and labelled.

**Performance and JavaScript.** Static output, no client framework, almost no JS, and everything readable with scripts off. Small behaviour goes in the `is:inline` script in `Base.astro` as progressive enhancement: controls that need JS ship with `hidden` and the script un-hides them. Heavy things (the WebGL model) load only when scrolled into view. Don't add a UI framework, analytics, or third-party scripts or fonts. Fonts are self-hosted via Fontsource, latin subset. The Flight Manual publishes the page weight from `src/data/budget.json`. Every build measures the fresh `dist/` and rewrites that file, but only after the pages have rendered, so the figures on the page lag one build behind. Commit it when the numbers change.

**Writing site copy.** Match the voice already in `site.ts`: first person, plain words, short declarative sentences. Concrete specifics (numbers, names, outcomes) beat adjectives. No em dashes in prose; use a full stop, comma, colon or parentheses instead. No hype or marketing words ("passionate", "cutting-edge", "leverage", "seamless"). The spaceflight vocabulary goes in labels and headings (Mission Profile, Crew file, Channel open), not in the sentences themselves.

**Class prefixes.** `nk-` is a design-system primitive (`components.css`); everything else is page layout (`site.css`).

**Dependencies** are pinned to exact versions in `package.json`. Keep it that way.

## Brand assets

- `public/brand/`, `public/patches/` and `src/icons/` are **copies** of art whose source lives in `brand/` (round-1 and round-2 generators) or outside the repo. Read `docs/claude/README.md` before changing, renaming or regenerating any of it. It records which version of each mark is canonical and which generator functions are deliberately disabled.
- Don't create new art unless asked. When tidying, copy and rename existing files.
- SVGs contain no `<text>`: type is outlined to paths.

## Archive (`archive/`)

`v1` (2020, static HTML/jQuery) and `v2` (2021–2023, React app + Express API) are preserved history, served at `/v1` and `/v2` with a banner that `build-archive.sh` injects. Small fixes that keep them working are fine, like restoring a dead image link. Preserve the original code: no modernising, refactoring, reformatting or dependency upgrades. `build-archive.sh` freezes the v2 API into static JSON and maps images from `archive/v2/media/images.json`. If you touch it, run `npm run build && npm run build:archive` to verify.

## Working in this repo

- The owner often edits `src/` in parallel. Leave unrelated working-tree changes alone, and don't commit them with yours.
- Commit your own work when a change is done and `npm run build` passes. Stage only the files you changed (`git add <paths>`, never `git add -A`). Check `git diff --cached` first: the owner may already have changes staged, and those must not go into your commit (`git commit --only <paths>` leaves them out). If one of your files also holds the owner's uncommitted edits, commit only your hunks. Don't push unless asked: a push to `main` deploys the live site.
- Commit messages are short, imperative and scoped by area ("Flight Manual: add iconography explorer", "v2 archive: …").
- When adding a user-visible change of note, consider a line in `flightLog` in `site.ts`.
