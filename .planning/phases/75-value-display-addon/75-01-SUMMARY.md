# Plan 75-01 Summary

**Completed:** 2026-06-18

## What was built

New first-party `value-display` addon at `packages/cli/src/builtin-addons/value-display/`. Configures 1-3 per-value shell commands that run in parallel via `Promise.all` with 5s default timeout. Each value's stdout is formatted via the shared `SystemStatusFormatter` vocabulary (now imported from system-status/schemas) and rendered through the existing `LabelValueList` surface (auto-selects single/double/stack layouts). On command failure (non-zero exit, timeout, command-not-found), the value falls back to "N/A". Per-button tap/hold/dbltap commands are wired via `useButtonActionCommand`. Polling defaults to 1s.

## Key files

- `packages/cli/src/builtin-addons/value-display/index.ts` — `sirenoAddon` export
- `packages/cli/src/builtin-addons/value-display/schemas.ts` — `ValueDisplayButtonSchema` (1-3 values cap, .strict() object, poll/render defaults)
- `packages/cli/src/builtin-addons/value-display/domain/format-command-output.ts` — formatter + units + non-numeric passthrough
- `packages/cli/src/builtin-addons/value-display/buttons/value-display.tsx` — `defineMountedButton` with parallel polling + action wiring
- `packages/cli/src/builtin-addons/value-display/index.test.ts` — 8 tests
- `packages/cli/src/builtin-addons/system-status/schemas.ts` — added `export` to `SystemStatusFormatterSchema`
- `packages/cli/src/addon/builtin.ts` — registered `valueDisplayAddon`

## Decisions made

- **Added `export` to `SystemStatusFormatterSchema`** (was a local const in system-status). Direct import from system-status/schemas.ts avoids lifting to a shared module.
- **Inlined formatter logic** in `format-command-output.ts` rather than importing `formatMetricValue` from system-status. Duplication is intentional; lift to shared module later if a 3rd consumer emerges.
- **Test fixtures use `harness.activate()`** for polling tests instead of `def.poll!()` directly, since `poll` requires a full `MountedAddonButtonRenderProps` shape (not just config).

## Notes for downstream

- Typecheck errors in `value-display.tsx` mirror pre-existing errors in `system-status/buttons/bars.tsx` and `label-values.tsx` (same `defineMountedButton` pattern). Not introduced by Phase 75.
- The 8 tests cover all 6 success criteria: bounded 1-3 schema, 1/2/3 layouts, command-not-found fallback, parallel execution, default timeout, action commands.