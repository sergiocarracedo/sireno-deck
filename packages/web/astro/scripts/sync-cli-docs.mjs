#!/usr/bin/env node
// packages/web/astro/scripts/sync-cli-docs.mjs
//
// One-way data flow: packages/cli/docs is the source of truth for user /
// developer / reference documentation. Astro's docs collection only reads
// from src/content/docs/, so we rsync the MDX files in before dev/build.
//
// We do not import the cli/docs mdx files via a relative path or symlink
// because:
//   - Windows can't follow symlinks at the workspace boundary.
//   - Starlight's docsLoader globs src/content/docs/ at build time; using
//     a different path would mean rewriting the loader.
//
// Instead, we mirror the tree. Run on predev + prebuild so the build never
// sees a stale tree.

import {
  existsSync,
  mkdirSync,
  readdirSync,
  statSync,
  copyFileSync,
  rmSync,
} from "node:fs"
import { dirname, join, relative, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const here = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(here, "..", "..", "..", "..")
const sourceDir = resolve(repoRoot, "packages/cli/docs")
const targetDir = resolve(repoRoot, "packages/web/astro/src/content/docs")

if (!existsSync(sourceDir)) {
  console.error(`[sync-cli-docs] source not found: ${sourceDir}`)
  process.exit(1)
}

mkdirSync(targetDir, { recursive: true })

const visit = (src, dst) => {
  for (const name of readdirSync(src)) {
    const s = join(src, name)
    const d = join(dst, name)
    if (name.startsWith(".")) continue
    if (name === "node_modules") continue
    const st = statSync(s)
    if (st.isDirectory()) {
      mkdirSync(d, { recursive: true })
      visit(s, d)
    } else if (st.isFile() && /\.(md|mdx)$/i.test(name)) {
      copyFileSync(s, d)
    }
  }
}

const existing = readdirSync(targetDir)
for (const name of existing) {
  const full = join(targetDir, name)
  const rel = relative(sourceDir, join(sourceDir, name))
  if (!existsSync(join(sourceDir, rel))) {
    rmSync(full, { recursive: true, force: true })
  }
}

visit(sourceDir, targetDir)
console.log(`[sync-cli-docs] mirrored ${sourceDir} → ${targetDir}`)
