# Phase 58: Performance fixes - Research

**Gathered:** 2026-06-11
**Status:** Ready for planning

## Don't Hand-Roll

### Skip-capture-on-unchanged-HTML
- **Don't build a custom change-detection cache from scratch.** A simple sha1 hash of the rendered HTML string (via `node:crypto.createHash('sha1')`) is the right primitive — it ships in stdlib, runs in microseconds for typical deck HTML (< 50KB), and collision risk is irrelevant for "did this string change?" purposes.
- **Don't reach for a non-crypto hash library** (xxhash, fnv, etc.) — sha1 in stdlib is fast enough for HTML strings this size and adds zero dependencies.
- **Don't try to do diff-based capture** (only re-capture changed buttons) — the entire 5×3 / 3×5 deck is one Playwright page, so partial re-capture isn't a thing. The win is "skip the screenshot call entirely" not "skip the screenshot for some buttons."

[VERIFIED: Node `crypto.createHash` is stdlib, 0 deps. Performance: sha1 of < 50KB string is < 0.1ms in V8.]

### Per-button debounce / write coalescing
- **Don't add per-key write coalescing** — `@elgato-stream-deck/node` already dedupes per-key writes (the `keyCount` write path uses an internal buffer). Phase 35 work landed this. Verify during profile, but don't re-implement.

### Capture loop instrumentation
- **Don't add a CPU profiler** (--prof, --inspect-brk) — adds 10-100x overhead and obscures the real numbers. Use lightweight `process.hrtime.bigint()` deltas at hop boundaries like Phase 57's profile script did for the runtime side.
- **Don't use `console.time` / `console.timeEnd`** — outputs are unstructured. Use pino-style structured logs (`{ hop, ms, ... }`) so they can be parsed/aggregated.

[VERIFIED: Phase 57 used `process.hrtime.bigint()` deltas in a standalone script; approach is sound.]

## Common Pitfalls

### 1. Forgetting to preserve function signatures when adding instrumentation
- **Symptom:** Phase 57 had this exact failure — accidentally removed default params on `renderDeckSurface`, broke one test.
- **Defense:** Add `markHop()` calls inside existing function bodies; do NOT change any function signature. Use a `// INSTRUMENT: ...` comment at each call site so the change is easy to audit and revert.
- **Verify after instrumentation:** run full test suite and confirm no new failures.

### 2. Hash collisions for "unchanged" check
- **Risk:** Two visually different decks hash to the same sha1 → skip the screenshot, ship stale image.
- **Mitigation:** sha1 collision probability for 50KB inputs is effectively zero. But for defense-in-depth: also compare `latestVersion` to `renderedVersion`. If the version incremented but the hash matches, force a capture (suspicious state, log a warning).
- **No mitigation needed in practice** — just compare the hash AND the version; only skip if both unchanged.

### 3. First-capture on a new deck is slow
- **Symptom:** Profile shows first `updateDeck → screenshot` takes 500ms+ but subsequent captures take 50ms. Lazy Chromium page setup.
- **Mitigation:** Capture cycle is a single loop, so this is mostly a per-call cost. The skip-when-unchanged fix helps *if* the same deck is re-rendered with no actual change. For genuinely new decks, the warmup cost is unavoidable.
- **Future enhancement (Phase 64+ if needed):** pre-warm the Chromium page on `start()` so the first user interaction is faster. NOT in scope for Phase 58.

### 4. Per-key write latency on hardware is not measurable without a device
- **Symptom:** Profile shows screenshot takes 50ms, sharp crop takes 10ms, frameHandler takes 0.5ms in emulator. Real hardware USB write is unknown.
- **Mitigation:** Profile gives us the in-process breakdown; hardware USB write is the missing hop. Phase 58's success criteria (200ms / 300ms) are likely achievable from in-process alone IF the screenshot wait is the dominant cost (it usually is).

### 5. `frameHandler` is called once per `runCaptureLoop` tick, not per key
- **Reality check:** `await frameHandler?.({ buffers, reason, version })` is one call. The per-key write happens *inside* the frameHandler (in the device transport). So per-key write latency is hidden inside this hop.
- **Mitigation:** Don't try to instrument inside the device transport — the device library is owned by `@elgato-stream-deck/node` and we can't modify it. Measure at the frameHandler hop boundary.

## Existing Patterns in This Codebase

### Hop-boundary instrumentation (Phase 57)
- **Pattern:** module-level `SIRENO_PROFILE` env var check, `markHop(name)` reads `process.hrtime.bigint()`, computes delta, logs structured `{ hop, ms }`.
- **Reference:** `packages/cli/scripts/profile-runtime.ts` — the Phase 57 standalone script that did this for the runtime side. The browser-renderer is the next layer that needs the same treatment.
- **Adapt:** Add the same pattern to `browser-renderer.ts` itself, NOT a separate script (because `runCaptureLoop` requires an actual `BrowserRenderer` instance with a real Playwright page).

### Capture loop structure (browser-renderer.ts:297-370)
- The loop has natural hop boundaries:
  - **Loop entry** (line 297) — per-tick start
  - **`waitForNextCaptureWindow`** (line 309, 331) — interval wait
  - **`activePage = await ensurePage()`** (line 342) — page setup
  - **`renderPageHtml`** (line 344) — write HTML to page
  - **`activePage.screenshot`** (line 346) — Playwright screenshot (suspect #1)
  - **`cropDeckCaptureToKeyBuffers`** (line 352) — sharp crop
  - **`frameHandler`** (line 356) — write to device transport
- **Per-update hop:** `updateDeck(html)` (line 391) — initial entry, called on every deck surface change from the runtime. Suspect #2 for back button (deck re-render fires this).

### `setBrightnessAll` is a separate code path
- Brightness writes go through `packages/cli/src/device/registry.ts:34`, NOT the browser renderer. They share the same hardware transport but skip the screenshot/crop steps. Brightness is therefore fast regardless of capture loop. Confirmed in Phase 55/53 work.

### `liveHardwareMode` flag
- The capture loop only does steady-state captures when `liveHardwareMode = true` (set in `createBrowserRenderer` options). In emulator mode, captures happen only when an update is pending. So the profile will show different patterns depending on which mode is tested.

## Recommended Approach

### Plan 58-01: Instrument browser-renderer.ts
- Add `SIRENO_PROFILE=1` env-var-gated `markHop()` calls at the natural hop boundaries in `runCaptureLoop` and `updateDeck`.
- Use a structured pino logger output: `{ hop, ms, version? }`.
- Add 7 hops: `updateDeck.entry`, `runCaptureLoop.tick`, `waitForNextCaptureWindow`, `ensurePage`, `page.screenshot`, `cropDeckCaptureToKeyBuffers`, `frameHandler`.
- **Do NOT change any function signatures.** Add `markHop()` calls inside existing function bodies. Add `// INSTRUMENT: ...` comment at each call site.
- Verify no new test failures (run full test suite).

### Plan 58-02: Run back-button + weather page scenarios + analyze
- Extend `packages/cli/scripts/profile-runtime.ts` (or write a new `profile-browser.ts`) that drives `BrowserRenderer` in emulator mode with a mocked Playwright page or runs the real CLI in emulator mode.
- Run two scenarios: (a) back button on a real config, (b) weather page cycle.
- Save raw logs to `profile-browser-back.txt` and `profile-browser-weather.txt`.
- Write analysis section in RESEARCH.md (updated 58-RESEARCH.md or this file): identify the slowest hop per scenario, decide if shared or different root cause.

### Plan 58-03: Implement skip-when-unchanged fix
- Add `latestRenderedHtmlHash` to `BrowserRenderer` state.
- In `runCaptureLoop`, before calling `activePage.screenshot`, compute sha1 of `requestedHtml`. If it matches `latestRenderedHtmlHash` AND `renderedVersion === requestedVersion`, skip the screenshot — reuse `lastCapturedBuffers`, update `lastCaptureAt`, resolve waiters.
- Force a capture if version is 0 (first render) regardless of hash.
- Add focused unit test for the skip path: same HTML twice in a row → screenshot only fires once.

### Plan 58-04: Verify both PERF-01 and PERF-02 targets
- Re-run the profile with the fix applied.
- Confirm: in-process back button roundtrip < 200ms (target), weather page transitions < 300ms (target).
- Write VERIFICATION.md with the measurement data, hardware caveat (USB write hop not profiled), and link to updated RESEARCH.md profile data.

## Sources

- Phase 57 `57-RESEARCH.md` — prior in-process profile (avg=0.37ms).
- `packages/cli/src/render/browser-renderer.ts` — capture loop implementation.
- `packages/cli/scripts/profile-runtime.ts` — Phase 57 instrumentation pattern.
- Playwright docs (webfetch) — `page.screenshot({ fullPage: true })` is the dominant cost; no internal waitUntil option that would help.
- Phase 35 (live hardware resampling) — established 250ms cadence.
- Phase 49 (emoji-selector UX revamp) — established the `key_macro` keystroke abstraction that Phase 59 will reuse for `pasteText`.

[VERIFIED: browser-renderer.ts line numbers, Phase 57 patterns, Playwright API surface]
[ASSUMED: USB write hop is < 50ms on Linux + typical Stream Deck — needs real hardware to verify]
