// Measures the built home page and writes src/data/budget.json (shown on /flight-manual).
import { readFileSync, statSync, writeFileSync } from 'node:fs';
const dist = new URL('../dist/', import.meta.url);
const html = readFileSync(new URL('index.html', dist), 'utf8');
const kb = (n) => Math.round((n / 1024) * 10) / 10;
const js = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)].reduce((a, m) => a + Buffer.byteLength(m[1]), 0);
const css = [...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/g)].reduce((a, m) => a + Buffer.byteLength(m[1]), 0);
const fonts = [...new Set([...html.matchAll(/url\((\/_astro\/[^)]+\.woff2)\)/g)].map((m) => m[1]))];
const imgs = [...new Set([...html.matchAll(/<img[^>]+src="(\/[^"]+)"/g)].map((m) => m[1]))];
const size = (p) => statSync(new URL('.' + p, dist)).size;
const modules = [...new Set([...html.matchAll(/<script[^>]+src="(\/_astro\/[^"]+\.js)"/g)].map((m) => m[1]))];
const model = modules.reduce((a, p) => a + size(p), 0) + size('/terrain/fo01.bin');
const f = fonts.reduce((a, p) => a + size(p), 0), i = imgs.reduce((a, p) => a + size(p), 0), h = Buffer.byteLength(html);
const out = { html_kb: kb(h), js_kb: kb(js), css_kb: kb(css), fonts_kb: kb(f), img_kb: kb(i), total_kb: kb(h + f + i), requests: 1 + fonts.length + imgs.length, model_kb: kb(model) };
writeFileSync(new URL('../src/data/budget.json', import.meta.url), JSON.stringify(out));
console.log(out, fonts.length, 'fonts', imgs);
