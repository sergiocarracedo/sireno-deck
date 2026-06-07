# Quick Task 037 Plan: emoji-selector launcher grid should overlap icons a bit on X and Y

**Task:** `I want thee grid overlaps icons on X and Y axis a bit`

The emoji-selector launcher button renders a 3×2 grid of representative
emojis. Right now the cells are separated by a `gap-0.5` (0.125rem ≈ 2px)
gap inside a `p-1` padded container, so adjacent emojis sit cleanly apart.
The user wants the grid cells to overlap a bit on both axes, so the icons
read as a tighter cluster.

## Task 1 — Overlap the launcher grid cells on X and Y

**<files>**
- `packages/cli/src/builtin-addons/emoji-selector/buttons/launcher.tsx` (modify)

**<action>**
1. On the grid container (the `<div data-sireno-launcher-grid="true">`),
   change `gap-0.5` → `gap-0` so the cells touch.
2. On each cell (`<div data-sireno-launcher-cell="true">`), add a small
   negative horizontal and vertical margin `-mx-0.5 -my-0.5` (0.125rem ≈
   2px on each side, ~4px total overlap between two adjacent cells). This
   pulls each cell past its grid track, producing a small visible overlap
   on both axes.
3. The container's existing `p-1` (0.25rem) padding is enough to absorb
   the negative margin on the outermost cells without clipping.

**<verify>**
- `cd packages/cli && pnpm exec vitest run src/builtin-addons/emoji-selector/index.test.ts`
  still passes — the launcher test (line 398) only checks the
  `data-sireno-launcher-grid="true"` attribute and that the six emojis
  render, not the layout itself.
- `cd packages/cli && pnpm exec tsc --noEmit` — no new errors.
- Visually: the six emojis in the launcher button sit on a 3×2 grid where
  adjacent cells overlap by ~2px on each side instead of being separated
  by a 2px gap.

**<done>**
- `packages/cli/src/builtin-addons/emoji-selector/buttons/launcher.tsx`:
  grid uses `gap-0` and each cell has `-mx-0.5 -my-0.5`.
- Emoji-selector tests still pass.
- No new TypeScript errors.

## Out of scope

- Tweaking the icon glyph size, font stack, or color.
- Adjusting the grid for the full emoji picker page (only the launcher
  tile is in scope; that's the only place the 3×2 grid is rendered).
- Touching the rest of the emoji-selector support module.
