# NYKO brand kit

Source art for the marks used on this site. The site serves copies from `public/`; this folder is the archive.

- `round-1-launch/`: upright wordmark, horizontal lockups, compact mark, favicon/app-icon tier, share card, UI glyphs. Regenerate with `gen.py`.
- `round-2-iconography/`: mission patches (FO-01…04, CR-01), section marks, map symbol kit, the 404 "loss of signal" illustration, stencil wordmark (merch) and T–3/T–2/T–1 countdown numerals. Regenerate with the `gen_*.py` scripts, then `assemble.py`.

The original hi-fi mark (Soyuz on a tilted orbit) lives in `public/brand/` (`nyko-animated.svg`, `nyko.png`, 1-bit variants). Its design notes are in the design system, *Flight Manual*.
- `favicon-light/`: the favicon set actually in use: the Day compact mark on a transparent ground (tab icons), and on the Day ground `#F4F5F9` for home-screen icons. Built from `round-1-launch/nyko-mark-compact-day.svg` with `rsvg-convert`.
