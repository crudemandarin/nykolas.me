# nykolas.me

The personal site of Nykolas Farhangi, built on **Flight Manual**, the NYKO design system.

Static HTML generated with [Astro](https://astro.build) 5: no client framework, about 3 KB of inline JavaScript, self-hosted fonts. Every page reads fully with JavaScript off.

## Run it

```sh
npm install
npm run dev        # http://localhost:4321
npm run build      # → dist/
node scripts/measure.mjs && npm run build   # refresh the budget shown on /flight-manual
```

## Where things live

| Path | What |
|---|---|
| `src/data/site.ts` | **All copy.** Missions, payloads, Field Ops, crew, flight log, contact links, portrait. Edit words here. |
| `src/design/tokens.json` | Design tokens, exported from the Flight Manual design system. `npm run tokens` compiles them to `src/styles/tokens.css` (runs automatically on dev/build). |
| `src/styles/components.css` | Component styles, ported 1:1 from the design system. |
| `src/styles/site.css` | Page layout. |
| `src/components/` | Status bar, header, footer, mission card, survey sheet (`TopoMap`), transect, orbit. |
| `src/pages/` | `index`, `flight-manual` (colophon), `flight-log` (changelog), `404`. |
| `public/brand/` | NYKO marks. Swap in the favicon set and `og-card.png` when they land. |
| `public/crew/` | Powder. |
| `data/` + `scripts/terrain.py` | FO-01 survey sheet from real elevation data (see below). |

## The FO-01 survey sheet

`data/crestone-z12-64.json` is a 64×64 elevation grid sampled from Terrain Tiles on AWS (terrarium, z12, tiles x 845–846, y 1579–1580), stored as uint8 (`metres = 2300 + 10·v`) with per-row checksums. `npm run terrain` (Python 3 with `numpy`, `scipy`, `contourpy`) turns it into `src/data/terrain-fo01.json`: contours every 400 ft, markers and the Crestone → Crestone Peak transect. For a real route, add a GPX track and a finer grid.

## Deploy

Hosted on Cloudflare (Workers static assets, free tier). `wrangler.jsonc` points at `dist/`, maps `/flight-manual` → `flight-manual.html`, and serves `404.html` for misses.

- **CI/CD:** `.github/workflows/deploy.yml`. Every pull request builds the site. Every push to `main` builds and deploys. It needs two repository secrets: `CLOUDFLARE_API_TOKEN` (a token from the "Edit Cloudflare Workers" template) and `CLOUDFLARE_ACCOUNT_ID`.
- **By hand:** `npm run deploy` (logs in with Wrangler on first run).
- **Domains:** attach `nykolas.me` (and `www`) to the `nykolas-me` Worker under *Settings → Domains & Routes*. Redirect the `nyko.run` root to `https://nykolas.me` with a Redirect Rule in that zone.

## Before launch

- [ ] Add a portrait (`person.portrait` in `src/data/site.ts`), or keep the "awaiting uplink" plate.
- [ ] Confirm the contact email.
- [ ] Replace the interim favicon and header mark with the P0 set; add `public/brand/og-card.png`.
- [ ] Review the mission copy for anything you'd rather keep internal.
