# Plan 20-03 Summary

**Completed:** 2026-05-23

## What was built
The implicit locked-session fallback no longer renders as one bundled date-time button at position `0`. It now renders a centered live five-button `HH:MM` row on buttons `5..9`, with the colon isolated on the center button and the existing explicit `session.locked_deck` override plus exact unlock restore behavior left intact. The phase also now ships a committed locked-time review fixture and synced UAT/verification/state artifacts for that behavior.

## Key files
- `packages/cli/src/deck/runtime.ts`: replaces the old one-button implicit lock deck with the fixed centered five-tile fallback while keeping lock-mode control flow core-owned.
- `packages/cli/src/deck/runtime.test.ts`: proves the `5..9` layout, live minute updates, explicit locked-deck precedence, and exact unlock restore behavior.
- `packages/cli/src/builtin-addons/date-time/index.ts`: adds the narrow `locked-time-tile` renderer path so the implicit fallback stays live on the existing one-second cadence.
- `packages/cli/src/builtin-addons/date-time/index.test.ts`: covers the locked tile schema, formatting helpers, and rendered digit/colon output.
- `packages/cli/fixtures/phase-20/config.locked-time-layout.yml`: committed browser/device review fixture for the implicit lock fallback.
- `.planning/phases/20-theme-packages-and-locked-time-layout/20-UAT.md`: now includes the locked fallback review script and explicit `session.locked_deck` precedence note.
- `.planning/phases/20-theme-packages-and-locked-time-layout/20-VERIFICATION.md`: updated with the final Wave 3 code/test coverage and phase-level verification notes.

## Decisions made
- Kept the layout fixed and core-owned instead of making lock-mode chrome theme-extensible in this phase.
- Reused the bundled date-time addon through one narrow tile renderer instead of inventing a separate runtime-only renderer path.

## Why it broke before
- The existing implicit lock fallback was still a Phase 11-era single `date-time` button, which no longer matched the Phase 20 centered `HH:MM` contract.
- A naive first pass could snapshot characters once and still pass superficial tests, but that would violate the requirement that the fallback stay live on a one-second cadence.

## Notes for downstream
- Phase 20 execution is complete and focused verification is green.
- Final phase closure still needs the committed Phase 20 browser/device UAT rerun so `.planning/ROADMAP.md`, `.planning/STATE.md`, and `AGENTS.md` can move from verifying/planning language to complete.
