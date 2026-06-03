# Plan 29-03 Summary

**Completed:** 2026-05-28

## What was built
The remaining shipped built-ins now match the Phase 29 story: simple built-in layout/text styling moved onto the curated Sireno utility layer, `emoji-selector` was split into one button-definition file per built-in button with a local shared support module, and the remaining core button renderers moved from `.ts` plus `createElement(...)` to truthful `.tsx` modules. Focused emoji-selector and core-buttons tests were also rewritten onto the mounted contract so the built-in proof surface no longer preserves stale `createInstance(...)` assumptions.

## Key files
- `packages/cli/src/render/theme-utilities.ts`: added the narrow missing utility classes needed by the remaining simple built-in layout/text debt.
- `packages/cli/src/builtin-addons/emoji-selector/index.ts`: reduced to registry/deck generation only.
- `packages/cli/src/builtin-addons/emoji-selector/support.tsx`: owns shared category metadata, asset wiring, fallback-label helpers, and shared TSX render helpers.
- `packages/cli/src/builtin-addons/emoji-selector/buttons/category.tsx`: owns the category button definition.
- `packages/cli/src/builtin-addons/emoji-selector/buttons/entry.tsx`: owns the entry button definition.
- `packages/cli/src/builtin-addons/emoji-selector/buttons/back.tsx`: owns the back button definition.
- `packages/cli/src/builtin-addons/emoji-selector/index.test.ts`: proves emoji-selector through the mounted contract and stable addon index.
- `packages/cli/src/builtin-addons/core-buttons/buttons/change-deck.tsx`: truthful TSX renderer for change-deck.
- `packages/cli/src/builtin-addons/core-buttons/buttons/toggle.tsx`: truthful TSX renderer for toggle.
- `packages/cli/src/builtin-addons/core-buttons/buttons/media-sample.tsx`: truthful TSX renderer for media-sample while preserving richer inline visual styles where warranted.
- `packages/cli/src/builtin-addons/core-buttons/index.test.ts`: proves the core button family through the mounted contract.

## Decisions made
- Extended the curated utility surface narrowly with `.gap-1.5`, `.rounded-xl`, `.p-2`, and `.text-balance` instead of introducing broader Tailwind tooling or a second styling mechanism.
- Kept richer media/overlay/background styles inline in `media-sample.tsx` because they are beyond the narrow simple-style debt this phase was meant to absorb.
- Used the same mounted-harness pattern from the date-time tests so built-in addon proof seams stay consistent with the real runtime/store contract.

## Deviations
- `emoji-selector/support.tsx` was first created as `support.ts` even though it contained JSX. The first verify run caught the esbuild parse failure immediately, and the file was renamed to `.tsx` before the final task commit.
- The first mounted emoji-selector harness call accidentally wrapped the config under `config: {...}`. Verification exposed the `replaceAll` failure on `select_command`, and the harness call was corrected before commit.

## Notes for downstream
- `theme-utilities.ts` already had unrelated user changes in the worktree, so only the four task-owned utility additions were staged for `29-03-01`. Future theme work should keep that concurrent-dirty-file pattern in mind.
- The built-in addon tests now use mounted harnesses and no longer model `createInstance(...)` as a supported seam. New built-in tests should follow that pattern.
