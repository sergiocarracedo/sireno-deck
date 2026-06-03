# Plan 26-04 Summary

**Completed:** 2026-05-27

## What was built
Closed the shared JSX-runtime seam that broke all three manual Phase 26 checks on the real CLI/emulator path. `packages/cli/src/render/dom-host.tsx` and `packages/cli/src/render/button-frame.tsx` now bind a runtime-safe React value when executed through `pnpm exec tsx`, so the shared deck document, undersized-device warning path, and startup handoff no longer crash with `ReferenceError: React is not defined` outside Vitest.

This closure plan also strengthened proof at the actual failure seam instead of trusting test-only transforms. The focused startup test suite now includes a shell-out regression that executes `renderDomDeck(...)` through the same `tsx` runtime path UAT hit, and the UAT/verification artifacts now keep the original blocker evidence while explicitly linking rerun to `26-04-PLAN.md`.

## Key files
- `packages/cli/src/render/dom-host.tsx`: restored a runtime-safe React binding for the shared JSX-authored deck document on the real CLI/emulator path.
- `packages/cli/src/render/button-frame.tsx`: restored the same runtime-safe JSX policy for the default frame so shell and frame do not drift.
- `packages/cli/src/cli/commands/start.test.ts`: added a focused regression that shells out through `pnpm exec tsx --eval` and proves `renderDomDeck(...)` survives the real runtime seam.
- `.planning/phases/26-browser-deck-react-shell-polish/26-UAT.md`: preserved the failed manual evidence and pointed rerun to `26-04-PLAN.md`.
- `.planning/phases/26-browser-deck-react-shell-polish/26-VERIFICATION.md`: marked Phase 26 as `gaps_found` until manual rerun completes and linked the same closure plan.

## Decisions made
- Fixed the root cause at the shared JSX runtime seam instead of branching emulator/startup-specific fallback logic.
- Chose the smallest compatible fix: restore runtime-safe React bindings in the JSX-authored modules rather than redesigning the Phase 26 shell again.
- Kept the blocker documentation truthful instead of overwriting the failed UAT history after the code fix landed.

## Notes for downstream
- Automated and runtime smoke verification are green again, but Phase 26 is not done until `verify-work 26` is rerun on the fixed CLI/emulator path.
- If JSX-authored runtime modules move again, keep at least one regression on the real `pnpm exec tsx` seam so Vitest-only success cannot hide another transform mismatch.
