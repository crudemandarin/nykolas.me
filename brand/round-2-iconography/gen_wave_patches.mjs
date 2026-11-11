// Wave patches from wave-patch.ts (this folder), the single source the game also imports at runtime.
//   node brand/round-2-iconography/gen_wave_patches.mjs     (Node >= 22.6; strips TS types natively on 23.6+)
// Writes FL-01 (the static patch the game shows today) + its 1-bit twin, the public/patches copy,
// and qa/wave-progression.svg: waves 1-25 in colour on Night, then 1-bit, so every step is visible.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { wavePatch } from './wave-patch.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const put = (p, s) => { writeFileSync(p, s); console.log('wrote', p.slice(ROOT.length + 1)); };

const one = wavePatch(1);
put(join(HERE, 'nyko-patch-fl01.svg'), one.color);
put(join(HERE, 'nyko-patch-fl01-1bit.svg'), one.onebit);
put(join(ROOT, 'public/patches/nyko-patch-fl01.svg'), one.color);

// progression sheet: 5 waves per row (one tier per row), colour rows then the 1-bit rows
const cell = 200, gap = 16, cols = 5, waves = 25, rows = waves / cols;
const W = cols * (cell + gap) + gap, H = 2 * rows * (cell + gap) + gap * 3;
const img = (svg, x, y) => `<image x="${x}" y="${y}" width="${cell}" height="${cell}" href="data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}"/>`;
let body = `<rect width="${W}" height="${H / 2 + gap}" fill="#101322"/><rect y="${H / 2 + gap}" width="${W}" height="${H / 2}" fill="#F4F5F9"/>`;
for (let w = 1; w <= waves; w++) {
  const p = wavePatch(w), i = w - 1, x = gap + (i % cols) * (cell + gap), y = gap + Math.floor(i / cols) * (cell + gap);
  body += img(p.color, x, y) + img(p.onebit, x, y + rows * (cell + gap) + gap * 2);
}
mkdirSync(join(HERE, 'qa'), { recursive: true });
put(join(HERE, 'qa', 'wave-progression.svg'), `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${body}</svg>\n`);
