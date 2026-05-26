# Plan 26-03 Summary

**Completed:** 2026-05-27

## What was built
Kept startup loading on the pre-browser placeholder seam, but replaced the repeated `SIRENO / STARTING` tile with a deck-wide `logoFull.png` treatment that is cropped back into per-key buffers. The startup placeholder now feels like one temporary branded loading card spread across the hardware deck instead of a repeated identical tile on every key.

This slice deliberately stayed off the browser/React document path. The placeholder is still generated before the browser page exists, still writes raw key buffers for hardware startup, and still hands off to the first real browser-backed render or honest failure path without masking runtime errors.

## Key files
- `packages/cli/src/render/startup-placeholder.ts`: now resolves `packages/cli/src/assets/logoFull.png`, composes a deck-wide placeholder image with shell/card overlay treatment, and crops it into per-key raw buffers.
- `packages/cli/src/render/startup-placeholder.test.ts`: added focused proof that the placeholder returns one raw buffer per key and no longer repeats the same tile across the whole deck.
- `packages/cli/src/cli/commands/start.test.ts`: existing focused startup handoff tests still prove placeholder-before-first-render and failure-path cleanup behavior on the original pre-browser seam.

## Decisions made
- Kept startup loading on the existing buffer-rendering seam instead of moving it into the new shared React deck document.
- Used `import.meta.url` plus `fileURLToPath(...)` to resolve the shipped logo asset through the same style of runtime-safe asset path the repo already uses elsewhere.
- Added a narrow visual regression test on buffer uniqueness rather than broad snapshot-style browser assertions, because this seam is intentionally pre-browser.

## Notes for downstream
- The startup placeholder now has a deck-wide composition seam that can evolve visually without changing ownership boundaries.
- Browser startup and hardware placeholder behavior remain separate by design; future work should not collapse them without a deliberate decision.
