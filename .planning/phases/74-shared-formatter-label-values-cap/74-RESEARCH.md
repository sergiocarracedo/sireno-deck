# Phase 74: Label-values cap — Research

**Phase:** 74-shared-formatter-label-values-cap
**Date:** 2026-06-18

## Don't Hand-Roll

- **Array bounds in zod**: `z.array(...).min(N).max(M, "msg")` is the standard, well-tested approach. No reason to hand-roll a custom validator. [VERIFIED: zod 3 docs via context7]
- **Custom error message on `.max(N, "msg")`**: zod 3 supports passing a string directly as the second argument to `.min()` / `.max()` on array schemas (e.g., `z.array(z.string()).min(5, "Too few items!")`). Same syntax works for `.max()`. [VERIFIED: zod 3.24 docs via context7]

## Common Pitfalls

### `.refine()` / `.superRefine()` wraps the schema in `ZodEffects`

**HIGH severity.** Calling `.refine()` or `.superRefine()` on a schema wraps it in a `ZodEffects` wrapper which **does not have `.shape`**. Downstream consumers that spread `...AddonButtonActionConfigSchema.shape` (a common pattern in this codebase) silently break because `.shape` becomes `{}`.

For Phase 74: do NOT use `.superRefine()` to add the value-display hint. Use `.max(2, "msg")` directly — it returns a new `ZodArray`, not a `ZodEffects`.

[Source: `.planning/solutions/best-practices/zod-refine-silently-breaks-shape-consumers-2026-06-09.md`]

### `.min(1).max(2, "msg")` are independent constraints

The `.min()` and `.max()` produce separate validation errors. Putting the value-display hint on `.max(2, "...")` only covers the "too many" case. If a user configures 0 metrics, they get the default "Array must contain at least 1 element(s)" message. That's fine — 0 metrics is a config typo, not the primary use case we're guarding against. **Acceptable: only customize the `.max()` error message.**

### `SystemStatusFormatter` enum stays unchanged

The per-metric `SystemStatusFormatter` (`bytes`, `count`, `frequency-ghz`, `percent`, `uptime`) is at the **metric config level**, not the component level. It's untouched by Phase 74. The system-status-label-values button continues to call `toSystemStatusDisplayMetric` per metric, which honors the formatter enum. No regression.

## Existing Patterns in This Codebase

- **Bundled addon schema style**: `z.object({ ...AddonButtonActionConfigSchema.shape, ... }).strict()` — every addon extends the shared base. Phase 74 keeps this style. [Verified: `packages/cli/src/builtin-addons/system-status/schemas.ts:35-46`]
- **Tuple-union bounded arrays**: `z.union([z.tuple([schema]), z.tuple([schema, schema]), ...])` — used for `SystemStatusBarsButtonSchema.metrics` (1-3) and the current `SystemStatusLabelValuesButtonSchema.metrics` (1-4). Phase 74 replaces label-values' tuple union with `z.array(...).min(1).max(2)`. Bars keeps its tuple union (1-3 is correct for bars). [Verified: `schemas.ts:35-69`]
- **Test structure**: `it('exports bundled bars and label-value definitions with bounded schemas', () => { ... })` at `index.test.ts:93-120` — uses `definition.configSchema.parse(...)` with a valid 2-metric config and asserts the round-trip output. Phase 74 adds a sibling test for 3+ metric rejection. [Verified: `index.test.ts:93-120`]

## Recommended Approach

1. **Schema change**: In `packages/cli/src/builtin-addons/system-status/schemas.ts:48-69`, replace the `z.union([z.tuple([1...]), z.tuple([2...]), z.tuple([3...]), z.tuple([4...])])` with:
   ```ts
   metrics: z
     .array(LabelValueMetricSchema)
     .min(1)
     .max(
       2,
       'system-status-label-values supports 1–2 metrics; for 3+ values use the value-display addon (FEAT-02)',
     ),
   ```

2. **Test addition**: Add a new test in `index.test.ts` that asserts `labelValuesDefinition.configSchema.safeParse({ metrics: [m1, m2, m3] })` returns success=false with the expected error message. Place it next to the existing bounded-schemas test (line 93-120).

3. **Documentation updates**:
   - `ROADMAP.md` Phase 74 success criteria — remove the 3 Bars-related items (already dropped via discussion).
   - `REQUIREMENTS.md` — note BUG-07 status (deferred / out of scope for v1.7).

## Confidence Levels

- **HIGH**: Schema change pattern (`z.array(...).max(N, "msg")`) is standard zod 3 behavior. Verified via context7 docs.
- **HIGH**: Solution prior art (zod-refine-silently-breaks-shape-consumers) confirms `.max(N, "msg")` does NOT wrap in ZodEffects. Verified by reading the solution.
- **HIGH**: No existing fixture uses 3+ metrics in `system-status-label-values`. Verified by grep across `packages/cli/fixtures/`.
- **HIGH**: No existing test uses 3+ metrics. Verified by grep across `packages/cli/src/builtin-addons/system-status/index.test.ts` (only 1 test, with 2 metrics).
- **MEDIUM**: The exact error message text — zod may quote or wrap it. Will verify in test before final commit.