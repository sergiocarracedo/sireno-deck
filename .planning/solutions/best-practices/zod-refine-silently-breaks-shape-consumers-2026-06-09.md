---
title: Zod .refine() on a shared base schema silently breaks .shape consumers
date: 2026-06-09
category: best-practices
module: packages/cli/src/addon/api + addon schemas
problem_type: best_practice
severity: medium
tags: [zod, schema-extension, refine, superRefine, addon-api, schema-contract]
symptoms:
  - Adding `.refine()` to `AddonButtonActionConfigSchema` makes `.shape` disappear on downstream addon schemas.
  - Tests in date-time, system-status, emoji-selector break with `unrecognized_keys` because their own schemas still try to accept `commands` after the base type changes.
  - TypeScript reports `'ZodEffects<...>' has no property 'shape'`, but only at the addon-site spread, not at the definition site.
root_cause: `.refine()` (and `.superRefine()`) wrap the schema in a `ZodEffects`, which has no `.shape`. Downstream code that does `...AddonButtonActionConfigSchema.shape` to extend its own object schema starts spreading `{}` and silently dropping fields. The base object becomes effectively unknown to consumers.
resolution_type: api_design
---

# Zod .refine() on a shared base schema silently breaks .shape consumers

## Problem

The bundled action button gained a `key_macro` prop with a mutual-exclusion rule against `commands`. The natural way to enforce that is `.refine()` on the shared `AddonButtonActionConfigSchema`. But that schema is also the **shape-extension base** for the date-time, system-status, and emoji-selector addons, which all spread `...AddonButtonActionConfigSchema.shape` into their own `.object({...}).strict()` schemas. Switching to `.refine()` collapses the type from `ZodObject` to `ZodEffects`, `.shape` disappears, and every downstream consumer starts passing `{}` to its own object — accepting unknown keys, dropping type info, and producing "unrecognized_keys" errors in tests that parse unrelated button configs.

## Symptoms

- `tsc --noEmit` reports `Property 'shape' does not exist on type 'ZodEffects<...>'`.
- Tests like `digitalDefinition.configSchema.parse({ commands: { tap: 'date' } })` throw `unrecognized_keys: ['commands']` because the addon schema is now a `.strict()` object that doesn't include the base fields.
- The base definition site still typechecks fine — the breakage only appears at the call sites that consume `.shape`.

## What Didn't Work

- Adding `.refine()` to `AddonButtonActionConfigSchema` directly: breaks every consumer that spreads `.shape`.
- Adding `.refine()` via `superRefine` at the call site and importing the unrefined base as a separate export (`AddonButtonActionConfigBaseSchema`): works, but forces every consumer to pick a name and creates a parallel schema that can drift.

## Solution

Keep the **base** schema as a plain `ZodObject` and put the refinement at the **call site** that needs the validation, using `superRefine` so the base stays a `ZodObject` and `.shape` remains intact:

```ts
// shared base — plain ZodObject, no refine
export const AddonButtonActionConfigSchema = z
  .object({
    commands: AddonButtonActionCommandsSchema.optional(),
    key_macro: AddonButtonKeyMacroSchema.optional(),
  })
  .strict()
```

```ts
// consumer (e.g. bundled action button) that needs the rule
const BuiltinActionButtonSchema = z
  .object({
    ...AddonButtonActionConfigSchema.shape,  // .shape still works
    icon: z.string().min(1).optional(),
    label: z.string().min(1),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.commands && value.key_macro) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Cannot set both 'commands' and 'key_macro' on an action button",
        path: ['key_macro'],
      })
    }
  })
```

Tradeoff: the rule is no longer enforced at the shared schema level, so anyone reusing `AddonButtonActionConfigSchema` directly (not as a shape-extension base) loses the cross-field check. In this codebase the shared schema is *only* used for shape extension, so the tradeoff is acceptable. If you ever need both, define a parallel `AddonButtonActionConfigStrictSchema = base.refine(...)` and have the bundled button use the strict variant.

## Why This Works

`ZodObject` and `ZodEffects` are different types with different APIs. `ZodEffects` wraps the original schema and forwards most methods, but not `.shape` (because the refinement may not be field-shaped). Spreading a non-existent shape silently produces `{}`, and a `.strict()` object built on `{}` accepts *nothing* outside its own fields — including the fields the consumer thinks it just inherited. The error only surfaces at runtime when something tries to parse a real config. `superRefine` keeps the type chain on `ZodObject` so `.shape` keeps working.

## Prevention

- Treat `.refine()` and `.superRefine()` as **terminal** — never attach them to a schema that other code spreads via `.shape`.
- If a shared schema needs cross-field rules, attach them at the leaf consumer, not the base.
- If you must put the rule on the shared schema, factor out a base `ZodObject` for shape consumers and a strict `ZodEffects` for validation consumers, and keep them side by side with a comment explaining the split.
- Quick check: after any change to a shared schema, run `pnpm --filter sireno-deck-cli exec tsc --noEmit | grep 'has no property .shape'` to catch breakage before committing.

## Related

- `.planning/quick/042-key-macro-action-button/042-PLAN.md` — the design that surfaced this
- `packages/cli/src/addon/api.ts` — `AddonButtonActionConfigSchema` and `AddonButtonActionCommandsSchema`
- `packages/cli/src/builtin-addons/{date-time,system-status,emoji-selector}/...` — downstream `.shape` consumers
