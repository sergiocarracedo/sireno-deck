# Plan 05-03 Summary

**Completed:** 2026-05-30

## What was built
Phase 5's final slice added one shared runtime-owned button error helper that keeps button-scoped failures compact on-device and actionable in logs without disturbing the proven full-deck config reload error surface. Button render, invalidate, tap, release, press, and polling refresh failures now map to stable four-digit codes, render a narrow warning-triangle helper on the affected button, and emit deck/button-aware diagnostics that include deck id, button position, button type, operation, and error code.

## Key files
- `packages/cli/src/deck/runtime.ts`: adds the shared runtime-owned button error helper, routes narrow button failure seams through it, and preserves the separate `showTemporaryErrorDeck(...)` config reload path.
- `packages/cli/src/util/errors.ts`: defines the stable button-runtime error code mapping plus the structured diagnostic payload helper used by runtime logging.
- `packages/cli/src/deck/runtime.test.ts`: proves the compact helper and structured diagnostics on tap-failure and polling-refresh failure paths while keeping the existing temporary config error deck regressions green.

## Decisions made
- Kept the helper runtime-owned and button-local by wiring it into the narrowest button seams that already existed (`renderRuntimeButton`, per-button invalidate, button event handlers, and polling refresh) instead of broadening `reportRuntimeError(...)` into a universal surface.
- Reused the existing visual system with `ButtonSurface` and `Text` plus a literal `▲` marker, which kept the slice compact and avoided adding a new shared browser/emulator primitive or touching `dom-host-deck-document.tsx`.

## Deviations
- Task `05-03-02` exposed a real runtime race: on `up`, release and tap handling were running concurrently, so a successful release render could overwrite the tap-failure helper. I fixed that with a tiny sequencing change in `runtime.ts` (`release` then `tap`) before landing the focused proof tests, and kept the deviation honest with a separate `fix(05-03)` commit.
- The plan listed `packages/cli/src/render/dom-host-deck-document.tsx` as an optional touch point, but execution did not need it because the runtime-owned helper could be rendered entirely through existing button surface primitives.

## Notes for downstream
- Verifier and final artifact sync should preserve the hard separation between button-local runtime failures and the temporary full-deck config reload error surface; they are intentionally different products seams.
- If later phases widen runtime diagnostics, keep the stable error-code allocation and deck/button-aware payload shape aligned with the helper introduced here instead of inventing a parallel logging contract.
