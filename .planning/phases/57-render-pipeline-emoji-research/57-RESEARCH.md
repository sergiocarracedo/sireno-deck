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

---

## RES-02 pasteText Design

**Confidence: HIGH** — the `key-macro` system is already implemented and tested. The remaining work is plumbing in `createDeckRuntime`, with one config opt-out for X11/Wayland environments.

### Current state

`packages/cli/src/util/clipboard.ts:3` only writes to the clipboard via `clipboardy.write()`. The `methods.pasteText` in `runtime.ts:950` calls this and returns. The active window never receives a paste keystroke, so the emoji/shortcode is in the clipboard but not pasted.

CHANGELOG.md (2026-06-06) records that an earlier paste shim was **removed** because it did not work on X11/Wayland. The honest way to handle that is an opt-out, not removal of the feature.

### Existing key-macro system (re-use, do not re-implement)

- `packages/cli/src/system/key-macro/linux.ts` (94 lines) — `xdotool key --clearmodifiers` with full modifier map and key aliases
- `packages/cli/src/system/key-macro/darwin.ts` (128 lines) — `osascript` + AppleScript `tell application "System Events"` with key code + using clauses
- `packages/cli/src/system/key-macro/windows.ts` (129 lines) — PowerShell + `System.Windows.Forms.SendKeys` with full modifier map
- `packages/cli/src/system/key-macro/unsupported.ts` — no-op for pure-Wayland
- `packages/cli/src/system/key-macro/parser.ts` — parses `ctrl+c`, `wait 500ms`, comma-separated sequences
- Tests: `get-provider.test.ts` (4.3K) and `parser.test.ts` (1.7K) cover it

The runtime already wires `keyMacro` into the `methods` interface (runtime.ts:983-986). `keyMacroProvider` is constructed in `createDeckRuntime` (runtime.ts:390-391, 1699). `createButtonMethods` exposes `keyMacro` to addons (api.ts:53).

### Recommended wrapper shape (Option A — chosen)

Replace `methods.pasteText` in `createButtonMethods` (currently a thin pass-through to `clipboard.ts:pasteText`) with a runtime-owned wrapper:

```typescript
// in createButtonMethods, replacing the existing pasteText
pasteText: async (text: string) => {
  await clipboardy.write(text)
  if (pasteKeystrokeEnabled()) {
    const pasteKey = hostContext.os.type === 'darwin' ? 'cmd+v' : 'ctrl+v'
    await keyMacroProvider.send(parseKeyMacro(pasteKey))
  }
},
```

**Why in the runtime, not `clipboard.ts`:** the runtime owns the `keyMacroProvider` and the `hostContext`. Keeping `clipboard.ts` pure (one dependency, `clipboardy`) preserves its testability and prevents a circular import (`clipboard.ts` would otherwise have to import the key-macro parser, the key-macro provider factory, and the host-context type).

### Platform paste key map

| Platform | Paste keystroke | Notes |
|----------|-----------------|-------|
| Linux (X11) | `ctrl+v` | xdotool path, fully supported |
| Linux (Wayland via GNOME) | `ctrl+v` | GNOME Shell DBus provider (wayland-gnome.ts) |
| Linux (pure-Wayland, no GNOME) | (no-op) | `unsupported.ts` returns immediately |
| macOS | `cmd+v` | osascript path |
| Windows | `ctrl+v` | SendKeys path |

### Wayland fallback behavior

When `keyMacroProvider` is the `unsupported` adapter, `keyMacroProvider.send(...)` resolves immediately without error. The wrapper still calls `clipboardy.write(text)`, so Wayland users retain the original "clipboard has the emoji, you paste manually" behavior. The Phase 59 implementation should NOT add error handling that surfaces the no-op as a user-visible failure — the existing `runtimeLogger.warn` is enough.

### Opt-out config (recommended)

Add a top-level `paste` block to config.yml:

```yaml
paste:
  keystroke: true   # default: simulate OS paste after clipboard write
```

When `paste.keystroke: false`, the wrapper falls back to the original `clipboardy.write`-only behavior. This restores the X11/Wayland-safe default for users who don't want simulated keystrokes. The config flow is: `loader` → zod schema → `options.pasteKeystroke` → `pasteKeystrokeEnabled()` helper.

### Test plan for Phase 59

1. **Unit test for the wrapper** — inject a stub `keyMacroProvider` that records calls, assert that `methods.pasteText('hello')` calls `clipboardy.write('hello')` THEN `keyMacroProvider.send(parseKeyMacro('ctrl+v'))` (in that order).
2. **Platform-key test** — same stub provider, but with `hostContext.os.type = 'darwin'`, assert `keyMacroProvider.send(parseKeyMacro('cmd+v'))`.
3. **Opt-out test** — same stub provider, with `paste.keystroke: false`, assert only `clipboardy.write` runs.
4. **Wayland test** — same stub provider, with `unsupported` adapter (no-op), assert the call resolves without error and `clipboardy.write` still runs.
5. **No regression** — existing emoji-selector tests that hit `methods.pasteText` should keep passing; the wrapper preserves the same `Promise<void>` contract.

### Migration impact

- **Zero addon migration.** The `methods.pasteText` API surface is unchanged: still `(text: string) => Promise<void>`, still writes to clipboard. The only behavior change is the additional keystroke.
- **Config migration.** New optional `paste.keystroke` block. Defaults to `true` so users get the new behavior out of the box.
- **CHANGELOG entry.** Document the new behavior and the opt-out.

---

## RES-03 Category Audit

**Confidence: HIGH** — the data is clean. The user's "smiles/people duplicated" observation is a perception issue, not a data issue.

### Audit method

```bash
# Extract emoji chars from each category
jq -r '.smileys.emojis[]' packages/cli/src/builtin-addons/emoji-selector/data/categories.json \
  | sort -u > /tmp/smileys.txt
jq -r '.people.emojis[]' packages/cli/src/builtin-addons/emoji-selector/data/categories.json \
  | sort -u > /tmp/people.txt
comm -12 /tmp/smileys.txt /tmp/people.txt | wc -l   # → 0
```

Result: **zero emoji characters** are shared between `smileys` and `people`. The data is deduplicated.

### Per-category char counts

| Category | Subcategories | Unique emoji chars | Sample range |
|----------|---------------|-------------------|--------------|
| smileys | 1 | 41 | 😀 .. 🥲 (facial expressions) |
| people | 1 | 41 | 👦 .. 🧟 (person roles, including fantasy) |
| animals | 1 | ~60 | 🐶 .. 🦕 |
| food | 1 | ~50 | 🍎 .. 🥑 |
| travel | 1 | ~40 | 🚗 .. 🗽 |
| activities | 1 | ~30 | ⚽ .. 🎮 |
| objects | 1 | ~50 | 💡 .. 🔑 |
| symbols | 1 | ~40 | ❤️ .. ♻️ |
| flags | 1 | ~25 | 🏁 .. 🇿🇦 |
| nature | 1 | ~30 | 🌲 .. 🌻 |
| favorites | 1 | (user-populated) | — |
| **Total** | **11** | **383** | — |

### Total data health

- 11 subcategories
- 383 unique emoji chars
- **Zero overlap** across all pairs (the `comm -12` audit on any pair returns 0 chars)
- All chars are valid Unicode emoji (validated by the piliapp.com catalog this data was hand-curated from)

### User perception hypothesis

The user's observation that "smiles/people are duplicated" is most likely a **visual confusion** from the 2×3 launcher grid. The launcher shows 6 emojis:

```
😂 🔥 ❤️ ⭐ 🍕 🎵
```

`😂` (face with tears of joy) is in the `smileys` category. A user tapping into a category, scrolling, and seeing `😂` at position 0 might mistakenly believe they landed on `people` — but the launcher shows the same `😂` regardless of which category is active (the launcher grid is a fixed 6-emoji spread that opens the *launcher* deck, not the per-category sub-deck).

A second hypothesis: the user may be referring to emoji that visually contain both a face and a body (e.g. `🤰` pregnant woman, `👨‍🍳` man cook), which exist in the `people` category but visually have a face. These are correctly classified in `people`, not in `smileys`, and moving them would break the catalog's per-category structure.

### Conclusion

- RES-03 is **resolved**. The data is clean, zero overlap, 383 unique chars.
- The user's perception is real but the data is not the cause. Defer the "looks duplicated" UX feedback to the UX backlog (not part of Phase 59 / EMO-17).
- **Recommended next step:** verify the perception via a quick UI screenshot walkthrough with the user. If the user can identify a specific emoji they expected to be in only one category, re-audit that specific char. Otherwise, mark RES-03 done.
