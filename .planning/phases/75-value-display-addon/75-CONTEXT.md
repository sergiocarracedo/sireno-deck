# Phase 75: value-display addon — Context

**Gathered:** 2026-06-18
**Mode:** deep
**Status:** Ready for planning

<domain>
## Phase Boundary

Ship a new first-party addon that renders 1-3 values from per-value user-configured shell commands. Each value is a `{ command, label, icon?, formatter?, units? }` entry. Layout auto-selects for 1, 2, or 3 values. Action wiring uses the shared command-action contract.

**Out of scope:**
- 4+ values (use multiple buttons or future expansion)
- Refactoring `LabelValueList` (we reuse it as-is)
- New theme integrations

</domain>

<decisions>
## Implementation Decisions

### Component strategy

- **Reuse `LabelValueList` surface** (currently supports 1-4 lines, layouts: single/double/stack). value-display passes 1-3 lines through. No new surface. Layout divergence over time is a minor risk accepted in exchange for not duplicating a 146-line TSX component.

### Polling cadence

- **Add `poll_interval_ms` and `render_interval_ms` to schema** (like system-status does). Default 1_000ms / 1_000ms. Re-uses the same `defineMountedButton` config shape and the `defaultPollIntervalMs` / `defaultRenderIntervalMs` derived from config.

### Command execution

- **Parallel via `Promise.all`**: 2-3 value commands run concurrently. Total wait = `max(individual times)`.
- **5s default timeout per command** with optional `timeout_ms?` override on each value entry.
- **On command failure** (non-zero exit, timeout, command-not-found): mark value as `available: false`, render with "N/A" value (same pattern as system-status unavailable slots). No retry, no keep-last-known.

### Formatters

- **Import `SystemStatusFormatter` enum from `@/builtin-addons/system-status/schemas`**. Slight oddity: addon imports from another addon's schema. Acceptable for v1.7. Lift to shared module later if a 3rd consumer emerges.

### Action commands

- **Per-button, same shape as system-status**: a single `commands: { tap?, hold?, 'double-tap'? }` block. Use `useButtonActionCommand(({ config }) => config.commands)`. No per-value actions.

### Schema shape

- `values` field (renamed from `metrics` since values come from arbitrary commands, not system metrics): `z.array(ValueEntrySchema).min(1).max(3)`. Use `.max(3, "msg")` directly (not `.superRefine()`) per the prior `zod-refine-silently-breaks-shape-consumers` solution.
- `ValueEntrySchema`: `{ command: z.string().min(1), label: z.string().min(1), icon?: z.string().min(1), formatter?: SystemStatusFormatter, units?: z.string().min(1), timeout_ms?: z.number().int().positive() }` (`.strict()` to match system-status style).
- Button config extends `AddonButtonActionConfigSchema.shape` (gets `commands`, `key_macro?`).

### Agent's Discretion

- Where to put the `formatValue(formatter, raw, units)` helper (likely inside the value-display addon folder, private).
- Test fixture commands (use `printf` or `echo` for portable test commands).

</decisions>

<specifics>
## Specific Ideas

- User explicitly chose the system-status polling pattern (per-button `poll_interval_ms` / `render_interval_ms`) for consistency. The success criteria didn't mention polling, but the user added it.
- User chose 5s default timeout with override — pragmatic, not too aggressive.
- User chose "N/A" pattern (matches system-status unavailable slots) over richer error UI.

## Specific Requirements

- "Bundled in the CLI as a first-party addon (no extra install step)" — addon lives in `packages/cli/src/builtin-addons/value-display/`, registered in the bundled addon registry.
- "Unit tests for: 1/2/3 value layouts, command-not-found, action commands fire on tap/dbltap/hold" — at minimum these test cases.

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

- `.planning/REQUIREMENTS.md` — `FEAT-02` (value-display addon)
- `.planning/ROADMAP.md` — Phase 75 success criteria
- `packages/cli/src/builtin-addons/system-status/schemas.ts` — reference for schema shape, error code map
- `packages/cli/src/builtin-addons/system-status/buttons/label-values.tsx` — closest analog (defineMountedButton, useButtonActionCommand, LabelValueList usage)
- `packages/cli/src/builtin-addons/system-status/domain/live-metrics.ts` — pattern for command execution
- `packages/cli/src/ui/surfaces/LabelValueListSurface.tsx` — the surface we reuse
- `packages/cli/src/action/executor.ts` — `executeCommand` for per-value command execution
- `.planning/solutions/best-practices/zod-refine-silently-breaks-shape-consumers-2026-06-09.md` — `.max(N, "msg")` direct string syntax
- `packages/cli/src/addon/api.ts` — `defineMountedButton`, `useButtonActionCommand`, `AddonButtonActionConfigSchema`

</canonical_refs>

