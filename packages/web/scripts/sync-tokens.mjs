#!/usr/bin/env node
// sync-tokens.mjs
// Reads packages/cli/src/themes/default/sirenodeck.json (READ-ONLY across the
// workspace boundary) and writes astro/src/design/tokens.generated.ts.
//
// One-way data flow: source of truth stays in packages/cli. The marketing
// site mirrors a typed snapshot for type-safe token consumption.
//
// Usage:  node scripts/sync-tokens.mjs
// Or:     pnpm --filter sirenodeck-web-astro sync-tokens

import { readFileSync, writeFileSync, mkdirSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, "..", "..", "..")
const sourcePath = resolve(root, "packages/cli/src/themes/default/sirenodeck.json")
const outDir = resolve(here, "..", "astro/src/design")
const outPath = resolve(outDir, "tokens.generated.ts")

const theme = JSON.parse(readFileSync(sourcePath, "utf8"))

const colors = theme.colorTokens ?? {}
const typography = theme.typography ?? {}
const fonts = theme.fonts ?? []

const banner = `// GENERATED — DO NOT EDIT.
// Source: packages/cli/src/themes/default/sirenodeck.json
// Regenerate: node scripts/sync-tokens.mjs

`

const body =
  `export const colors = ${JSON.stringify(colors, null, 2)} as const\n\n` +
  `export const typography = ${JSON.stringify(typography, null, 2)} as const\n\n` +
  `export const fonts = ${JSON.stringify(fonts, null, 2)} as const\n`

mkdirSync(outDir, { recursive: true })
writeFileSync(outPath, banner + body)

console.log(`tokens.generated.ts written from ${sourcePath}`)
