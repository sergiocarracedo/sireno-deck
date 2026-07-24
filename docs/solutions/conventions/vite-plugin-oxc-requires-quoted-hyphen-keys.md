---
title: "vite-plugin-oxc requires quoted hyphen keys in object literals"
date: 2026-07-24
category: conventions
module: packages/cli/vite-plugin-oxc
problem_type: convention
component: tooling
severity: medium
applies_when:
  - "Extending an in-source enum-style catalog with kebab-case ids (cpu-boost, fan-rpm, network-read, ...)"
  - "Adding a property name containing a hyphen to any object literal that flows through vite-plugin-oxc"
  - "Running vitest with the workspace's vite config — the same parser enforces the rule in test transforms"
tags:
  - vite-plugin-oxc
  - parser
  - kebab-case
  - enum-style-ids
  - catalog
  - object-literal-keys
related_components:
  - packages/cli/src/builtin-addons/system-status/domain/catalog.ts
  - packages/cli/src/builtin-addons/system-status/domain/metric-ids.ts
---

# vite-plugin-oxc requires quoted hyphen keys in object literals

## Context

The Sireno Deck CLI uses `vite-plugin-oxc` for source transforms (production
builds and vitest's `transformWithOxc`). When extending an in-source enum
catalog such as `METRICS_CATALOG` in `packages/cli/src/builtin-addons/system-status/domain/catalog.ts:29`
with new kebab-case ids (`cpu-boost`, `disk-io`, `fan-rpm`, `gpu-temp`, ...),
the unquoted object-key form fails parsing at module load — even though it
parses as valid JavaScript in every other toolchain the project uses
(`tsc`, `node --check`, ESLint via oxlint).

## Guidance

**Always quote object keys containing a hyphen**, even in places where TypeScript
or raw JavaScript would accept the unquoted form. The vite-plugin-oxc parser
treats an unquoted hyphen key as a labeled statement, not a property name —
the same shape that produces `foo: doSomething()` at the top of a function.

```ts
// ✗ parses in tsc, fails in vite-plugin-oxc
const METRICS_CATALOG = {
  cpu: { ... },
  "cpu-boost": { id: "cpu-boost", ... },  // ← unquoted fails
}

// ✓ both toolchains accept
const METRICS_CATALOG = {
  cpu: { ... },
  "cpu-boost": { id: "cpu-boost", ... },  // quoted
}
```

The shape applies whenever an id set (`as const` array) and a parallel catalog
record (`Record<Id, Def>`) grow together. The convention is to keep ids
kebab-case in `SYSTEM_METRIC_IDS` (validated by `z.enum` against the
unquoted array form) and quote every key on the catalog side that contains
a hyphen.

The catalog's runtime drift guard
(`packages/cli/src/builtin-addons/system-status/domain/catalog.ts:170`)
already keys both shapes by id string, so quoting does not change semantics
— only the source shape.

## Why This Matters

vite-plugin-oxc throws at *transform* time, which means:

- The Vitest run fails with `transformWithOxc` parse errors and **reports
  zero tests run** for every file that imports the broken module — easy to
  misread as a deeper test-runner failure.
- A Vite dev server (frontend + emulator) silently refuses to load the
  addon frontend bundle when the catalog is the first module graph entry.
- The error message points at the first unquoted key it sees but does not
  enumerate the others — fixing only that line repeats the parse failure
  on the next unquoted key. Always grep for `^\s+[a-z][a-z-]*: \{` in any
  freshly-extended catalog to find every offender at once.

Cost on this build: caught the parse failure at the first vitest run after
domain-extension commit, fixed by quoting all 8 new catalog keys
(`"cpu-boost"`, `"cpu-voltages"`, `"disk-io"`, `"fan-rpm"`, `"gpu-temp"`,
`"gpu-usage"`, `"network-read"`, `"network-write"`), then re-ran.

## When to Apply

- Adding new kebab-case ids to any `Record<EnumId, X>` style catalog where
  the id set is defined as an `as const` array of strings.
- Authoring config-shaped object literals that will be loaded by a Vite
  dev server or processed through vitest transforms.
- Reviewing a PR that touches `METRICS_CATALOG` or any sibling
  `Record<SystemXxxId, ...>` map — grep for unquoted hyphen keys before
  approving.

## Examples

**Before** (parses in tsc, fails in vite-plugin-oxc — error at line 161):

```ts
export const METRICS_CATALOG: Readonly<Record<SystemMetricId, MetricDef>> = {
  cpu: { id: "cpu", defaultLabel: "CPU", ... },
  ram: { id: "ram", defaultLabel: "RAM", ... },
  // ...existing keys...
  cpu-boost: { id: "cpu-boost", ... },   // ← parse error here
  cpu-voltages: { id: "cpu-voltages", ... },
  disk-io: { id: "disk-io", ... },
}
```

**After** (parses everywhere):

```ts
export const METRICS_CATALOG: Readonly<Record<SystemMetricId, MetricDef>> = {
  cpu: { id: "cpu", defaultLabel: "CPU", ... },
  ram: { id: "ram", defaultLabel: "RAM", ... },
  // ...existing keys...
  "cpu-boost": { id: "cpu-boost", ... },
  "cpu-voltages": { id: "cpu-voltages", ... },
  "disk-io": { id: "disk-io", ... },
}
```

The actual parse-error message produced by vite-plugin-oxc during the
8-metrics extension:

```
Plugin: vite:oxc
File: packages/cli/src/builtin-addons/system-status/domain/catalog.ts
 `,` or `}` expected
```

Followed by a position indicator pointing at the first unquoted hyphen key.
There is no enum-violation context — the parser reads the whole expression
as a labeled statement until it finds `{` and demands the statement
terminator (`,` or `}`) it never gets.

## Related

- PR #6 — feat(system-status): add 8 metrics (the build that surfaced this)
- vite-plugin-oxc docs — check current version's handling of labeled
  statements; behavior may diverge in newer releases.
