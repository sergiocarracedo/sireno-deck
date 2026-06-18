# Phase 74: Label-values cap — Context

**Gathered:** 2026-06-18
**Mode:** deep
**Status:** Ready for planning

<domain>
## Phase Boundary

Cap the bundled `system-status-label-values` addon at 1–2 metrics. Configs with 3+ metrics are rejected at config load with a clear error pointing to the future `value-display` addon (FEAT-02 / Phase 75).

**Out of scope:**
- BUG-07 (Bars component `formatter` prop) — dropped via discussion. The existing `displayValue` mechanism + system-status addon's per-metric `SystemStatusFormatter` enum already covers formatting needs.
- New `value-display` addon (FEAT-02) — its own phase (75).
- `LabelValueList` formatter prop — out of scope.

</domain>

<decisions>
## Implementation Decisions

### Scope

- **Drop BUG-07 entirely.** No `formatter?: (value: number) => string` prop added to the `Bars` component. The system-status-bars addon already pre-formats each metric via `toSystemStatusDisplayMetric` and passes the result in `displayValue`. The bar displays it as-is. Backward compatible.
- **Phase 74 = label-values cap only.** Single deliverable.

### Schema shape

- **Replace the 4-tuple union** (`z.union([z.tuple([1...]), z.tuple([2...]), z.tuple([3...]), z.tuple([4...])])`) with `z.array(LabelValueMetricSchema).min(1).max(2)`.
- `.min(1)` because 0 metrics is meaningless.
- `.max(2)` because the cap.

### Error message

- **Brief hint pointing to `value-display` (FEAT-02).** Add via `.superRefine` or by combining `z.array(...).max(2, "...")` with a custom message.
- Zod's default "Array must contain at most 2 element(s)" is OK on its own, but the user wants a pointer to `value-display` for users who hit the cap.
- Suggested message: `"system-status-label-values supports 1–2 metrics; for 3+ values use the value-display addon (FEAT-02)"`.

### Backward compatibility

- No existing fixtures use `system-status-label-values` with 3+ metrics (verified by grep).
- Existing test in `index.test.ts:111-119` uses 2 metrics — still valid.
- No code changes needed to `label-values.tsx` button implementation (the runtime supports any length, schema enforces the cap).

### Tests

- Add a new test asserting that 3+ metrics are rejected by the schema with the expected error message.
- Existing 2-metric test stays unchanged.
- Existing bars test stays unchanged (bars still allows 1-3 metrics).

### Documentation

- Update `REQUIREMENTS.md` to drop BUG-07 from Phase 74's scope (or note it as already-satisfied-by-displayValue).
- Update ROADMAP.md Phase 74 success criteria to drop the 3 Bars-related items.

### Agent's Discretion

- Whether to use `.superRefine` or a custom error message on `.max(2, "...")`. Both work; the planner/executor picks the cleaner one.
- Whether to update `REQUIREMENTS.md` to mark BUG-07 as "satisfied" or "moved out of scope".

</decisions>

<specifics>
## Specific Ideas

- User explicitly said "forget about formatter" after realizing the BUG-07 change would force a system-status-bars refactor (the formatter prop is component-level but bars need per-metric formatting via `toSystemStatusDisplayMetric`).
- User explicitly said "set the number format in displayvalue" — confirming the existing displayValue path is the right way to carry formatted values into the bar.

## Specific Requirements

- "3+ value configs are rejected at config load with a clear error pointing to `value-display` (FEAT-02)" — success criteria literal.
- "All existing `system-status-bars` / `system-status-label-values` configs in the test fixtures still pass" — verified, no fixtures break.

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

- `.planning/REQUIREMENTS.md` — `FEAT-01` (label-values cap), `FEAT-02` (value-display addon, future phase)
- `.planning/ROADMAP.md` — Phase 74 success criteria, Phase 75 (value-display)
- `packages/cli/src/builtin-addons/system-status/schemas.ts:48-69` — current label-values schema (1-4 tuple union)
- `packages/cli/src/builtin-addons/system-status/index.test.ts:93-120` — schema-bounds test
- `packages/cli/src/builtin-addons/system-status/buttons/label-values.tsx` — runtime button (no change needed)
- `packages/cli/src/builtin-addons/system-status/domain/display-metrics.ts` — `toSystemStatusDisplayMetric` (relevant for FEAT-02 but not for Phase 74)
- `.planning/research/FEATURES.md` — BUG-07 + BUG-08 references (now resolved or moved)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- `displayValue: string` field on `BarsItem` — already used by system-status-bars to pass pre-formatted strings. No change.
- `toSystemStatusDisplayMetric(metric, config)` in `system-status/domain/display-metrics.ts` — converts a `CanonicalSystemMetricSnapshot` to a display-ready structure with `formattedValue`. Used by both bars and label-values buttons.
- `SystemStatusFormatter` enum (`bytes`, `count`, `frequency-ghz`, `percent`, `uptime`) — already exposed in metric config schema. Not extended; per-metric formatting is already in place.

### Established Patterns

- `z.union([z.tuple([...]), ...])` style for bounded arrays — used in current `SystemStatusBarsButtonSchema.metrics` and `SystemStatusLabelValuesButtonSchema.metrics`. We are replacing label-values' style with `z.array(...).min(...).max(...)`. Bars still uses tuple union (1-3 allowed).
- `z.array(...).min(N).max(N, "...")` — zod default behavior is to emit "Array must contain at most N element(s)". Override the message for the value-display hint.

### Integration Points

- Schema: `packages/cli/src/builtin-addons/system-status/schemas.ts:48-69` — replace union with array, add custom error.
- Tests: `packages/cli/src/builtin-addons/system-status/index.test.ts` — add 3+ rejection test.
- ROADMAP.md: Phase 74 success criteria — drop the 3 Bars items.
- REQUIREMENTS.md: BUG-07 entry — mark as moved or already-satisfied.

</code_context>

<deferred>
## Deferred Ideas

- **BUG-07 (Bars `formatter` prop)** — explicitly dropped via discussion. If a future need arises for component-level numeric formatting (vs the current displayValue path), it can be a future phase.
- **`LabelValueList` formatter prop** — out of scope. Same reasoning as BUG-07.
- **value-display addon (FEAT-02)** — its own phase (75).
- **Per-item `formatter` field on `BarsItem`** — would conflict with the existing `displayValue` field. Re-evaluate only if a use case emerges.

</deferred>

---

*Phase: 74-shared-formatter-label-values-cap*
*Context gathered: 2026-06-18*
