# Plan 22-02 Summary

**Completed:** 2026-05-25

## What was built
Turned the emulator page into a real input surface. Browser `mousedown` / `mouseup` events now flow through the virtual lifecycle as real `down` / `up` runtime events, and the runtime owns pressed-state rendering so the browser deck shows visible hold feedback instead of collapsing interaction into click-only behavior.

## Key files
- `packages/cli/src/deck/runtime.ts`: added runtime-owned `frame_state` output and re-rendering on press/release.
- `packages/cli/src/render/dom-host.tsx`: propagated non-idle frame state through the existing DOM host.
- `packages/cli/src/render/button-frame.tsx`: made pressed/hold state visually distinct in the shared frame.
- `packages/cli/src/cli/commands/start.ts`: added the browser input bridge and live DOM mount updates.
- `packages/cli/src/deck/runtime.test.ts`: locked the `down` / `up` pressed-state contract at the runtime seam.

## Decisions made
- Kept pressed-state ownership in the runtime rather than faking it in page-local JS, so emulator behavior stays aligned with the real deck path.
- Updated the emulator shell to swap deck DOM in place instead of reloading an iframe on each render, which made visible press state possible.

## Deviations
- None.

## Notes for downstream
- The root-cause bug during this slice was `frame_state` getting dropped in `start.ts` while converting runtime buttons into hosted DOM buttons; any future browser bridge work should verify runtime metadata survives that boundary.
