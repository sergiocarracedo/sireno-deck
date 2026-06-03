# Phase 35 Research — Live hardware resampling at 250ms

## Don't Hand-Roll

- Reuse the existing persistent browser page seam in `packages/cli/src/render/browser-renderer.ts` instead of creating a second screenshot pipeline for hardware live frames. The module already owns page startup, HTML versioning, screenshot capture, and crop-to-key-buffer conversion. [VERIFIED: packages/cli/src/render/browser-renderer.ts] [VERIFIED: packages/cli/src/render/browser-renderer.test.ts]
- Reuse the current per-key hardware transport with unchanged-buffer dedupe through `writeKeyBuffer(...)` instead of widening Phase 35 into a new panel transport abstraction. [VERIFIED: packages/cli/src/device/stream-deck.ts] [VERIFIED: .planning/phases/35-live-hardware-resampling-at-250ms/35-CONTEXT.md]
- Reuse one Playwright page instance for repeated screenshots rather than recreating browser/page state between captures; that matches both the repo's current renderer design and Playwright's standard reuse pattern. [VERIFIED: packages/cli/src/render/browser-renderer.test.ts] [CITED: https://github.com/microsoft/playwright.dev/blob/main/playwright.dev/nodejs/versioned_docs/version-stable/test-retries.mdx]
- Keep the existing Sharp `extract(...).removeAlpha().raw().toBuffer()` crop seam for key RGB buffers instead of inventing a custom image slicing path. [VERIFIED: packages/cli/src/render/browser-renderer.ts] [CITED: https://github.com/lovell/sharp/blob/main/docs/src/content/docs/api-resize.md] [CITED: https://github.com/lovell/sharp/blob/main/docs/src/content/docs/api-output.md]

## Common Pitfalls

- Do not keep calling `renderPageHtml(...)` on every steady-state recapture tick.
  - What goes wrong: CSS-only blink and marquee timelines restart from zero every frame, so hardware still looks static or repeatedly reset.
  - Why: the current renderer routes every requested version through `setContent(...)` or `goto(file://... ?v=...)` before screenshotting.
  - How to avoid: only re-render page HTML when `latestVersion` changes; steady-state recaptures must screenshot the already-mounted page. [VERIFIED: packages/cli/src/render/browser-renderer.ts] [VERIFIED: .planning/phases/35-live-hardware-resampling-at-250ms/35-CONTEXT.md]

- Do not stop at a renderer-only steady-state loop if the hardware path still awaits exactly one `captureKeyBuffers()` call per HTML update.
  - What goes wrong: the renderer may capture later frames internally, but hardware never receives them because `packages/cli/src/cli/commands/start.ts` only writes the buffers returned by the current one-shot call.
  - Why: `renderDomDeckSurface(...)` pushes HTML once, awaits one `captureKeyBuffers()`, writes once, then returns.
  - How to avoid: add one renderer-owned frame-delivery seam that can keep feeding later captures into the existing per-key hardware writer without moving the steady-state timer into `start.ts`. [VERIFIED: packages/cli/src/cli/commands/start.ts] [VERIFIED: packages/cli/src/render/browser-renderer.ts] [VERIFIED: .planning/phases/35-live-hardware-resampling-at-250ms/35-CONTEXT.md]

- Do not widen live resampling behavior onto emulator/browser mode in this phase.
  - What goes wrong: the phase silently changes non-hardware behavior that the user did not ask for, making regressions harder to isolate.
  - Why: emulator already shows live CSS motion through the mounted browser DOM and does not need the hardware recapture contract.
  - How to avoid: keep hardware live cadence opt-in at renderer construction or runtime wiring, with emulator continuing to use the existing HTML-push-only path. [VERIFIED: packages/cli/src/cli/commands/start.ts] [VERIFIED: .planning/phases/35-live-hardware-resampling-at-250ms/35-CONTEXT.md]

- Do not bind the live hardware sink to one stale connection reference across reconnects.
  - What goes wrong: later live frames attempt to write to a disconnected device while the active lifecycle has already swapped in a replacement connection.
  - Why: `startDaemon()` explicitly supports reconnect via `createStreamDeckLifecycle({ onReconnect })`, and the active connection can change after startup.
  - How to avoid: resolve the current connection at frame-delivery time or rebind the sink when the lifecycle reconnects, while preserving `replayLastRenderedBuffers(...)` for the pre-runtime reconnect path. [VERIFIED: packages/cli/src/cli/commands/start.ts] [VERIFIED: packages/cli/src/device/stream-deck.ts]

## Existing Patterns in This Codebase

- `packages/cli/src/render/browser-renderer.test.ts` already proves the persistent-page lifecycle, stale-intermediate-state dropping, bounded sampling intervals, local file-backed `goto(file://...)` capture, and emulator-sized deck capture on the same browser page. [VERIFIED: packages/cli/src/render/browser-renderer.test.ts]
- `packages/cli/src/cli/commands/start.test.ts` already proves the browser-backed runtime render path, startup placeholder handoff, and placeholder clearing on capture failure; these are the right seams to extend for Phase 35 regressions. [VERIFIED: packages/cli/src/cli/commands/start.test.ts]
- `packages/cli/src/device/stream-deck.ts` already centralizes write dedupe in `writeKeyBuffer(...)` and reconnect replay in `replayLastRenderedBuffers(...)`; Phase 35 should preserve those transport truths. [VERIFIED: packages/cli/src/device/stream-deck.ts]
- `packages/cli/src/render/dom-host.test.tsx` already proves the DOM output can emit `data-sireno-media-sample-interval-ms`, but Phase 35 decisions explicitly stop using that metadata as the gate for whether browser-backed hardware stays live. [VERIFIED: packages/cli/src/render/dom-host.test.tsx] [VERIFIED: .planning/phases/35-live-hardware-resampling-at-250ms/35-CONTEXT.md]

## Recommended Approach

1. Extend `packages/cli/src/render/browser-renderer.ts` with a renderer-owned hardware-live mode that captures immediately on HTML/version change and keeps a steady-state recapture loop near `250ms` between changes, while reusing the same mounted page for unchanged HTML. [VERIFIED: packages/cli/src/render/browser-renderer.ts] [VERIFIED: .planning/phases/35-live-hardware-resampling-at-250ms/35-CONTEXT.md]
2. Add one renderer-owned frame-delivery seam for live key buffers so `start.ts` can stay a thin caller: it should push HTML updates and let the renderer drive later steady-state captures back through the existing per-key write path. [VERIFIED: packages/cli/src/cli/commands/start.ts] [VERIFIED: packages/cli/src/render/browser-renderer.ts]
3. Keep hardware transport on `writeKeyBuffer(...)` with the existing dedupe semantics, and do not add parallel/panel writes in this phase unless profiling later proves transport is the bottleneck. [VERIFIED: packages/cli/src/device/stream-deck.ts] [VERIFIED: .planning/phases/35-live-hardware-resampling-at-250ms/35-CONTEXT.md]
4. Lock the change with focused regressions on the current live seams: browser-renderer tests for no-reload steady-state capture plus immediate-on-change behavior, and start-daemon tests for live frame delivery, startup placeholder truth, reconnect continuity, and capture failure cleanup. [VERIFIED: packages/cli/src/render/browser-renderer.test.ts] [VERIFIED: packages/cli/src/cli/commands/start.test.ts]

## Research Summary

- The real Phase 35 gap is not screenshotting itself; it is that the renderer stops once `renderedVersion` catches `latestVersion`, and the hardware path only consumes one capture per HTML update. [VERIFIED: packages/cli/src/render/browser-renderer.ts] [VERIFIED: packages/cli/src/cli/commands/start.ts]
- The safest implementation keeps ownership where the repo already drew it: browser renderer owns page lifetime and capture timing, while `start.ts` owns wiring the renderer into the active Stream Deck connection. [VERIFIED: .planning/phases/35-live-hardware-resampling-at-250ms/35-CONTEXT.md] [VERIFIED: packages/cli/src/render/browser-renderer.ts] [VERIFIED: packages/cli/src/cli/commands/start.ts]
- The highest-value proof is not a new fixture DSL or effect-specific special case; it is regression coverage showing that a browser-backed hardware deck keeps receiving later frames from the same mounted page, and that startup/reconnect/failure edges still behave honestly. [VERIFIED: packages/cli/src/render/browser-renderer.test.ts] [VERIFIED: packages/cli/src/cli/commands/start.test.ts]
