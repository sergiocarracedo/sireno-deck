# Plan 06-02 Summary

**Completed:** 2026-05-14

## What was built
The Phase 6 live refresh contract is now wired through the existing core runtime instead of relying on incidental re-renders. `interval_ms` is validated with the agreed `500ms` minimum, runtime polling now prefers per-button overrides before falling back to `defaultIntervalMs`, and the bundled digital `date-time` addon declares a default cadence and formats its output through `Intl.DateTimeFormat`.

## Key files
- `packages/cli/src/core/schemas.ts`: validates `interval_ms` with the Phase 6 minimum floor.
- `packages/cli/src/deck/runtime.ts`: chooses polling cadence from `button.interval_ms` or `definition.defaultIntervalMs`.
- `packages/cli/src/deck/runtime.test.ts`: covers override, default-only, and no-polling scheduler behavior.
- `builtin-addons/date-time/src/index.ts`: declares the default digital date-time cadence and formats labels via `Intl.DateTimeFormat`.
- `builtin-addons/date-time/src/index.test.ts`: pins the addon definition contract and live widget render shape.
- `packages/cli/vitest.config.ts`: now includes bundled addon tests used by the shipped built-ins.

## Decisions made
- Kept the user-chosen `500ms` minimum in schema validation rather than runtime clamping so config stays truthful.
- Exported the digital date-time formatter helper and cadence constant from the addon file to keep the addon test precise without reaching into implementation internals indirectly.

## Deviations
- The plan verify command assumed the package Vitest config could already discover bundled addon tests outside `packages/cli/src`. In practice the harness only included in-package tests, so `packages/cli/vitest.config.ts` had to be expanded to include `../../builtin-addons/**/*.test.ts`.

## Notes for downstream
- Phase 7 can assume the runtime now has a stable cadence precedence rule: `interval_ms` first, `defaultIntervalMs` second.
- The bundled `date-time` addon is now a real live widget foundation for the analog clock and calendar work in later phases.
