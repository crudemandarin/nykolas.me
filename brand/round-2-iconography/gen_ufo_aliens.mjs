// UFO pilots: one saucer, several alien species (docs/claude/README.md, "UFO model").
//   node brand/round-2-iconography/gen_ufo_aliens.mjs
// The saucer is public/brand/nyko-ufo.svg (hand-made; its source lives outside the repo). This script only
// rewrites the pilot: the skin, the luminescent glow it casts inside the dome, and the head's line colours.
// It is idempotent: it replaces its own blocks by id, so it can run on its own output.
// Writes public/brand/nyko-ufo.svg (green), nyko-ufo-pink.svg, nyko-ufo-purple.svg and qa/ufo-aliens-qa.svg.
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const BASE = join(ROOT, 'public/brand/nyko-ufo.svg');
const put = (p, s) => { writeFileSync(p, s); console.log('wrote', p.slice(ROOT.length + 1)); };

// Each species: skin is a radial gradient lit from inside (near-white core -> body -> rim), so the head reads as
// luminescent; `glow` is the light it throws on the dark cabin; `line` replaces the dark outline (a glowing thing
// has a lit edge, not an ink one); `deep` is for the mouth and neck. Eyes stay ink: the contrast is what makes the face.
const SPECIES = {
  green:  { name: 'NYKO UFO',               core: '#E6FFF0', body: '#9BE3B4', rim: '#5FC48C', glow: '#3FD69B', line: '#2F8A5C', deep: '#2A7350' },
  pink:   { name: 'NYKO UFO (pink pilot)',   core: '#FFE8F8', body: '#FF9FE2', rim: '#F25CC8', glow: '#FF5FD2', line: '#C23A9C', deep: '#9C2A7C' },
  purple: { name: 'NYKO UFO (purple pilot)', core: '#F6F0FF', body: '#CDB5FF', rim: '#A57FFF', glow: '#B48CFF', line: '#7A50E0', deep: '#5A3BB2' },
};

const defs = (s) => `<radialGradient id="ufo-skin" cx="-3" cy="-44" r="27" gradientUnits="userSpaceOnUse">
    <stop offset="0" stop-color="${s.core}"/><stop offset="0.5" stop-color="${s.body}"/><stop offset="1" stop-color="${s.rim}"/>
  </radialGradient>
  <radialGradient id="ufo-cabin-glow" cx="0" cy="-40" r="40" gradientUnits="userSpaceOnUse">
    <stop offset="0.5" stop-color="${s.glow}" stop-opacity="0.95"/><stop offset="0.72" stop-color="${s.glow}" stop-opacity="0.45"/><stop offset="1" stop-color="${s.glow}" stop-opacity="0"/>
  </radialGradient>`;

// The pilot's light fills the cabin, so the dome glows from inside and the alien stays visible at hero size.
const cabinGlow = `<g id="cabin-glow" clip-path="url(#ufo-dome-clip)"><ellipse cx="0" cy="-38" rx="46" ry="34" fill="url(#ufo-cabin-glow)"/></g>`;

const pilot = (s) => `<g id="pilot" clip-path="url(#ufo-dome-clip)"><g transform="translate(0 -3)">
  <!-- shoulders and flight suit -->
  <path d="M -27,-12 Q -26,-21 -9,-21.5 L 9,-21.5 Q 26,-21 27,-12 Z" fill="url(#ufo-suit)" stroke="#1E2233" stroke-width="1.2" stroke-linejoin="round"/>
  <path d="M -6,-21.5 L 0,-15.5 L 6,-21.5" fill="none" stroke="#FF4A22" stroke-width="1.8" stroke-linejoin="round"/>
  <path d="M -19,-19.5 L -19,-13 M 19,-19.5 L 19,-13" stroke="#9AA4BE" stroke-width="0.8" opacity="0.7"/>
  <!-- neck -->
  <path d="M -4.5,-26 L 4.5,-26 L 5,-21 L -5,-21 Z" fill="${s.deep}"/>
  <!-- head: lit from inside -->
  <path d="M 0,-56 C 17,-56 24.5,-46 22.5,-37.5 C 20.5,-29 10.5,-23 0,-22.5 C -10.5,-23 -20.5,-29 -22.5,-37.5 C -24.5,-46 -17,-56 0,-56 Z" fill="url(#ufo-skin)" stroke="${s.line}" stroke-width="1.3" stroke-linejoin="round"/>
  <!-- eyes -->
  <path d="M -4,-37.5 C -5.5,-45 -14,-46.5 -18.5,-42.5 C -20,-37 -12.5,-32.5 -6.5,-33.5 C -4.3,-34.3 -3.6,-35.8 -4,-37.5 Z" fill="#1E2233"/>
  <path d="M 4,-37.5 C 5.5,-45 14,-46.5 18.5,-42.5 C 20,-37 12.5,-32.5 6.5,-33.5 C 4.3,-34.3 3.6,-35.8 4,-37.5 Z" fill="#1E2233"/>
  <circle cx="-14" cy="-42" r="1.7" fill="#FFFFFF"/>
  <circle cx="10" cy="-42" r="1.7" fill="#FFFFFF"/>
  <circle cx="-9" cy="-38" r="0.8" fill="#FFFFFF" opacity="0.6"/>
  <circle cx="15" cy="-38" r="0.8" fill="#FFFFFF" opacity="0.6"/>
  <!-- mouth -->
  <path d="M -3.2,-27.5 Q 0,-25.8 3.2,-27.5" fill="none" stroke="${s.deep}" stroke-width="1.1" stroke-linecap="round"/>
</g></g>`;

const base = readFileSync(BASE, 'utf8');
const swap = (src, re, to) => { if (!re.test(src)) throw new Error(`pattern not found: ${re}`); return src.replace(re, () => to); };
const header = `<!--
  NYKO UFO. Origin (0,0) = saucer centre, on the rim line. Nose of nothing: the craft is symmetric.
  Groups, back to front: underglow, dome-interior, cabin-glow, pilot, dome-glass, hull, rim-lights (light-1..7), emitter.
  Scan-beam anchor: the emitter lens at (0, 31). Palette matches the rocket in HeroSky.astro.
  Pilot species: nyko-ufo.svg (green), nyko-ufo-pink.svg, nyko-ufo-purple.svg. Same saucer; only the pilot and
  its cabin glow differ (brand/round-2-iconography/gen_ufo_aliens.mjs).
-->`;

const out = {};
for (const [key, s] of Object.entries(SPECIES)) {
  let svg = base;
  svg = swap(svg, /<title>[^<]*<\/title>/, `<title>${s.name}</title>`);
  svg = swap(svg, /<!--[\s\S]*?-->/, header);
  svg = swap(svg, /<(linear|radial)Gradient id="ufo-skin"[\s\S]*?<\/\1Gradient>(\s*<radialGradient id="ufo-cabin-glow"[\s\S]*?<\/radialGradient>)?/, defs(s));
  svg = svg.replace(/\n<g id="cabin-glow"[^\n]*<\/g>/, '');
  svg = swap(svg, /<g id="dome-interior">[\s\S]*?<\/g>/, svg.match(/<g id="dome-interior">[\s\S]*?<\/g>/)[0] + '\n' + cabinGlow);
  svg = swap(svg, /<g id="pilot"[\s\S]*?<\/g><\/g>/, pilot(s));
  out[key] = svg;
}
put(join(ROOT, 'public/brand/nyko-ufo.svg'), out.green);
put(join(ROOT, 'public/brand/nyko-ufo-pink.svg'), out.pink);
put(join(ROOT, 'public/brand/nyko-ufo-purple.svg'), out.purple);

// QA: each species at hero size (desktop 0.38, phone 0.24 of the 272-wide model) and large, on Night and Day.
const b64 = (s) => `data:image/svg+xml;base64,${Buffer.from(s).toString('base64')}`;
const img = (s, x, y, w) => `<image x="${x}" y="${y}" width="${w}" height="${(w * 128) / 272}" href="${b64(s)}"/>`;
const W = 1000, rowH = 200;
let body = '';
[['#0F1220', 0], ['#F2F4F8', 1]].forEach(([bg, t]) => {
  const y0 = t * rowH * 3;
  body += `<rect y="${y0}" width="${W}" height="${rowH * 3}" fill="${bg}"/>`;
  Object.values(out).forEach((svg, i) => {
    const y = y0 + i * rowH + 20;
    body += img(svg, 20, y + 40, 272 * 0.24) + img(svg, 120, y + 30, 272 * 0.38) + img(svg, 260, y, 340);
  });
});
mkdirSync(join(HERE, 'qa'), { recursive: true });
put(join(HERE, 'qa', 'ufo-aliens-qa.svg'), `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${rowH * 6}" viewBox="0 0 ${W} ${rowH * 6}">${body}</svg>\n`);
