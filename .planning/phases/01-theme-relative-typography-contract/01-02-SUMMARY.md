# Plan 01-02 Summary

**Completed:** 2026-05-28

## What was built
Phase 1's second slice made the raw-typography contract cut honest across shipped surfaces. Built-in buttons and support helpers that were still wrapping `Text` in raw `font-main` / `font-aux` / `font-mono` spans now express typography, tone, and size through `Text` directly, while the remaining tightly owned seams (`Chip` and the browser document root) now own their typography explicitly instead of relying on hidden raw-class sizing.

## Key files
- `packages/cli/src/builtin-addons/date-time/buttons/date-time.tsx`: removed the outer raw typography wrapper and made the digital date-time surface rely on `Text` with explicit `typography`, `tone`, and `size`.
- `packages/cli/src/builtin-addons/date-time/buttons/analog-clock.tsx`, `calendar-sheet.tsx`, `locked-time-tile.tsx`: migrated label/tile text paths off outer raw typography spans and onto direct `Text` semantics.
- `packages/cli/src/builtin-addons/core-buttons/buttons/action.tsx` and `packages/cli/src/builtin-addons/emoji-selector/support.tsx`: removed the old wrapper-based typography path so built-in/support text nodes now use `Text` as the single contract.
- `packages/cli/src/ui/Chip.tsx`: kept Chip as a tightly owned non-`Text` seam but made its aux typography explicit through style tokens instead of `font-aux` as a hidden sizing contract.
- `packages/cli/src/render/dom-host-deck-document.tsx`: stopped using `font-main` on the document body as the browser-wide implicit sizing default while preserving main-family/weight/tracking styling explicitly.
- `packages/cli/src/builtin-addons/date-time/index.test.ts`, `core-buttons/index.test.ts`, `emoji-selector/index.test.ts`, `render/dom-host.test.tsx`: rewrote focused regressions to the explicit Phase 1 contract, including the live single-`format` date-time config and the current `hour | separator | minute` locked-time tile model.

## Decisions made
- Preserved the user’s requested real sweep rather than leaving wrapper-based raw typography backdoors in built-in code paths.
- Preferred `Text` wherever a surface was actually rendering text nodes, and kept the non-`Text` exceptions narrow and explicit.
- Treated the stale date-time test contract as part of the planned regression rewrite because it was directly blocking an honest Phase 1 surface proof.

## Notes for downstream
- Raw `font-*` classes still exist as canonical typography tokens in `Text` and the utility stylesheet, but built-in callers should not use them as the implicit final sizing path anymore.
- Phase 3 rich date-time work should build on the now-truthful single `format` contract and the simplified locked-time tile slot model, not on the removed split-field test assumptions.
