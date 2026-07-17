# Phase 6 — Lock Deck

**Goal:** When the OS session is locked, the deck switches to a global lock-deck mode that overrides any other deck, disables gestures, and suppresses system buttons — with a `go-to-folder` escape hatch for user-defined lock decks.

## Status

Not yet planned — run `plan-phase 6`.

## References

- Source description: `/works/opensource/sireno-deck` (reference project) `session:locked` overlay + `core:locked-time-tile`
- Existing partial implementation: `packages/cli/src/builtin-addons/session/decks/locked.ts` (5 time buttons, not yet wired as global lock mode)
- Session provider: `packages/cli/src/system/providers/session/{linux,darwin,windows}.ts`
- Runtime (overlay precedence): `packages/cli/src/deck/runtime.ts`
- System-button injection: `packages/cli/src/deck/system-back-injection.ts`
- Time tile button: `packages/cli/src/builtin-addons/date-time/buttons/locked-time-tile/`