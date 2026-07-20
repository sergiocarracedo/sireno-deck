---
plan: 01
phase: 09-post-v1-polish
title: Hardware UX — splash on boot + black on shutdown + back-button onhold in split mode
wave: 1
depends_on: []
files_modified:
  - modified: packages/cli/src/outputClient/real.ts
  - modified: packages/cli/src/cli/commands/run.ts
  - modified: packages/cli/src/deck/runtime.ts
  - modified: packages/cli/frontend/src/components/Deck.tsx
objective: >
  Three small hardware-UX fixes, demoable on a real deck: (a) push logoFull.png
  to the deck BEFORE Playwright initializes so the user sees something during
  the 1-3s startup window; (b) on CLI shutdown, push a black frame so the deck
  doesn't freeze on the last Playwright-rendered image; (c) when split mode is
  active and the back button has no action, don't render it; when it has one,
  the onhold gesture navigates to the main deck's overlay layer.
autonomous: true
single_layer_justified: false
must_haves:
  - "outputClient/real.ts: new `pushRawImage(filePath: string)` method on the hardware transport that bypasses Playwright and pushes a single image to the deck."
  - "run.ts: BEFORE `outputClient.init` returns (which spawns Playwright), call `outputHandle.pushRawImage('packages/cli/src/assets/logoFull.png')`. Does NOT apply to emulator (skip when options.emulator === true)."
  - "run.ts: in the `finally` block, BEFORE `outputHandle.stop()`, call `outputHandle.pushBlackFrame()` (or equivalent solid-black helper). Does NOT apply to emulator."
  - "deck/runtime.ts: extend `handleSystemButton` for `core:back` onhold to call `setOverlay(availableOverlayDeckId)` IF an overlay deck is currently available; otherwise the gesture is a no-op."
  - "frontend/components/Deck.tsx: render back button only when its action exists in the current state (split-mode-aware). No action → no render. The onhold wiring is the runtime change above."
---

<tasks>

<task id="01.1">
  <file>packages/cli/src/outputClient/real.ts</file>
  <action>Add a `pushRawImage(filePath: string): Promise<void>` method on the `OutputHandle` returned by `realOutputClient.init(...)`. Read the file, encode to PNG/JPEG depending on device support, push to the device via the existing transport. Does NOT close the renderer — this is for splash + shutdown only. If file not found, log warn + no-op (don't crash startup).</action>
  <verify>pnpm -F @sireno-deck/cli tsc --noEmit — no new errors.</verify>
  <done>pushRawImage exists on the real OutputHandle.</done>
</task>

<task id="01.2">
  <file>packages/cli/src/outputClient/real.ts</file>
  <action>Add `pushBlackFrame(): Promise<void>` to the OutputHandle. Generate a 1x1 black pixel (or use a bundled `assets/black.png` if simpler), push via the device transport. Log warn if device rejects.</action>
  <verify>pnpm -F @sireno-deck/cli tsc --noEmit — no new errors.</verify>
  <done>pushBlackFrame exists.</done>
</task>

<task id="01.3">
  <file>packages/cli/src/cli/commands/run.ts</file>
  <action>In `runPipeline`, AFTER `outputClient.init(...)` returns and BEFORE `outputClient`'s frontend starts rendering (i.e. between `await outputClient.init({...})` and any `await renderer.start()` equivalent): when `options.emulator !== true`, call `await outputHandle.pushRawImage(resolveAssetPath('logoFull.png'))`. The `logoFull.png` lives at `packages/cli/src/assets/logoFull.png`. Resolve absolute path via `path.join(import.meta.dirname, '..', 'assets', 'logoFull.png')` (or use a small `resolveAssetPath()` helper colocated at top of run.ts).</action>
  <verify>Manual smoke: start CLI with real device, observe logo appears BEFORE the deck renders.</verify>
  <done>Splash pushed before Playwright.</done>
</task>

<task id="01.4">
  <file>packages/cli/src/cli/commands/run.ts</file>
  <action>In `runPipeline` `finally` block, BEFORE `outputHandle.stop()` runs: when `options.emulator !== true`, call `await outputHandle.pushBlackFrame()`. Wrap in try/catch — log warn + continue if it fails (shutdown should not hang on a dead hardware).</action>
  <verify>Manual smoke: kill CLI, observe black screen instead of frozen Playwright frame.</verify>
  <done>Black frame pushed on shutdown.</done>
</task>

<task id="01.5">
  <file>packages/cli/src/deck/runtime.ts</file>
  <action>In `handleSystemButton(type, gesture)` (~line 332), extend the `core:back` branch to handle `hold` gesture: call `setOverlay(availableOverlayDeckId)` IF `hasOverlayDeckAvailable()` returns true. Currently onhold is a no-op. Use the existing `setOverlay` API. No-op if no overlay available.</action>
  <verify>rtk vitest run packages/cli/src/deck/__tests__/runtime.test.ts — no regressions. Add a test case: back onhold with overlay available → setOverlay called; back onhold without overlay → no-op.</verify>
  <done>Back onhold navigates to overlay layer.</done>
</task>

<task id="01.6">
  <file>packages/cli/frontend/src/components/Deck.tsx</file>
  <action>Modify the `Deck` component rendering: when `splitAtN1` is true and position === n1Position, only render the back button if there IS a valid back action available (e.g. the runtime says `getActiveDeck()` has a back-able parent). Simplest: render only when `splitAction === true` already covers it, OR remove the back cell entirely when no overlay is available. The current `splitAction` flag is computed from button type === "core:back" || "core:settings-entry". Add a new condition: also require `hasOverlayDeckAvailable === true` for split-mode rendering.</action>
  <verify>Manual smoke: in split mode with no overlay available, the n-1 slot should be blank (or render only the overlay-toggle hint without a back cell).</verify>
  <done>Back button hidden when no action.</done>
</task>

</tasks>
