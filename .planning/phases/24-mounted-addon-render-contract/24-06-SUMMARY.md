# Plan 24-06 Summary

**Completed:** 2026-05-26

## What was built
Closed the second Phase 24 UAT gap without lying about ownership of the one-second clock cadence. The `date-time` button still drives its updates through the runtime-owned polling seam, but the emulator shell in `packages/cli/src/cli/commands/start.ts` no longer republishes each render-version bump as `mount.innerHTML = deckHtml` on the whole `#deck-mount` container. Instead it applies a narrower keyed patch to the existing `#deck-root` subtree and only replaces key nodes whose rendered HTML actually changed.

This keeps the mounted active-deck contract truthful: button-level polling still happens in runtime, transient press/release feedback still reaches the browser page, and the emulator transport now limits DOM churn to the changed keys and root attributes the user can actually observe.

## Key files
- `packages/cli/src/cli/commands/start.ts`: replaces whole-mount HTML replacement with keyed `patchDeckRoot(deckHtml)` updates and rebinding of deck interactions.
- `packages/cli/src/cli/commands/start.test.ts`: pins the exact closure seam so the emulator shell cannot silently regress back to `mount.innerHTML = deckHtml`.
- `packages/cli/src/deck/runtime.ts`: remained the polling/press-state owner; no ownership shift was introduced.

## Decisions made
- Fixed the browser transport instead of moving clock cadence out of the button/runtime seam.
- Chose a narrow keyed patcher over a broader client-side runtime or hydration architecture.
- Pinned the closure by asserting both the positive patching markers and the absence of `mount.innerHTML = deckHtml` in the shipped emulator shell source.

## Notes for downstream
- The UAT churn gap is fixed at the transport seam, but it still needs a rerun through `verify-work 24` so the original user report can be explicitly closed.
- Future emulator work should preserve the current ownership split: runtime owns polling and render-version changes; the browser page only applies the transported deck snapshot efficiently.
