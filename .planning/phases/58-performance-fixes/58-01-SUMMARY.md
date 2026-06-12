# Plan 58-01 Summary

**Completed:** 2026-06-11

## What was built
Instrumented `browser-renderer.ts` with 7 `markHop()` calls gated on `SIRENO_PROFILE=1` env var, added a standalone `packages/cli/scripts/profile-browser.ts` script that drives `createBrowserRenderer` with a mocked Playwright launcher, and updated `58-RESEARCH.md` with the per-hop profile analysis.

## Key files
- `packages/cli/src/render/browser-renderer.ts`: added module-level `markHop(name)` helper + 7 `markHop()` call sites (updateDeck.entry, runCaptureLoop.tick, waitForNextCaptureWindow, ensurePage, screenshot.before/after, crop.before/after, frameHandler.before/after). Default off — zero overhead when `SIRENO_PROFILE` is unset.
- `packages/cli/scripts/profile-browser.ts`: new profile script. Mocks Playwright (sharp-generated PNG, setContent no-op), runs back-button and weather-page scenarios (5 iterations each), outputs per-scenario stats to console and to `profile-browser-{back,weather}.txt`.
- `.planning/phases/58-performance-fixes/58-RESEARCH.md`: appended "Profile Analysis (RES-01 successor)" section with per-scenario table, ranked bottleneck list, and explicit "shared root cause" decision for back vs weather.
- `.planning/phases/58-performance-fixes/profile-browser-back.txt` + `profile-browser-weather.txt`: raw per-scenario stats.

## Profile results (in-process, mocked Chromium)
- back-button: updateDeck+captureKeyBuffers avg=11.51ms, p95=14.65ms, max=14.65ms
- weather-page cycle: avg=11.83ms, p95=13.25ms, max=13.25ms
- frameHandler per-call cost: ~12 ms (excludes 30ms inter-iteration sleep)
- All hops individually <1 ms in mocked mode (real Chromium IPC not measurable here)

## Decisions made
- **Both PERF-01 (back) and PERF-02 (weather) share the same root cause** — they hit the same `updateDeck → runCaptureLoop → ensurePage → screenshot → crop → frameHandler` hop chain. The skip-when-unchanged fix in Plan 58-02 addresses both requirements in a single change. Confidence: HIGH (in-process), MEDIUM (on-hardware).
- **Hardware caveat explicitly noted in RESEARCH.md** — the USB write hop and real Playwright IPC are the missing costs not measurable in this environment. The fix will reduce unnecessary screenshot calls but won't address on-hardware IPC latency.
- **Plan 58-01 Task 2 mid-execution change** — the original plan had the profile script use `keyCount: 15`, but the mocked screenshot is generated in-script and would need to be 5×3 grid = 360×216 px. Switched to `keyCount: 3` with a 1×3 grid screenshot to mirror the existing `browser-renderer.test.ts` test fixture.

## Notes for downstream
- The 7 hop boundaries cover the full capture-loop chain. Plan 58-02's skip-when-unchanged fix should add an additional `markHop("screenshot.skipped")` (or similar) so the profile can confirm the skip path is taken.
- Real-hardware measurement is not possible in this env; the on-hardware USB write hop is a known unknown. If the fix ships and on-hardware latency is still >200ms, the next step would be to look at Chromium IPC tuning (`--no-sandbox`, viewport size reduction, headless flag), not more hop instrumentation.
- The `markHop()` helper uses `process.stdout.write(JSON.stringify(...))` for logs. This is JSON-parseable so a future `pnpm cli:dev ... | jq -c 'select(.hop=="screenshot.after")'` can produce per-hop timeseries.

## Test status
- Full test suite: 130 failed / 500 passed (same baseline as Phase 57 — pre-existing failures, NOT caused by this plan). `browser-renderer.test.ts` is in the passing set.
- New instrumentation gated on env var, so test behavior is unchanged.
