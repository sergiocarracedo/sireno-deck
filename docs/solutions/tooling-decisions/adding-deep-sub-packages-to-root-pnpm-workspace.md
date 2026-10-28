---
title: Adding Deep Sub-packages to Root pnpm Workspace
date: 2026-07-30
category: docs/solutions/tooling-decisions/
module: packages/web
problem_type: tooling_decision
component: tooling
severity: medium
applies_when:
  - A monorepo root `pnpm-workspace.yaml` glob (`packages/*`) does not reach sub-directories two levels deep
  - Sub-packages under a directory need to be first-class workspace members visible to root tooling
  - A project constraint requires that file/folder creation stay within a specific subtree
tags: [pnpm, workspace, monorepo, astro]
---

# Adding Deep Sub-packages to Root pnpm Workspace

## Context

The Sireno Deck marketing site (`packages/web/astro`, Astro + Starlight) needed to be visible to the root workspace so that `pnpm --filter` and root-level tooling could target it.

The root `pnpm-workspace.yaml` declares `packages: ['packages/*']`. This glob resolves one directory level deep: it picks up `packages/cli`, `packages/web`, `packages/addons` (the directory itself, **not** its sub-packages), but **not** `packages/web/astro` or `packages/addons/app-shortcuts` / `packages/addons/pomodoro`.

The project had a constraint: file/folder creation should stay within `packages/web/`. This meant the root `pnpm-workspace.yaml` could be **edited** (adding entries), but no new files or directories should be created outside `packages/web/`.

The wrong approach — adding a nested `pnpm-workspace.yaml` inside `packages/web/` — does **not** make those sub-packages children of the root workspace. It creates an independent nested workspace that root-level `pnpm --filter` cannot reach. Commands only work when run from inside the sub-package directory.

## Guidance

### Add explicit paths to root `pnpm-workspace.yaml`

The correct fix is to add the deep sub-packages directly to the root workspace declaration:

```yaml
packages:
  - packages/*
  - packages/addons/*
  - packages/web/astro
```

Because `packages/web/` itself has **no `package.json`**, it is invisible to the root workspace glob (`packages/*`) — the glob stops at `packages/web` since it finds no manifest there. Adding `packages/web/astro` explicitly bypasses this gap. The same pattern applies to `packages/addons/`, which now hosts the third-party addons (e.g. `app-shortcuts`, `pomodoro`).

After editing the root `pnpm-workspace.yaml`, run `pnpm install` to update the lockfile and register the new workspace members.

Source: `pnpm-workspace.yaml`

### Verify with path-based filter

The filter syntax for private packages requires the path form:

```bash
pnpm --filter "./packages/web/astro" build
```

Package-name filters (`--filter sirenodeck-web`) do not work for private packages in this configuration — use the `./path/to/package` form instead.

### One-way token sync from source-of-truth to consumers

The design tokens live in `packages/cli/src/themes/default/sirenodeck.json`. A Node ESM script at `packages/web/scripts/sync-tokens.mjs` reads that file and writes a generated TypeScript module consumed by Astro:

```js
// packages/web/scripts/sync-tokens.mjs
import { readFileSync, writeFileSync, mkdirSync } from "node:fs"
import { resolve, dirname } from "node:path"
import { fileURLToPath } from "node:url"

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, "..", "..", "..")
const sourcePath = resolve(
  root,
  "packages/cli/src/themes/default/sirenodeck.json",
)
const outDir = resolve(here, "..", "astro/src/design")
const outPath = resolve(outDir, "tokens.generated.ts")

const theme = JSON.parse(readFileSync(sourcePath, "utf8"))
const { colorTokens: colors = {}, typography = {}, fonts = [] } = theme

const banner = `// GENERATED — DO NOT EDIT.\n// Source: packages/cli/src/themes/default/sirenodeck.json\n`
const body =
  `export const colors = ${JSON.stringify(colors, null, 2)} as const\n\n` +
  `export const typography = ${JSON.stringify(typography, null, 2)} as const\n\n` +
  `export const fonts = ${JSON.stringify(fonts, null, 2)} as const\n`

mkdirSync(outDir, { recursive: true })
writeFileSync(outPath, banner + body)
```

Hook it into the build lifecycle via `predev` and `prebuild` in `packages/web/astro/package.json`:

```json
{
  "scripts": {
    "sync-tokens": "node ../scripts/sync-tokens.mjs",
    "predev": "pnpm run sync-tokens",
    "prebuild": "pnpm run sync-tokens"
  }
}
```

Source: `packages/web/scripts/sync-tokens.mjs`, `packages/web/astro/package.json`

## When to Apply

- When `packages: ['packages/*']` glob does not reach sub-packages two levels deep
- When root-level `pnpm --filter` needs to target packages inside a directory that has no `package.json`

## Related

- Root `pnpm-workspace.yaml` — explicit deep sub-package entries
- `packages/web/scripts/sync-tokens.mjs` — token sync script
- `packages/web/astro/src/design/tokens.generated.ts` — generated token artifact
