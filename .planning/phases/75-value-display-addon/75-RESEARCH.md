# Phase 75: value-display addon — Research

**Phase:** 75-value-display-addon
**Date:** 2026-06-18

## Don't Hand-Roll

- **`formatMetricValue` already exists** in `packages/cli/src/builtin-addons/system-status/domain/display-metrics.ts:47-79` and handles all 5 formatters (bytes/count/frequency-ghz/percent/uptime) via numbro. Reuse it for value-display rather than re-implementing. [VERIFIED: codebase scan]
- **`executeCommand` already exists** in `packages/cli/src/action/executor.ts:61` and handles shell exec with timeout. Use it directly. [VERIFIED: codebase scan]
- **`useButtonActionCommand` is the standard action hook** for `commands.tap | hold | double-tap`. Built-in addons (system-status, brightness) use it. Reuse the same pattern. [VERIFIED: codebase scan]

## Common Pitfalls

### Formatter string parsing

The `formatMetricValue` function expects a `number`. value-display's `command` returns a `string` (stdout). Need to:
1. Trim the stdout
2. Try `Number.parseFloat(value)`
3. If NaN, return the raw string as-is (don't apply formatter to non-numeric text)
4. If valid number, apply formatter

Use `Number.parseFloat` not `Number(value)` — `Number("")` returns 0, but `parseFloat("")` returns NaN. [VERIFIED: MDN standard JS behavior]

### Don't add the value-display entry to `getBundledAddons` twice

If the new addon lives in `packages/cli/src/builtin-addons/value-display/`, register it once in `packages/cli/src/addon/builtin.ts`. Avoid double-registration (would cause addon-name conflicts at startup). [VERIFIED: pattern from system-status]

### Don't `.refine()` the schema (re-uses Phase 74 lesson)

`z.array(...).max(3, "msg")` works directly. `.superRefine()` would wrap in `ZodEffects` and break `.shape` consumers. See `.planning/solutions/best-practices/zod-refine-silently-breaks-shape-consumers-2026-06-09.md`.

### `available: false` pattern from system-status

`toSystemStatusDisplayMetric` returns `formattedValue: '--'` for unavailable metrics. value-display should use a similar pattern but the user picked "N/A" — use that exact string. [VERIFIED: Phase 75 discuss-phase decision]

## Existing Patterns in This Codebase

- **Bundled addon structure**: `packages/cli/src/builtin-addons/<name>/` with `index.ts` exporting `SirenoAddon`, `buttons/<button>.tsx` for each button, `domain/<helpers>.ts` for shared logic, `schemas.ts` for zod schemas. [Verified: system-status, brightness, weather all follow this pattern]
- **`defineMountedButton` shape**: takes `configSchema`, `defaultPollIntervalMs`, `defaultRenderIntervalMs`, `onActivate`, `poll`, `render`, `useButtonActionCommand`, `type`. Returns a `MountedAddonButtonDefinition`. [Verified: `system-status/buttons/label-values.tsx:59-105`]
- **`render` callback shape**: `({ config, payload, store }) => ReactElement`. Reads `payload` (from `poll`) or falls back to `store.button.snapshot` (from `onActivate` or `store.button.update`). [Verified: same file]
- **Bundled addon registration**: `packages/cli/src/addon/builtin.ts:12-23` exports `getBundledAddons()` returning an array. Add new addon to this array. [Verified: same file]
- **Zod `.strict()` object pattern**: addon schemas use `.object({...}).strict()` to reject unknown keys. [Verified: `system-status/schemas.ts:35-46, 48-69`]

## Recommended Approach

1. **Create `packages/cli/src/builtin-addons/value-display/`** with:
   - `index.ts` — `valueDisplayAddon: SirenoAddon` export
   - `schemas.ts` — `ValueDisplayButtonSchema` zod schema
   - `domain/format-command-output.ts` — private helper that takes (raw: string, formatter?: SystemStatusFormatter, units?: string) and returns `{ value: string, available: boolean }`
   - `buttons/value-display.tsx` — `defineMountedButton(...)` with the per-button button

2. **`ValueDisplayButtonSchema`**:
   ```ts
   z.object({
     ...AddonButtonActionConfigSchema.shape,
     values: z
       .array(z.object({
         command: z.string().min(1),
         label: z.string().min(1),
         icon: z.string().min(1).optional(),
         formatter: SystemStatusFormatter.optional(),
         units: z.string().min(1).optional(),
         timeout_ms: z.number().int().positive().optional(),
       }).strict())
       .min(1)
       .max(3, "value-display supports 1–3 values per button"),
     poll_interval_ms: z.number().int().min(500).default(1_000),
     render_interval_ms: z.number().int().min(500).default(1_000),
   }).strict()
   ```

3. **Button implementation**:
   - `onActivate`: call `poll`, store result in `store.button.snapshot`
   - `poll`: for each value, run `executeCommand({ command, timeoutMs: timeout_ms ?? 5000 })` in `Promise.all`, capture stdout (trimmed) or mark as unavailable on error
   - `render`: convert polled data to `LabelValueList` lines, render in `<ButtonSurface>`
   - Use `useButtonActionCommand(({ config }) => config.commands)` for tap/hold/dbltap

4. **Tests** in `index.test.ts`:
   - 1/2/3 value layouts (parse + render assertions)
   - command-not-found (mock `executeCommand` to throw, assert "N/A" appears)
   - tap/hold/dbltap fire (mock `useButtonActionCommand`'s output, assert commands execute)
   - timeout fallback (mock `executeCommand` with 5s timeout, assert "N/A" after timeout)

5. **Register** in `packages/cli/src/addon/builtin.ts`.

## Confidence Levels

- **HIGH**: `formatMetricValue`, `executeCommand`, `useButtonActionCommand`, `defineMountedButton` patterns are verified by codebase scan.
- **HIGH**: Reusing `LabelValueList` works because 1-3 line counts fall within the 1-4 supported range.
- **HIGH**: zod `.max(N, "msg")` direct string syntax works in zod 3 (verified Phase 74).
- **MEDIUM**: Test coverage for `1/2/3 value layouts` — the index.test.ts test load currently has a pre-existing `@/config/loader` alias issue, so new tests should be split or use a similar structure to system-status's index.test.ts which has the same issue. May need to mock differently.
- **MEDIUM**: Whether `executeCommand` accepts a `timeoutMs` option — I need to verify by reading `executor.ts`.

