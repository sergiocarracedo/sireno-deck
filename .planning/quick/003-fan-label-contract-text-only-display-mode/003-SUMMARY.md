# Quick Task 003 Summary

**Task:** fix fan label contract and make display_mode text truly text-only
**Completed:** 2026-05-13

## What was done
Removed the fan unavailable fallback from the shared default preview model so fan buttons now default to their configured label and only show the fallback after a real unavailable sensor read. Updated CPU and memory polling so `display_mode: text` emits only the metric text value, without progress-bar metadata or the synthetic `TEXT` badge, and pinned both behaviors with focused regression tests.

## Files changed
- `packages/cli/src/deck/runtime.ts`: stopped text-mode metric buttons from carrying progress and badge metadata.
- `packages/cli/src/deck/runtime.test.ts`: covered the text-only metric payload contract.
- `packages/cli/src/render/reconciler.ts`: removed the static fan unavailable fallback from default preview models.
- `packages/cli/src/render/reconciler.test.ts`: pinned the corrected fan preview contract.
- `packages/cli/src/render/text-image.test.ts`: covered text-only metric rendering against progress-mode rendering.
- `CHANGELOG.md`: recorded the fixes, root cause, and learning.
- `.planning/STATE.md`: tracked the quick task in project state.

## Why It Broke
Phase 4 still had duplicated display logic in two places. The preview helper had encoded the fan unavailable fallback as if it were default label content, and the runtime treated `display_mode: text` as a cosmetic badge change instead of removing progress semantics from the render payload.

## What We Learned
If a display mode or fallback is conditional at runtime, the shared preview/default model cannot hardcode it as static content. The render payload itself has to represent the mode honestly.
