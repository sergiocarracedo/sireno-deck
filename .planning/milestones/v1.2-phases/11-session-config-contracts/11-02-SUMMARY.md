# Plan 11-02 Summary

**Completed:** 2026-05-17

## What was built
Phase 11 now ships the lock-aware half of the session/config contract. Config can declare an optional top-level `session.locked_deck`, startup resolves host context through a session-monitor seam and warns honestly once when lock monitoring is unsupported, and the runtime can enter a temporary locked surface without destroying the user’s prior navigation state. While locked, the runtime isolates any locked-surface navigation from the saved pre-lock stack, and on unlock it restores the exact prior path. When config omits `session.locked_deck`, the runtime still shows a useful implicit date/time fallback instead of a blank or stale surface. The phase also now includes a committed lock-session fixture and UAT path for manual review.

## Key files
- `packages/cli/src/system/session-monitor.ts`: adds the startup-owned session-monitor seam with explicit capability/state snapshots for supported vs unsupported hosts.
- `packages/cli/src/core/schemas.ts`: validates the top-level `session.locked_deck` contract and rejects missing deck references without weakening loader diagnostics.
- `packages/cli/src/cli/commands/start.ts`: resolves host context through the session-monitor seam, logs the one-time unsupported-host warning, and passes lock-aware options into runtime startup.
- `packages/cli/src/config/loader.test.ts`: verifies valid and invalid locked-deck config paths with preserved line information.
- `packages/cli/src/deck/controller.ts`: adds stack snapshot/restore support so lock mode can preserve and restore the exact pre-lock navigation path.
- `packages/cli/src/deck/runtime.ts`: implements temporary lock-mode surface switching, implicit fallback support, isolated locked navigation, and exact unlock restore while keeping host session state live inside the canonical host context.
- `packages/cli/src/deck/runtime.test.ts`: verifies configured locked deck switching, implicit fallback behavior, isolated locked-mode navigation, exact pre-lock restore, and the committed lock-session fixture.
- `packages/cli/fixtures/phase-11/config.locked-session.yml`: committed review fixture for observable lock-surface switching and restore behavior.
- `.planning/phases/11-session-config-contracts/11-UAT.md`: documents the concrete review steps for lock switching, fallback behavior, and unlock restoration.

## Decisions made
- Kept session monitoring as a startup/runtime seam that feeds the canonical host-context session fields, instead of inventing a second lock-state channel.
- Modeled lock mode as a temporary runtime-owned surface with saved navigation snapshot/restore, rather than destructively mutating the normal navigation path.
- Implemented the implicit fallback as a minimal runtime-owned date/time button so the phase stays useful even without YAML locked-deck configuration.

## Deviations
- The first session-monitor implementation is still a narrow seam with honest supported/unsupported classification rather than a live DBus-backed detector; the runtime contract is in place, but real host event wiring remains the next hardening step.

## Notes for downstream
- Phase-level verification and any follow-up hardening should focus on replacing the initial static supported-host seam in `session-monitor.ts` with a real long-lived detector without changing the canonical host/session contract already shipped here.
