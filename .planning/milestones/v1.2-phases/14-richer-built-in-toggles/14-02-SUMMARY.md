# Plan 14-02 Summary

**Completed:** 2026-05-19

## What was built
Phase 14 now supports the same built-in `toggle` button in `get-set` mode with a strict config branch, authoritative command reads, and honest pending/error behavior. Startup begins in a pending state until the first read resolves, taps do nothing until a real state is known, writes choose `set_on_command` or `set_off_command` from the last authoritative truth, and the button reconciles back through command output instead of pretending a local flip proved anything.

## Key files
- `packages/cli/src/core/schemas.ts`: adds the strict `mode: "get-set"` toggle schema branch with exact command fields and token-list validation.
- `packages/cli/src/config/loader.test.ts`: pins valid config, missing required commands, wrong-branch fields, and invalid token lists.
- `builtin-addons/core-buttons/src/index.ts`: implements authoritative `get-set` reads, writes, pending/error state handling, and token mapping with narrow canonical fallbacks.
- `builtin-addons/core-buttons/src/index.test.ts`: verifies pending startup, command selection from last known truth, and write-failure preservation.
- `packages/cli/src/deck/runtime.test.ts`: proves taps are ignored before truth is known and that the runtime reconciles through the command-driven path.
- `packages/cli/src/cli/commands/start.ts`: passes `toggle_mode` through the real CLI render path so mode-specific chrome reaches the device surface.
- `packages/cli/fixtures/phase-14/config.toggle-get-set.yml`: committed real-surface fixture for the `get-set` review path.
- `.planning/phases/14-richer-built-in-toggles/14-UAT.md`: extends Phase 14 UAT with the authoritative `get-set` review case.

## Decisions made
- Kept command-token parsing explicit and narrow: configured `on_values` / `off_values` win, otherwise fallback tokens remain limited to `on/off`, `true/false`, and `1/0`.
- Treated a successful write as insufficient proof on its own; the button always settles through a subsequent authoritative read.

## Deviations
- Added the `toggle_mode` passthrough in `packages/cli/src/cli/commands/start.ts` during Task `14-02-02` because the shipped review path would otherwise drop the command-mode accent even when runtime state was correct.

## Notes for downstream
- `14-UAT.md` now covers internal and `get-set`; Plan `14-03` should extend the same review surface for `toggle-status` and keep all three modes visually distinct inside one toggle family.
