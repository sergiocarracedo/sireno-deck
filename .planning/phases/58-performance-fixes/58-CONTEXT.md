# Phase 58: Performance fixes - Context

**Gathered:** 2026-06-11
**Mode:** standard
**Status:** Ready for planning

<domain>
## Phase Boundary

Implement the fixes identified in Phase 57 to bring back button transitions under 200ms and weather page changes under 300ms. Profile the browser capture loop (the dominant cost) and apply targeted fixes. In-process runtime hop chain is already fast (avg=0.37ms, p95=0.79ms per Phase 57 profile) — the remaining delay lives in Playwright Chromium screenshot, the `runCaptureLoop` cadence, and the hardware USB write hop.

**Out of scope (per Phase 57):** emoji injection (Phase 59), overlay auto-show (Phase 62), pagination button redesign (Phase 60), icon updates (Phase 61), settings deck revamp (Phase 63), chrome overlay extension (Phase 64).

</domain>

<decisions>
## Implementation Decisions

### Profiling approach
- **Extend `browser-renderer.ts` with `SIRENO_PROFILE=1` debug logs** at the capture loop boundaries (`updateDeck`, `captureKeyBuffers`, Playwright `screenshot` call, `writeKey` to device).
- **Guard with env var** — `SIRENO_PROFILE=1` only; default behavior unchanged, zero overhead in normal use.
- **Carefully preserve signatures** — lessons learned from Phase 57's `renderDeckSurface` default-param breakage. Do not change function signatures; only add `markHop()` calls inside the existing bodies.
- **Real hardware not available in this env** — instrumentation still useful in emulator mode to reveal relative hop costs.

### Fix strategy (decided in advance, validated by profile)
- **Primary fix: skip capture when HTML unchanged.** Cache last-rendered HTML hash in `BrowserRenderer`; if `updateDeck` sees the same hash, return cached key buffers without invoking Playwright. This benefits:
  - Back button when the new deck's HTML is the same as the previous render (e.g. the back stack contains an unchanged snapshot).
  - Weather page transitions where visual diff is small.
  - Any redundant render caused by React reconciliation that doesn't change output.
- Secondary fixes TBD based on profile results — do not decide in advance.

### Back vs weather — profile first
- **Do not assume shared root cause.** Run the profile on both scenarios:
  - Back button: deck change, new React tree mount, full capture cycle
  - Weather page: same component, different data, smaller diff
- **If shared cause:** single skip-when-unchanged fix addresses both PERF-01 and PERF-02.
- **If different causes:** split into two fixes (e.g. add back-button-specific React mount optimization AND the capture-skip fix for weather).

### Measurement & verification
- **In-process measurement via `SIRENO_PROFILE=1` is the verification path.** Real-hardware USB write hop cannot be measured in this environment.
- **Success criteria from ROADMAP:** Back button <200ms, weather <300ms. Re-measure with the new instrumentation to confirm.

### Out-of-scope perf concerns
- The v1.5 overlay lifecycle work (Phase 55) is shipped and stable — do not touch unless profiling reveals a regression.
- Phase 35's 250ms resample interval is the current floor; reduce only if profile proves the bottleneck is the interval itself, not the screenshot wait.

### Agent's Discretion
- Exact placement of `markHop()` calls inside `browser-renderer.ts` — the user trusts the executor to pick the most informative hop boundaries based on code reading.
- Whether to add a Playwright `--no-sandbox` or similar startup arg optimization if profile reveals Chromium launch as a hotspot.
- Whether to add a "warmup" capture on `start()` if profile shows first capture is slow.

</decisions>

<specifics>
## Specific Ideas

- The Phase 57 standalone script pattern (`packages/cli/scripts/profile-runtime.ts`) is the precedent. For browser capture loop, a similar script could drive `BrowserRenderer` directly, OR we instrument in-place — Phase 58 chose in-place with env-var guard.
- The captured-layers HTML hash should use a fast non-cryptographic hash (e.g. `xxhash` is overkill; use Node's `crypto.createHash('sha1')` since it's already in stdlib) — actual hash function is implementation detail.
- Per-key dedup is already done on the hardware write side (Phase 35) — verify during fix that we're not double-deduping at the wrong layer.

[If user adds specifics during planning, they go here.]

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

- `.planning/phases/57-render-pipeline-emoji-research/57-RESEARCH.md` — RES-01 profile trace, methodology, prior findings (avg=0.37ms runtime hop chain).
- `.planning/phases/57-render-pipeline-emoji-research/profile-emulator-back.txt` — Raw timing data from Phase 57's profile script.
- `packages/cli/scripts/profile-runtime.ts` — Phase 57's standalone profile script. Reference for instrumentation style.
- `packages/cli/src/render/browser-renderer.ts` — The capture loop to be instrumented and patched. Key functions: `runCaptureLoop`, `updateDeck`, `captureKeyBuffers`, `setBrightnessAll` transport.
- `packages/cli/src/device/registry.ts` — `setBrightnessAll` / `registerDeviceHandle` — the write hop boundary.
- `.planning/solutions/best-practices/gesture-state-spread-not-replace-2026-06-10.md` — Lessons from prior instrumentation: do not mutate runtime state, only read.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `BrowserRenderer` interface (`packages/cli/src/render/browser-renderer.ts:196`): has `createBrowserRenderer({...})` factory exposing `updateDeck`, `captureKeyBuffers`, etc. The `createBrowserRenderer` options is the natural place to thread a `markHop` callback or env-var guard.
- `pino` logger — `runtimeLogger.debug?.()` pattern is established. The browser-renderer doesn't have a logger today, so instrumentation either needs to log via console or take a logger option.

### Established Patterns
- Phase 57's markHop pattern (now removed from runtime.ts): env-var-gated, returns early when disabled, captures hrtime bigint deltas, no mutation. Apply the same pattern to browser-renderer.
- Phase 35 (live hardware resampling) sets the precedent: hardware-backed browser decks resample at 250ms; the capture loop is already the responsive path.

### Integration Points
- `updateDeck(deckId, html, version)` is the entry point — every deck surface change goes through here. Good first hop boundary.
- `captureKeyBuffers(deckId)` returns cached or waits for next capture — good second hop.
- Playwright `page.screenshot()` inside the capture loop — third hop (Chromium IPC wait).
- `handle.setBrightness(...)` and the per-key write path in `@elgato-stream-deck/node` — fourth hop (USB write, can only measure on hardware).

</code_context>

<deferred>
## Deferred Ideas

- **Pre-warm Chromium on daemon startup** — if profile reveals first-capture is slow. Defer until profile results are in.
- **Reduce 250ms resample interval** — only if profile shows the interval itself is the bottleneck (vs the screenshot wait inside each tick).
- **Per-button rendering pipeline** (PERF-03 "consistent fast paths") — only address if profile reveals specific button types are stickier. Phase 57 data showed all 3 button types measured were uniform (within 0.3ms of each other in roundtrip avg).
- **React mount optimization for back button** — only if profile isolates it as the dominant cost vs the capture loop.

</deferred>

---
*Phase: 58-performance-fixes*
*Context gathered: 2026-06-11*
