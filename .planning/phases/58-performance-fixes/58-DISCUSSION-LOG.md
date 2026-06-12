# Phase 58: Performance fixes - Discussion Log

**Gathered:** 2026-06-11
**Mode:** standard

## Areas discussed

### 1. Browser capture loop profiling approach
**Options considered:**
- **A) Extend browser-renderer.ts with `SIRENO_PROFILE=1` debug logs** (chosen)
- B) Standalone profile script with mocked Playwright
- C) Static code-path analysis only

**User rationale for A:** Real measurements on real hardware/emulator. Phase 57 established the precedent of "real measurements over static analysis." The signature-change risk from Phase 57 will be mitigated by env-var guards and NOT changing function signatures (only adding `markHop()` inside existing function bodies).

### 2. Fix strategy
**Options considered:**
- **A) Skip capture when HTML unchanged** (chosen)
- B) Reduce capture interval below 250ms
- C) Pre-warm Chromium on startup
- D) Wait for profile results

**User rationale for A:** Most likely to address both back button and weather page transition delays at the same layer. Caching the last-rendered HTML hash and returning cached key buffers when unchanged is a clean change that benefits small-diff cases (weather) and unchanged-but-re-rendered cases (back stack snapshots).

### 3. Back vs weather — same or different causes?
**Options considered:**
- **A) Profile first, decide after measurement** (chosen)
- B) Same root cause hypothesis, fix both uniformly
- C) Treat as separate problems

**User rationale for A:** The two scenarios likely have different dominant costs (React mount for back, small-diff capture for weather). Profile first; let measurement decide whether to ship one fix or two.

## Areas delegated to agent's discretion

- Exact placement of `markHop()` calls inside `browser-renderer.ts` — pick the most informative hop boundaries based on code reading.
- Whether to add a Playwright `--no-sandbox` or similar startup arg optimization if profile reveals Chromium launch as a hotspot.
- Whether to add a "warmup" capture on `start()` if profile shows first capture is slow.
- Hash function for the HTML-unchanged check (sha1 via `node:crypto` is the easy default; no need for a specialized hash).

## Deferred ideas (captured for future phases)

- Pre-warm Chromium on daemon startup
- Reduce 250ms resample interval
- PERF-03 "consistent fast paths" — only if profile reveals specific button types are stickier
- React mount optimization for back button

## Out-of-scope

- Emoji injection (Phase 59)
- Overlay auto-show (Phase 62)
- Pagination button redesign (Phase 60)
- Icon updates (Phase 61)
- Settings deck revamp (Phase 63)
- Chrome overlay extension (Phase 64)

## Decisions summary

1. Profile: extend browser-renderer.ts with `SIRENO_PROFILE=1` debug logs, env-var-guarded, no signature changes.
2. Fix: skip capture when HTML unchanged (primary).
3. Back vs weather: profile first, decide after measurement.
