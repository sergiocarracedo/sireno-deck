# Plan 02-01 Summary

**Completed:** 2026-05-28

## What was built
Phase 2's first slice replaced the fake CSS shrink clamp with one browser-only measurement seam. Shared `Text fit="shrink"` surfaces now stay honest: browser-rendered decks inject a shrink-fit helper that measures real DOM boxes, seeks the largest non-wrapping size down to a readable floor, and writes explicit shrink-state metadata, while mounted/static output degrades to plain ellipsis instead of pretending it measured layout.

## Key files
- `packages/cli/src/render/shrink-fit-browser-script.ts`: added the shared browser-only shrink-fit helper, fixed readable minimum floor at `11px`, used binary search over real DOM font size, and guarded reruns through a `requestAnimationFrame` + `ResizeObserver` scheduling path.
- `packages/cli/src/render/dom-host-deck-document.tsx`: injects the shrink-fit helper into browser deck HTML so the real screenshot/emulator browser path owns live measurement.
- `packages/cli/src/cli/commands/start.ts`: reuses the same browser helper in the emulator shell and reapplies shrink-fit after deck-root patch updates.
- `packages/cli/src/render/theme-utilities.ts`: removed the fake clamp as the primary implementation and left honest static ellipsis fallback for non-browser paths.
- `packages/cli/src/ui/Text.tsx`: now exposes `data-sireno-text-shrink-state="pending"` so the public `Text` contract stays explicit while browser code updates the measured state later.
- `packages/cli/src/render/dom-host.test.tsx`: added browser-vs-static seam proof around helper injection and honest mounted/static degradation.

## Decisions made
- Kept `Text` as the public shrink-fit contract owner, but activated real measurement only on the browser DOM seam.
- Chose one fixed readable floor of `11px` for this phase instead of adding a new public configurability surface.
- Removed `MutationObserver` from the helper after identifying that it would reschedule on its own writes and increase loop risk.

## Notes for downstream
- Phase 2 browser measurement now depends on the injected helper being present in both screenshot HTML and emulator-shell DOM patch flows; later changes to either seam must keep `window.__sirenoApplyShrinkFit(...)` wired.
- Mounted/static output is intentionally not parity-tested for live layout; downstream work should keep that honesty line intact.
