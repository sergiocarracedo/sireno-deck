# Plan 24-03 Summary

**Completed:** 2026-05-26

## What was built
Delivered the mounted active-deck behavior promised by Phase 24 without turning the browser into a second addon runtime. `packages/cli/src/render/dom-host.tsx` now provides a small in-memory mounted React host in Node, and runtime reuses one mounted host per active deck to preserve component-local state while that deck stays active. On navigation away, runtime explicitly unmounts the previous deck host, so local React state resets on re-entry while durable addon-store state still survives through the separate store seam.

The committed Phase 24 fixture was extended to prove both sides of that split: one button uses component-local `useState` to emit a mount identity that persists while active but resets after deck exit, while durable button/addon counters keep their runtime-owned values. Runtime tests and host-only tests now prove mounted local state, unmount resets, and transient runtime props through the real HTML snapshot path rather than through synthetic direct renders.

## Key files
- `packages/cli/src/render/dom-host.tsx`: added `createMountedDomHost()` and `renderMountedHostedButtons(...)` for the Node-side mounted host seam.
- `packages/cli/src/deck/runtime.ts`: reworked deck rendering to snapshot the mounted active deck, cache snapshot-backed HTML, and unmount inactive deck hosts on navigation.
- `packages/cli/src/render/dom-host.test.tsx`: proves repeated mounted-host updates preserve local state and unmount resets it.
- `packages/cli/src/deck/runtime.test.ts`: proves active-deck local state persistence, deck-exit unmount reset, and fixture-backed transient prop behavior.
- `packages/cli/fixtures/phase-24/local-mounted-addon/src/index.tsx`: added local-state and transient-prop proof buttons to the committed fixture addon.

## Decisions made
- Rejected a browser-side addon runtime because the browser only sees serialized HTML today; preserving local React state there would have required a much larger contract/runtime shift.
- Kept the browser renderer as HTML-in screenshot/crop transport and mounted React in Node instead.
- Wrote mounted-host HTML snapshots back into runtime cache so runtime inspection/tests see the authoritative mounted-host output rather than accidentally reserializing raw content.

## Notes for downstream
- Mounted deck state is now real on the active-deck path, but browser transport remains unchanged; later work should preserve that boundary unless there is an explicit renderer-architecture phase.
- The committed Phase 24 fixture now covers durable store state, mounted local state, and transient runtime props together on one file-backed review path.
