@AGENTS.md

## Claude-specific

- **Session notes live in `docs/claude/`.** `README.md` lists where things live and the brand decisions made so far; `handoffs/BRAND-HANDOFF.md` is the brand steward's reference. Read the README before any brand or asset work. When a decision changes, update it there (don't just keep it in memory), and remove stale entries.
- **Showing choices:** when the owner has to pick between visual versions, build a side-by-side comparison page they can mark picks on, not a description in chat.
- **Render-check visual work** before reporting it done, on both Night and Day grounds. `rsvg-convert` isn't installed. Render SVG→PNG with `sharp` from `node_modules`, e.g. `node -e "require('sharp')(buf,{density:288}).png().toFile('out.png')"`, and put outputs in the scratchpad, not the repo.
- Feedback is usually terse and directional ("tighten it", "more square"). Iterate fast. Removing things is often the right answer.
