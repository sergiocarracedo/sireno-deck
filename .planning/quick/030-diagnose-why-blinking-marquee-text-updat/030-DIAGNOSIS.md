# Quick Task 030 Diagnosis

## Question

Why do buttons that use `Text` blink or marquee update in the emulator/browser but not on Stream Deck hardware?

## Root Cause

The hardware path does not display a live DOM. It only receives sampled RGB buffers.

`Text` blink and marquee are implemented as CSS animation classes in the browser-rendered DOM:

- `packages/cli/src/ui/Text.tsx`
  - `fit="marquee"` wraps content in `.sireno-marquee-track`
  - rich `<blink>` markup adds `.sireno-rich-text-blink`
- `packages/cli/src/render/theme-utilities.ts`
  - `.sireno-rich-text-blink` uses `@keyframes sireno-rich-text-blink`
  - `.sireno-marquee-track` uses `@keyframes sireno-marquee-scroll`

That works in the emulator/browser because the DOM stays mounted and the browser runs the CSS animation continuously.

The hardware path is different:

1. `packages/cli/src/deck/runtime.ts`
   - `renderDeckSurface(...)` emits `onRenderDeck(...)`
2. `packages/cli/src/cli/commands/start.ts`
   - `onRenderDeck` calls `renderRuntimeDeckSurface(...)`
3. `packages/cli/src/cli/commands/start.ts`
   - `renderRuntimeDeckSurface(...)` calls `browserRenderer.updateDeck(...)`
   - then immediately calls `browserRenderer.captureKeyBuffers()`
   - then writes the captured buffers with `writeKeyBuffer(...)`
4. `packages/cli/src/render/browser-renderer.ts`
   - `updateDeck(...)` increments `latestVersion`
   - `captureKeyBuffers()` renders a fresh HTML document and screenshots it
5. `packages/cli/src/device/stream-deck.ts`
   - `writeKeyBuffer(...)` sends the static RGB buffer to the device

So the Stream Deck never sees the browser animation itself. It only sees screenshots of it.

## Why It Fails On Hardware

There are two failure modes.

### 1. No render cadence means no new hardware frames

If a button only relies on CSS animation and does not trigger runtime invalidation or a render loop, the hardware gets one screenshot and then nothing else. The emulator keeps animating because the browser still owns the live DOM, but the hardware has no reason to capture another frame.

### 2. Runtime re-renders restart the animation instead of advancing it

Even when a button does re-render periodically, the current hardware path still does not preserve the animation timeline.

`browser-renderer.ts` reloads the HTML document for each new version through `renderPageHtml(...)`, then screenshots immediately. That restarts CSS animations at document time zero on every capture.

This is especially visible for the shipped surfaces:

- `packages/cli/src/builtin-addons/date-time/buttons/date-time.tsx`
  - uses `<blink>` and `defaultIntervalMs: DIGITAL_DATE_TIME_INTERVAL_MS`
  - the button re-renders every second, but each render reboots the DOM animation before the screenshot, so the blink can look stuck in one phase
- `packages/cli/src/builtin-addons/media-player/media-player-button.tsx`
  - uses `Text fit="marquee"`
  - it has poll/render cadence, but each capture still snapshots the marquee close to its starting position, so the text appears static or repeatedly reset on hardware

## Existing Sampling Seam

There is already one explicit contract for repeated capture of live browser motion:

- `packages/cli/src/addon/api.ts`
  - `ButtonSurface` supports `sample_interval_ms`
- `packages/cli/src/render/browser-renderer.ts`
  - `parseMediaSampleIntervalMs(...)` reads that value from the HTML
  - the capture loop waits between screenshots when `sample_interval_ms` is present

That seam is currently used for browser-backed animated media sampling, not for shared `Text` blink/marquee. So the core text animation path has browser-only motion semantics today.

## Answer

The buttons do not update on hardware because blink and marquee are CSS animations, not hardware-native frame updates. The emulator/browser shows the live DOM animation, but the Stream Deck only gets screenshots taken during runtime renders. When there is no sampling cadence, hardware never gets another frame. When there is a render cadence, the document reload resets the CSS animation before each screenshot, so hardware keeps seeing the start of the animation instead of smooth motion.
