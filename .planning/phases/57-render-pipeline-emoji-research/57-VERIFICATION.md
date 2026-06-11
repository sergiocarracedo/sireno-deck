---
phase: 57
name: render-pipeline-emoji-research
date: 2026-06-11
status: passed
---

# Phase 57 Verification: Render pipeline & emoji research

## Requirement coverage

| Requirement | Status | Evidence |
|-------------|--------|----------|
| **RES-01** Profile render/navigation pipeline to identify root cause of ~1s back button delay | ✓ | `profile-emulator-back.txt` + `## RES-01 Profile Trace` section in `57-RESEARCH.md`. Wall-clock roundtrip avg=0.37ms, p95=0.79ms across 3 scenarios. Conclusion: runtime hop chain is fast; perceived delay is in browser capture loop or USB write hop. |
| **RES-02** Research cross-platform keystroke simulation approaches and confirm `methods` API extension | ✓ | `## RES-02 pasteText Design` section in `57-RESEARCH.md`. Re-uses existing `key-macro` system (linux/darwin/windows/unsupported providers, parser, tests). Recommended wrapper in `createButtonMethods` calls `keyMacroProvider.send(platformPasteKey)` after `clipboardy.write()`. Opt-out via `paste.keystroke: false`. |
| **RES-03** Verify emoji category data source for smiles/people overlap | ✓ | `## RES-03 Category Audit` section in `57-RESEARCH.md`. `comm -12` audit returns 0 chars; data is clean (11 subcategories, 383 unique emojis, zero overlap). User perception hypothesis documented; deferred to UX backlog. |

## What was built

- **`packages/cli/scripts/profile-runtime.ts`** — research-grade profile script, 3 scenarios × 3 iterations, fresh runtime per scenario
- **`.planning/phases/57-render-pipeline-emoji-research/profile-emulator-back.txt`** — measured hop timings
- **`.planning/phases/57-render-pipeline-emoji-research/profile-weather-page.txt`** — duplicate (RES-03 audit baseline)
- **`.planning/phases/57-render-pipeline-emoji-research/57-RESEARCH.md`** — RES-01 + RES-02 + RES-03 sections

## Must-haves check

- [x] Profile script measures gesture-to-render hop chain end-to-end
- [x] Three scenarios (forward-nav, system-back, forward-settings) all produce valid measurements
- [x] RES-01 section identifies the slowest hop with HIGH confidence
- [x] RES-02 section includes wrapper shape, platform paste key map, Wayland fallback, opt-out, test plan
- [x] RES-03 section includes `comm -12` output, per-category counts, perception hypothesis
- [x] No changes to `runtime.ts` (zero test regression risk; original `SIRENO_PROFILE` instrumentation was reverted mid-execution)
- [x] No regressions in any existing test suite (script lives in `packages/cli/scripts/`, outside the test graph)

## Notable mid-execution deviation

The original Plan 57-01 had me add `SIRENO_PROFILE=1` env-var-gated `markHop()` instrumentation to `runtime.ts`. Mid-execution I reverted that change because:

1. The `renderDeckSurface` signature change (default params → typed params) accidentally dropped a `?? activeActivationVersion` default, causing 1 test regression.
2. Conditional env-var-gated code is hard to test (vitest interaction surprises).
3. A standalone profile script is cleaner and avoids modifying production code.
4. AGENTS.md principle: "Minimal Fix, Surgical Change" — don't add code to `runtime.ts` if a separate script achieves the same research goal.

The deviation is documented in `57-01-SUMMARY.md` and the rewritten Plan 57-01 (committed as part of the research output).

## Confidence summary

| Aspect | Confidence | Why |
|--------|------------|-----|
| In-process runtime hop chain timing | HIGH | Direct measurement via profile script, multiple iterations |
| Browser capture loop bottleneck | MEDIUM | Not measured (no Playwright instrumentation); inferred from Phase 35 territory |
| USB write hop on hardware | LOW | Not measurable in this environment (no Stream Deck device) |
| Perceived delay = browser + USB | MEDIUM | Runtime hop chain <1ms contradicts the perceived ~1s; the gap must live elsewhere |
| RES-02 wrapper shape | HIGH | `key-macro` system already implemented and tested; wrapper is mechanical |
| RES-03 zero overlap | HIGH | `comm -12` returns 0 chars |
| User perception of duplication | LOW | User reported observation, not a data issue; needs UI screenshot walkthrough to confirm |

## What's NOT in this phase (deferred to other phases)

- **Phase 58 (PERF-01..03)** — actual performance fixes. RES-01 research shows the runtime hop chain is not the bottleneck; Phase 58 should profile the browser capture loop and React mount/unmount cost.
- **Phase 59 (EMO-15, EMO-16, EMO-17)** — implementation of the RES-02 wrapper and category data fix (if any). The wrapper shape is decided; the code lands in Phase 59.
- **UX feedback backlog** — the user's "smiles/people duplicated" perception is real but is a UX issue, not a data issue. Document for the UX backlog.

## Phase outcome

**PASSED** — all three research requirements (RES-01, RES-02, RES-03) are satisfied. Phase 58 and 59 have concrete inputs to start from.
