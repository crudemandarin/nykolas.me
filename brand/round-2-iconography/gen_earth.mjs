// Earth and the Moon for the hero sky (docs/claude/handoffs/EARTH-ICON-HANDOFF.md).
//   node brand/round-2-iconography/gen_earth.mjs
// Earth: Natural Earth 110m land (world-atlas, already a site dependency) in an orthographic view over
// North America, so Seattle (the site's home coordinate) sits upper-left of centre. Unlit on purpose:
// the site shades the night side from the sun's direction, which changes per layout.
// Writes nyko-earth.svg, nyko-moon.svg (+ public/brand copies) and qa/earth-moon-qa.svg.
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { geoOrthographic, geoPath, geoCircle, geoContains } from 'd3-geo';
import { feature } from 'topojson-client';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const put = (p, s) => { writeFileSync(p, s); console.log('wrote', p.slice(ROOT.length + 1)); };

// ── palette (fixed in both themes, like the UFO) ──────────────────
const OCEAN_HI = '#2F8BD8', OCEAN_LO = '#1C5FAE';   // cyan-leaning blue, clear of the ringed planet's indigo
const LAND = '#5E9E4A';                              // illustration green; not --nominal, no ember
const ICE_HI = '#E2F6F8', ICE_LO = '#8FD3E3', CLOUD = '#F6F8FC';
const MOON = '#C9CFDE', MOON_HI = '#DDE2EC', MARE = '#9AA4BE';

// ── Earth ─────────────────────────────────────────────────────────
const R = 60;
const CENTRE = [-100, 28];                    // lon, lat at the disc centre
const proj = geoOrthographic().rotate([-CENTRE[0], -CENTRE[1]]).scale(R).translate([0, 0]).clipAngle(90).precision(0.2);
const path = geoPath(proj);

const topo = JSON.parse(readFileSync(join(ROOT, 'node_modules/world-atlas/land-110m.json'), 'utf8'));
const land = feature(topo, topo.objects.land);
const polys = land.features.flatMap((f) => (f.geometry.type === 'MultiPolygon' ? f.geometry.coordinates : [f.geometry.coordinates]))
  .map((coordinates) => ({ type: 'Polygon', coordinates }));
const projArea = (g) => path.area(g);
// Small background art: low detail on purpose. Keep only the big landmasses; Greenland is drawn as ice.
const GREENLAND = [-42, 72];
const kept = polys.filter((g) => projArea(g) >= 40);
const greenland = kept.filter((g) => geoContains(g, GREENLAND)), green = kept.filter((g) => !geoContains(g, GREENLAND));
// Arctic cap: a disc on the pole with two broad lobes, smooth-edged so it reads as ice, not as another cloud.
// (The South Pole is on the far side from this view, so there's only one cap.)
const CAP = [[0, 90, 19], [-95, 76, 9], [-150, 75, 8]]
  .map(([lon, lat, r]) => geoCircle().center([lon, lat]).radius(r).precision(4)());

// Path output: coarsen each projected ring (drop points closer than eps, 4 units for land) then round it off
// with quadratic curves through the edge midpoints. The curve stays inside the points' hull, so nothing passes r=60.
const fmt = (v) => (Math.round(v * 10) / 10).toString();
function smooth(ring, EPS) {
  const pts = [];
  for (const p of ring) if (!pts.length || Math.hypot(p[0] - pts.at(-1)[0], p[1] - pts.at(-1)[1]) >= EPS) pts.push(p);
  while (pts.length > 3 && Math.hypot(pts[0][0] - pts.at(-1)[0], pts[0][1] - pts.at(-1)[1]) < EPS) pts.pop();
  if (pts.length < 3) return '';
  const mid = (i) => { const p = pts[i % pts.length], q = pts[(i + 1) % pts.length]; return [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2]; };
  let out = `M${fmt(mid(0)[0])} ${fmt(mid(0)[1])}`;
  for (let i = 1; i <= pts.length; i++) { const c = pts[i % pts.length], m = mid(i); out += `Q${fmt(c[0])} ${fmt(c[1])} ${fmt(m[0])} ${fmt(m[1])}`; }
  return out + 'Z';
}
function d(gs, eps = 4) {
  let out = '', ring = [];
  const ctx = {
    moveTo(x, y) { ring = [[x, y]]; },
    lineTo(x, y) { ring.push([x, y]); },
    closePath() { out += smooth(ring, eps); ring = []; },
    arc() { throw new Error('unexpected arc'); },
  };
  const p = geoPath(proj, ctx);
  for (const g of gs) p(g);
  return out;
}

// Clouds: soft blobs, each a few overlapping round puffs (same winding, one path, so they union).
// Puffs are caps on the sphere, so they foreshorten toward the limb.
const puff = ([lon, lat, r]) => geoCircle().center([lon, lat]).radius(r).precision(8)();
const CLOUDS = [
  [-150, 41, 4], [-144, 44, 5.5], [-137, 43, 4.5], [-142, 39.5, 3.5],   // North Pacific, off the coast
  [-63, 34, 3.8], [-58, 38, 5], [-52, 36.5, 3.8],                      // Atlantic
  [-125, -15, 4], [-119, -13, 3.4],                                    // South Pacific
  [-100, 55, 3.4], [-95, 57, 4.2], [-90, 55.5, 3.2],                   // over Canada
  [-62, -4, 3.2], [-57, -2, 3.8], [-53, -5, 3],                        // over the Amazon
  [-165, 16, 3.4], [-160, 18.5, 4], [-155, 16, 3],                     // central Pacific
  [-36, 52, 3.4], [-31, 55, 4], [-28, 51.5, 3],                        // North Atlantic
  [-100, -32, 3.6], [-94, -30, 4.2], [-89, -33, 3],                    // southeast Pacific
].map(puff);

const earthSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-64 -64 128 128" width="256" height="256"><title>NYKO Earth</title>
<!--
  NYKO Earth (hero sky). Origin (0,0) = centre; disc radius 60, nothing outside it. Clip to r=60 in code.
  Unlit: no terminator, night side or specular. The site shades it from the sun's direction (shadeFrom) and
  draws the atmosphere halo. Orthographic view centred ${Math.abs(CENTRE[1])}°N ${Math.abs(CENTRE[0])}°W (North America; Seattle upper-left).
  Land: Natural Earth 110m (public domain). Source: brand/round-2-iconography/gen_earth.mjs.
  Groups, back to front: ocean, land, ice (Arctic cap + Greenland), clouds. Low detail, rounded edges: it's small background art.
-->
<defs>
  <linearGradient id="earth-ocean" x1="-42" y1="-42" x2="42" y2="42" gradientUnits="userSpaceOnUse">
    <stop offset="0" stop-color="${OCEAN_HI}"/><stop offset="1" stop-color="${OCEAN_LO}"/>
  </linearGradient>
  <linearGradient id="earth-ice" x1="0" y1="-60" x2="0" y2="-30" gradientUnits="userSpaceOnUse">
    <stop offset="0" stop-color="${ICE_HI}"/><stop offset="1" stop-color="${ICE_LO}"/>
  </linearGradient>
</defs>
<g id="ocean"><circle r="${R}" fill="url(#earth-ocean)"/></g>
<g id="land"><path fill="${LAND}" d="${d(green)}"/></g>
<g id="ice"><path fill="url(#earth-ice)" d="${d([...CAP, ...greenland], 2)}"/></g>
<g id="clouds"><path fill="${CLOUD}" d="${d(CLOUDS, 1.2)}"/></g>
</svg>
`;

// ── Moon (near side, simplified maria) ───────────────────────────
// Ellipses in disc units (r = 15), x right, y down, as seen from the northern hemisphere.
const MARIA = [
  // Oceanus Procellarum + Imbrium: one large western mass
  [-8.4, 0.6, 3.2, 6.4, 8], [-5.6, -4.6, 4.4, 3.8, 0], [-6.2, 3.4, 3.0, 3.4, -10],
  // Serenitatis, Tranquillitatis
  [1.6, -4.8, 2.7, 2.5, 0], [4.0, -1.2, 3.4, 2.6, -20],
  // Crisium (the isolated oval near the eastern limb)
  [10.4, -3.4, 1.9, 1.6, 0],
  // Fecunditatis, Nubium (small round ones left out: they read as crater holes)
  [7.4, 2.0, 1.9, 2.8, 10], [-2.4, 6.2, 2.8, 1.9, 0],
];
const f = (v) => +v.toFixed(2);
const moonSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-16 -16 32 32" width="128" height="128"><title>NYKO Moon</title>
<!--
  NYKO Moon (hero sky). Origin (0,0) = centre; disc radius 15. Near side, north up, simplified maria.
  Unlit: the site shades the phase from the sun's direction. Source: brand/round-2-iconography/gen_earth.mjs.
-->
<defs>
  <linearGradient id="moon-face" x1="-11" y1="-11" x2="11" y2="11" gradientUnits="userSpaceOnUse">
    <stop offset="0" stop-color="${MOON_HI}"/><stop offset="1" stop-color="${MOON}"/>
  </linearGradient>
</defs>
<circle r="15" fill="url(#moon-face)"/>
<g id="maria" fill="${MARE}">${MARIA.map(([x, y, rx, ry, a]) => `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(rx)}" ry="${f(ry)}"${a ? ` transform="rotate(${a} ${f(x)} ${f(y)})"` : ''}/>`).join('')}</g>
</svg>
`;

put(join(HERE, 'nyko-earth.svg'), earthSvg);
put(join(HERE, 'nyko-moon.svg'), moonSvg);
put(join(ROOT, 'public/brand/nyko-earth.svg'), earthSvg);
put(join(ROOT, 'public/brand/nyko-moon.svg'), moonSvg);

// ── QA sheet: Earth 30/48/72, Moon 8/20, raw and as the site will shade them, Night and Day ──
const b64 = (s) => `data:image/svg+xml;base64,${Buffer.from(s).toString('base64')}`;
const img = (s, x, y, px) => `<image x="${x - px / 2}" y="${y - px / 2}" width="${px}" height="${px}" href="${b64(s)}"/>`;
// Approximation of the site's shadeFrom(): night side away from a sun to the upper right.
let gid = 0;
const shade = (x, y, r, strength) => {
  const id = `sh${gid++}`, dx = Math.cos(-0.6) * r, dy = Math.sin(-0.6) * r;
  return `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${x + dx * 0.4}" y1="${y + dy * 0.4}" x2="${x - dx}" y2="${y - dy}">
<stop offset="0" stop-color="#0A0D18" stop-opacity="0"/><stop offset="0.3" stop-color="#0A0D18" stop-opacity="0.15"/><stop offset="1" stop-color="#0A0D18" stop-opacity="${strength}"/></linearGradient>
<circle cx="${x}" cy="${y}" r="${r}" fill="url(#${id})"/>`;
};
const halo = (x, y, r) => `<radialGradient id="h${gid}" gradientUnits="userSpaceOnUse" cx="${x}" cy="${y}" r="${r * 1.28}">
<stop offset="${0.9 / 1.28}" stop-color="#7CC4FF" stop-opacity="0.45"/><stop offset="1" stop-color="#7CC4FF" stop-opacity="0"/></radialGradient>
<circle cx="${x}" cy="${y}" r="${r * 1.28}" fill="url(#h${gid++})"/>`;
const W = 900, rowH = 180;
let body = '';
[['#0F1220', 0.88, 0.8], ['#F2F4F8', 0.6, 0.5]].forEach(([bg, es, ms], t) => {
  const y0 = t * rowH * 2;
  body += `<rect y="${y0}" width="${W}" height="${rowH * 2}" fill="${bg}"/>`;
  [[0, false], [1, true]].forEach(([row, lit]) => {
    const y = y0 + row * rowH + rowH / 2;
    let x = 60;
    for (const px of [30, 48, 72, 160]) {
      const r = (px * 60) / 128 * (128 / 120);      // disc radius on screen (the disc is 120 of the 128 viewBox)
      if (lit) body += halo(x, y, r);
      body += img(earthSvg, x, y, (px * 128) / 120);
      if (lit) body += shade(x, y, r, es);
      x += px / 2 + 70 + (px >= 72 ? 60 : 0);
    }
    x += 40;
    for (const px of [8, 20, 60]) {
      body += img(moonSvg, x, y, (px * 32) / 30);
      if (lit) body += shade(x, y, px / 2, ms);
      x += px / 2 + 50;
    }
  });
});
mkdirSync(join(HERE, 'qa'), { recursive: true });
put(join(HERE, 'qa', 'earth-moon-qa.svg'), `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${rowH * 4}" viewBox="0 0 ${W} ${rowH * 4}"><defs/>${body}</svg>\n`);
