# Quick Task 037 Summary

**Task:** I want thee grid overlaps icons on X and Y axis a bit
**Completed:** 2026-06-07

## What was done

- Changed the emoji-selector launcher grid from `gap-0.5` (2px gap) to
  `gap-0` and added a small `-mx-0.5 -my-0.5` negative margin to each
  cell. This pulls each cell past its grid track by ~2px on every side,
  producing a small but visible overlap on both X and Y axes between
  adjacent cells.

## Files changed

- `packages/cli/src/builtin-addons/emoji-selector/buttons/launcher.tsx`:
  `gap-0.5` → `gap-0` on the launcher grid; cells get
  `-mx-0.5 -my-0.5`.

## Commit

`feat(quick-037): overlap emoji-selector launcher grid cells on X and Y`
