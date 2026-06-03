# Plan 23-02 Summary

**Completed:** 2026-05-25

## What was built
Added a hardware-only startup placeholder path for physical Stream Deck startup that writes branded temporary buffers immediately after device connection and before the first browser-backed deck capture. The startup flow now tracks a real first-render handoff so the placeholder disappears on the first successful render, while browser-start and first-render failures clear the hardware panel instead of leaving a fake-ready screen behind.

The plan also ships focused startup-path coverage around write order, first-render handoff, and failure cleanup, plus a committed Phase 23 review note describing how to observe the placeholder on real hardware. During execution, the new tests exposed a real lifecycle bug: first-render failures were clearing the pending flag too early, which skipped panel cleanup. That bug was fixed in the runtime path rather than papered over in tests.

## Key files
- `packages/cli/src/render/startup-placeholder.ts`: generates branded raw RGB placeholder buffers sized to the Stream Deck render preset.
- `packages/cli/src/cli/commands/start.ts`: writes placeholder buffers during hardware startup, waits for the first real render handoff, and clears the panel on startup failure while preserving honest error propagation.
- `packages/cli/src/cli/commands/start.test.ts`: locks placeholder write order, first-render replacement, and failure cleanup behavior.
- `packages/cli/fixtures/phase-23/README.md`: records the manual review steps for observing the startup placeholder on hardware.

## Decisions made
- Kept the placeholder entirely outside the runtime deck contract; `startDaemon()` owns it as a temporary hardware-startup concern.
- Used one shared branded tile buffer for all keys instead of inventing per-key fake content.
- Preserved honest failure behavior by clearing the panel only while first render is still pending and rethrowing underlying startup errors.

## Notes for downstream
- Phase verification can treat placeholder behavior as fully test-backed on the startup seam; the remaining human work is only visual hardware UAT.
- The raw-source addon startup path from Plan `23-01` and the hardware placeholder path from Plan `23-02` now meet at the same normal `startDaemon()` flow.
