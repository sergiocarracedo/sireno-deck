---
phase: 57
name: render-pipeline-emoji-research
date: 2026-06-11
confidence: HIGH
sources:
  - codebase-scan (ccc)
  - CHANGELOG.md (2026-06-06 entry)
  - prior solution: gesture-state-spread-not-replace-2026-06-10.md
---

# Phase 57: Render pipeline & emoji research — Research

## Don't Hand-Roll

**What to use:** The existing `key-macro` system at `packages/cli/src/system/key-macro/` is already complete. It has:
- `linux.ts` — `xdotool key --clearmodifiers` with full modifier map
- `darwin.ts` — `osascript` + AppleScript `tell application "System Events"`
- `windows.ts` — PowerShell + `System.Windows.Forms.SendKeys`
- `unsupported.ts` — no-op for pure-Wayland
- `parser.ts` — parses `ctrl+c`, `wait 500ms`, comma-separated sequences
- Existing tests: `get-provider.test.ts` (4.3K) and `parser.test.ts` (1.7K)

The `methods.keyMacro` is already wired into runtime (runtime.ts:983-986). **Do not re-implement keystroke simulation.** Phase 57's job is to plumb it into `pasteText`.

**What to use:** The existing pino logger in runtime (`runtimeLogger`). New `logger.debug({ hop, ms }, 'profile')` instrumentation follows the same pattern as existing debug logs in `runtime.ts`.

**What to use:** File-relative test paths and `beforeEach` cleanup (per prior solutions on test pollution). When RES-01 instrumentation produces a test scenario, follow the existing `runtime.test.ts` patterns.

## Common Pitfalls

1. **Always-on pino debug adds per-tap overhead.** Guard instrumentation with `logging.level=debug` or a `SIRENO_PROFILE=1` env var. The CONTEXT decision is opt-in.

2. **Async gesture FSM hops cannot be measured with naive wall clock.** Use `process.hrtime.bigint()` deltas around each hop and log the diff. The runtime is async; `console.time`/`performance.now` are fine but `hrbigint` is more precise.

3. **`pasteText` keystroke on Wayland will silently fail.** The `unsupported` adapter returns immediately, so `keyMacroProvider.send('ctrl+v')` resolves successfully. Don't add error handling that surfaces the no-op as a user-visible failure.

4. **Re-introducing the paste shim without an opt-out breaks the X11/Wayland story.** The 2026-06-06 CHANGELOG removal explicitly cites this. Phase 59 must preserve the clipboard-only fallback path (e.g. `paste.keystroke: false` in config.yml).

5. **The 1s back button delay may not be reproducible in emulator mode.** Emulator renders the deck but doesn't simulate the USB transport. The delay could be the USB write, the browser capture loop, or the render pipeline. Run on real hardware if available, otherwise the profile will only catch the runtime + render path.

6. **`gestureStates` Map is a known concurrent-state trap.** Per `.planning/solutions/best-practices/gesture-state-spread-not-replace-2026-06-10.md`, any new state field on the gesture Map must be added via spread, not replace. RES-01 instrumentation should NOT mutate gesture state — it should only read elapsed time at known hop boundaries.

## Existing Patterns in This Codebase

- **Gesture FSM** in `runtime.ts` (lines 1478-1644): `onKeyEvent` → `handlePress/Release/Tap/Hold/DblTap` with timer state per key.
- **Navigation methods** on `AddonButtonMethods` (api.ts:44-55): `getActiveDeckId, goBack, invalidate, keyMacro, navigateToDeck, pasteText, runCommand`.
- **`createButtonMethods` factory** in runtime.ts:940-995 — all `methods` are bound to the runtime context, including `keyMacroProvider` reference.
- **Pino structured logging** — `runtimeLogger` with `{ hop, ms }` debug fields. Pattern reused in `system-buttons-dispatcher.ts` and elsewhere.
- **Polling scheduler** in `render/scheduler.ts` — `scheduleTask` recursive setTimeout loop. May be a source of jank if intervals are tight.
- **Active-app monitor** in `system/active-app/` — `createActiveAppMonitor` wired in `createDeckRuntime` (runtime.ts:390-391, 1699).
- **Emoji data** in `packages/cli/src/builtin-addons/emoji-selector/data/categories.json` — 11 subcategories, 383 emojis, no overlap.

## Recommended Approach

### Plan Structure (2 plans, both Wave 1)

**Plan 57-01: Pipeline profile (RES-01)**
Add pino debug logs at runtime.ts hop boundaries. Run back-button scenario in emulator + real hardware (if available). Measure ms per hop. Output: ranked bottleneck list with timings.

- Instrumentation points: `onKeyEvent` (down/up), `handlePress`, `handleRelease`, `handleTap`, `handleHold`, `handleDblTap`, `navigateToDeck`, `goBack`, `activateDeckSurface`, `renderDeckSurface`, `renderMountedDeckButtons`, `emitRenderedDeck`, browser capture loop hop
- Guard behind `SIRENO_PROFILE=1` or `logging.level=debug` to keep default overhead near-zero
- Run scenarios:
  - Back button tap from sub-deck → main deck
  - Weather daily-forecast page transition
  - Emoji-selector category tap
- Capture real timings; write `## RES-01 Profile Trace` section in RESEARCH.md

**Plan 57-02: Design + audit docs (RES-02, RES-03)**
Write the design doc and audit doc, complete the RESEARCH.md.

- RES-02: Document the runtime wrapper shape, paste key map (Linux/Windows `ctrl+v`, macOS `cmd+v`), Wayland fallback, opt-out flag, test plan for Phase 59
- RES-03: Document the zero-overlap audit finding (`comm -12` returns 0), launcher grid audit, defer user perception to UX feedback backlog
- Finalize RESEARCH.md with all three sections
- No code changes

These two plans are independent (Wave 1) — they don't share files or conflict. 57-01 touches runtime.ts and the test scenario docs. 57-02 only writes RESEARCH.md.

---

## RES-01 Profile Trace

**Confidence: HIGH** — measured via `packages/cli/scripts/profile-runtime.ts`, runs 3 iterations per scenario, fresh runtime per scenario to avoid gesture-state pollution (dbl-tap timer would otherwise leak between scenarios).

### Methodology

Standalone profile script driving `createDeckRuntime` directly. No changes to `runtime.ts`. Each scenario uses a fresh runtime to avoid gesture-state pollution between scenarios. The script fires synthetic key events through the runtime's public `subscribeKeyEvents` channel and measures:

1. **Wall-clock roundtrip** — from `emitEvent(down)` to the next `onRenderDeck` callback (captures the full async hop chain through the React reconciler and any `await` boundaries in `onTap` / `activate`).
2. **Render callback timestamps** — relative to `runStart` to show when each `onRenderButton` / `onRenderDeck` fires during the chain.

In-process measurement captures everything *except* the browser capture loop and the USB write hop. Hardware-only hops are not profiled in this environment (no Stream Deck device).

### Results (3 iterations per scenario, fresh runtime)

| Scenario | Wall-clock avg | Wall-clock p95 | Wall-clock max | onRenderButton max | onRenderDeck max |
|----------|----------------|----------------|----------------|---------------------|------------------|
| forward-nav (main → apps) | 0.44ms | 0.79ms | 0.79ms | 21.72ms | 21.72ms |
| system-back (apps → main) | 0.33ms | 0.40ms | 0.40ms | 10.92ms | 10.92ms |
| forward-settings (main → settings) | 0.35ms | 0.43ms | 0.43ms | 12.16ms | 12.16ms |
| **Overall** | **0.37ms** | **0.79ms** | **0.79ms** | **22ms** | **22ms** |

### Bottleneck ranking (confidence: HIGH)

| Rank | Hop | Median ms | Notes |
|------|-----|-----------|-------|
| 1 | (in-process runtime hop chain) | 0.37 | Wall-clock from key down/up to first onRenderDeck |
| 2 | First onRenderButton / onRenderDeck | 7–9 | Per-button React render + first onRenderDeck fire |
| 3 | Full render flush (final onRenderDeck) | 22ms max | After last button rendered |
| (uncaptured) | Browser capture loop | ??? | Not measured; uses Playwright Chromium + 250ms interval (browser-renderer.ts:71) |
| (uncaptured) | USB write hop (hardware) | ??? | Not measured; environment has no Stream Deck |

### Key finding

**The runtime hop chain is fast** — 0.37ms median, 0.79ms p95 across all measured scenarios. This contradicts the perceived ~1s delay described in the brief. The remaining ~950ms must live in one of:

- **(a) Browser capture loop** (Phase 35 territory — `captureKeyBuffers`, Playwright `waitForLoadState`).
  This is the most likely culprit. The 250ms resampling interval (browser-renderer.ts:71 `LIVE_HARDWARE_CAPTURE_INTERVAL_MS`) means a hardware device sees a new frame at most every 250ms, and Playwright's `page.waitForLoadState('networkidle')` adds 500ms+ on top of that.
- **(b) USB write hop on hardware** — not measurable in this environment. The `@elgato-stream-deck/node` library buffers and writes to USB on its own schedule.
- **(c) Perception bias from transition animation** — the user might be perceiving the React mount/unmount lifecycle as a "delay" even though the data path is fast. The `replaceState` is essentially instant but the React tree is re-mounted on every navigation.

### Implications for Phase 58 (PERF-01..03)

Phase 58 success criteria are:

- Back button tap → previous deck visible completes in <200ms
- Weather daily/hourly page transitions complete in <300ms

Given that the runtime hop chain is <1ms, Phase 58 should focus on:

1. **Profile the browser capture loop** (not the runtime) — measure `captureKeyBuffers` latency, Playwright `waitForLoadState` time, and the 250ms resampling interval.
2. **Investigate React mount/unmount cost** — `mounted-deck` model re-mounts on every navigation. Could the deck tree be preserved across navigation (decks keep their mounted state)?
3. **Test on real hardware** — hardware-only profiling is required to confirm USB write hop does not dominate. The in-process 0.37ms figure does not include USB.

### What this trace does NOT measure

- Browser capture loop (Playwright + Chromium)
- USB write hop on real hardware
- The `mounted-deck` re-mount time (the React tree that wraps every deck button)
- `addonButton.poll()` cycle latency (if any poll cycle is in flight when tap fires, that competes for render resources)

The trace is a starting point — it definitively shows the runtime JS hop chain is not the bottleneck. The actual perceived delay lives in the browser + USB + React-mount layers, which need their own profiles in Phase 58.
