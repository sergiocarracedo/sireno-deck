# Phase 35: Live hardware resampling at 250ms - Context

**Gathered:** 2026-06-03
**Mode:** standard
**Status:** Ready for planning

<domain>
## Phase Boundary

Keep browser-rendered button surfaces live on physical Stream Deck hardware by resampling the already-mounted browser page at roughly 250ms cadence without restarting the page between frames. The phase stays focused on the hardware browser-render path, preserving the existing browser/emulator render model and current per-key device transport.

</domain>

<decisions>
## Implementation Decisions

### Capture Ownership
- The live resampling loop belongs inside `packages/cli/src/render/browser-renderer.ts`.
- `start.ts` should stay a thin caller that pushes fresh HTML into the renderer and writes returned key buffers to hardware.
- Phase 35 should preserve the renderer-owned page lifetime, version tracking, screenshot orchestration, and capture timing responsibilities instead of moving them into CLI startup/runtime code.

### Hardware Live Cadence
- Browser-backed physical hardware decks should run live resampling by default in this phase.
- Phase 35 should not require `sample_interval_ms` to opt a hardware deck into live capture.
- The target steady-state cadence is roughly 250ms between captures while a browser-backed hardware deck remains active.
- The existing `sample_interval_ms` public seam remains part of the addon API, but it is not the gate for whether hardware live resampling happens in this phase.

### Update Timing Semantics
- Fresh HTML/version changes should trigger an immediate capture instead of waiting for the next 250ms tick.
- The 250ms loop is the steady-state resampling cadence between HTML changes, used to advance CSS/browser motion on hardware.
- Button presses, navigation, data refreshes, and other real content changes should therefore stay responsive rather than feeling timer-delayed.

### Hardware Write Strategy
- Keep the current per-key hardware write contract.
- Keep unchanged-buffer dedupe through `writeKeyBuffer(...)`.
- Do not add panel-level transport abstractions in this phase.
- Do not widen this phase into concurrent/parallel hardware writes unless later research proves the current device seam is the bottleneck.

### Scope Boundary
- Phase 35 applies to all browser-backed hardware decks, not only explicit media/sample surfaces.
- Shared CSS-driven text effects such as blink and marquee should start updating on hardware as a consequence of the live resampling model, not through effect-specific special cases.
- The phase remains scoped to the physical hardware browser-render path; it does not redefine emulator behavior or add new visual capabilities.

### Agent's Discretion
- Exact internal timer/state design inside `browser-renderer.ts` for mixing immediate version captures with 250ms steady-state recaptures.
- Exact mechanism for distinguishing "HTML changed" versus "steady-state recapture" without reloading the page unnecessarily.
- Exact verification strategy and fixture shape for proving live hardware capture semantics in tests.
- Exact logging wording/telemetry for live hardware browser renders, as long as the shipped behavior matches the decisions above.

</decisions>

<specifics>
## Specific Ideas

- The mounted browser page should stay alive so CSS animation timelines can continue instead of restarting from zero on every capture.
- The current `browser-renderer.ts` loop already owns `latestHtml`, `latestVersion`, `renderedVersion`, capture waiters, and screenshot/crop work, so the phase should extend that seam rather than invent a second scheduler above it.
- The current hardware path in `start.ts` does `updateDeck(...)`, `captureKeyBuffers()`, then per-key `writeKeyBuffer(...)`; the desired Phase 35 behavior is to keep that general contract while letting the renderer supply live frames from the still-mounted page.
- Per-key writes are acceptable for this phase because the heavier work is browser screenshot plus crop, not raw device bandwidth.

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

- `.planning/ROADMAP.md`
- `.planning/PROJECT.md`
- `.planning/REQUIREMENTS.md`
- `.planning/STATE.md`
- `.planning/phases/32-addon-owned-data-polling-contract/32-CONTEXT.md`
- `.planning/phases/34-button-action-command-interface/34-CONTEXT.md`
- `packages/cli/src/addon/api.ts`
- `packages/cli/src/cli/commands/start.ts`
- `packages/cli/src/device/stream-deck.ts`
- `packages/cli/src/render/browser-renderer.ts`
- `packages/cli/src/render/browser-renderer.test.ts`
- `packages/cli/src/render/dom-host.test.tsx`
- `packages/cli/src/render/render-preset.ts`
- `packages/cli/src/ui/Text.tsx`

No external specs - requirements are fully captured in decisions above.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `packages/cli/src/render/browser-renderer.ts` already owns page startup, version tracking, screenshot capture, crop-to-key-buffer conversion, and the current sample-interval wait logic.
- `packages/cli/src/device/stream-deck.ts` already provides unchanged-buffer dedupe through `writeKeyBuffer(...)`, which limits unnecessary device traffic during steady-state recaptures.
- `packages/cli/src/addon/api.ts` already exposes `sample_interval_ms` on `AddonButtonSurfaceContract`, so the repo already has a public cadence-related seam even though Phase 35 is no longer gating live hardware updates on it.

### Established Patterns
- Phase 32 locked core runtime as capability-agnostic, so Phase 35 should improve the render transport/capture seam rather than pushing effect-specific logic into built-ins or addon domains.
- The current hardware browser-render path in `packages/cli/src/cli/commands/start.ts` updates HTML once, captures once, and writes per-key buffers sequentially.
- The current browser renderer reloads page HTML before each capture request that advances `latestVersion`; that behavior is the seam that currently resets CSS timelines for blink/marquee on hardware.

### Integration Points
- Extend `packages/cli/src/render/browser-renderer.ts` so it can continue capturing from the same mounted page between content-version changes.
- Keep `packages/cli/src/cli/commands/start.ts` on the existing caller role: feed renderer HTML updates and write the returned key buffers.
- Preserve `packages/cli/src/device/stream-deck.ts` as the hardware transport seam unless planning/research finds evidence that write ordering is the real bottleneck.

</code_context>

<deferred>
## Deferred Ideas

- Adding panel-level or batched hardware transport abstractions beyond the current per-key writes.
- Making emulator/browser cadence semantics identical to hardware if that requires widening non-hardware behavior.
- Adding new user-facing configuration for live hardware cadence beyond the Phase 35 fixed roughly-250ms target.

</deferred>

---
*Phase: 35-live-hardware-resampling-at-250ms*
*Context gathered: 2026-06-03*
