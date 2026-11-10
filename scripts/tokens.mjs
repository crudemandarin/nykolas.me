// Compiles src/design/tokens.json (the Flight Manual design system) into src/styles/tokens.css.
import { readFileSync, writeFileSync } from 'node:fs';
const t = JSON.parse(readFileSync(new URL('../src/design/tokens.json', import.meta.url)));
const themes = t.color.themes.map((x) => x.id);
const [first] = themes;
const val = (tok, th) => (typeof tok.value === 'string' ? tok.value : tok.value[th] ?? tok.value[first]);
const out = ['/* Flight Manual — generated from src/design/tokens.json by scripts/tokens.mjs. Do not edit. */'];
out.push(`:root, [data-theme="${first}"] {\n${t.color.tokens.map((c) => `  --${c.name}: ${val(c, first)};`).join('\n')}\n  color-scheme: dark;\n}`);
for (const th of themes.slice(1)) {
  const rows = t.color.tokens.filter((c) => typeof c.value !== 'string' && th in c.value).map((c) => `  --${c.name}: ${c.value[th]};`);
  out.push(`[data-theme="${th}"] {\n${rows.join('\n')}\n  color-scheme: light;\n}`);
}
const root = [];
for (const fam of ['spacing', 'radius', 'stroke']) for (const c of t[fam].tokens) root.push(`  --${c.name}: ${c.value};`);
for (const [k, v] of Object.entries(t.type.families)) root.push(`  --font-${k}: ${v};`);
out.push(`:root {\n${root.join('\n')}\n}`);
for (const g of t.type.groups) for (const s of g.styles) {
  const p = [`font-family: var(--font-${s.family ?? g.family})`, `font-size: ${s.fontSize}`, `line-height: ${s.lineHeight}`, `font-weight: ${s.fontWeight}`];
  if (s.letterSpacing) p.push(`letter-spacing: ${s.letterSpacing}`);
  out.push(`.${s.name} { ${p.join('; ')}; }`);
}
writeFileSync(new URL('../src/styles/tokens.css', import.meta.url), out.join('\n') + '\n');
console.log('tokens.css written');
