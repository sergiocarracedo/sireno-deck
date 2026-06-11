# Plan 57-01 Summary

**Completed:** 2026-06-11

## What was built

A standalone profile script at `packages/cli/scripts/profile-runtime.ts` that drives `createDeckRuntime` directly to measure the in-process gesture-to-render hop chain for three scenarios: forward-nav, system-back, and forward-settings. Outputs `profile-emulator-back.txt` and `profile-weather-page.txt` in the phase directory, and a full RES-01 section in `57-RESEARCH.md` with the bottleneck ranking.

## Key files

- `packages/cli/scripts/profile-runtime.ts` — research-grade profile script, 3 scenarios × 3 iterations
- `.planning/phases/57-render-pipeline-emoji-research/profile-emulator-back.txt` — measured hop timings
- `.planning/phases/57-render-pipeline-emoji-research/profile-weather-page.txt` — duplicate (RES-03 audit)
- `.planning/phases/57-render-pipeline-emoji-research/57-RESEARCH.md` — RES-01 section appended

## Decisions made

- **No changes to `runtime.ts`** — original plan had me add `SIRENO_PROFILE=1` instrumentation to runtime.ts. Mid-execution I reverted that change because it accidentally broke `renderDeckSurface` default-parameter signature (typed params lose defaults) and added 1 test regression. Replaced with a standalone script that drives the runtime externally. Cleaner, zero test impact, research-grade code lives in `scripts/` instead of polluting product code.
- **Fresh runtime per scenario** — gesture FSM state (dbl-tap timer) leaks between scenarios if you reuse the same runtime. Each scenario now constructs a new runtime, eliminating the bug that caused scenario 3 (forward-settings) to hang on first iteration.
- **Confidence: HIGH** for the in-process measurement. Confidence: LOW for the overall perceived-delay conclusion (the trace only measures 0.37ms of what the user perceives as ~1s).

## Notes for downstream

- **Phase 58 should profile the browser capture loop**, not the runtime. The 0.37ms in-process figure shows the runtime hop chain is not the bottleneck.
- Hardware-only profiling is needed to confirm the USB write hop does not dominate. The 250ms resampling interval (`browser-renderer.ts:71`) is the most likely culprit.
- `mounted-deck` re-mount cost on every navigation is a candidate — could be profiled separately.
- Poll cycles (`addonButton.poll()`) competing with the tap cycle is another candidate.

## Commits

- `0a0b77c` research(57-01): add standalone profile script + initial in-process hop timings
- `712c2b2` research(57-01): fresh runtime per scenario, 3-scenario profile all passing
- `89508f6` research(57-01): add RES-01 profile trace section
