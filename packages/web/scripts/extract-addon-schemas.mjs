#!/usr/bin/env node
// packages/web/scripts/extract-addon-schemas.mjs
//
// Single source of truth for per-button config schemas: the Zod
// `configSchema` exported by each addon button's config.ts.
//
// Runs under tsx so TypeScript + `@/` path aliases resolve naturally
// (tsconfig nearest to each imported file wins):
//
//   cd packages/cli && pnpm exec tsx ../web/scripts/extract-addon-schemas.mjs
//
// Output: packages/web/astro/src/content/buttonSchemas.json
//   { "<addon>:<button>": { "example": <yaml-safe object>, "jsonSchema": {...} } }
//
// ponytail: parses manifests TEXTUALLY (regex on buttonTypes blocks) rather
// than importing them — importing a manifest pulls its React frontend module
// graph, which only resolves inside the daemon's Vite pipeline. Text parse
// of two regexes is the whole surface we need.

import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  readdirSync,
  statSync,
  existsSync,
} from "node:fs"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { z } from "zod"

const here = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(here, "..", "..", "..")
const outPath = resolve(
  repoRoot,
  "packages/web/astro/src/content/buttonSchemas.json",
)

const BUILTIN_ROOT = resolve(repoRoot, "packages/cli/src/builtin-addons")
const NPM_ADDON_GLOBS = [
  resolve(repoRoot, "packages/addons/pomodoro"),
  // app-shortcuts ships decks without config.ts; harmless to scan
  resolve(repoRoot, "packages/addons/app-shortcuts"),
]

const INTERNAL_ADDONS = new Set(["internal-settings", "test-buildin"])

const walkTs = (dir, acc = []) => {
  if (!existsSync(dir)) return acc
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    const st = statSync(full)
    if (st.isDirectory()) walkTs(full, acc)
    else if (/\.tsx?$/.test(name)) acc.push(full)
  }
  return acc
}

/**
 * Given an addon entry file (index.ts / manifest.ts) and the addon's root,
 * map every declared buttonType key to the directory of its frontend import,
 * e.g. "date-time:time" → "buttons/time". Falls back to empty map when the
 * block can't be parsed.
 */
const parseButtonTypes = (entryFile) => {
  const text = readFileSync(entryFile, "utf8")
  const varToDir = new Map()
  // Matches both `./buttons/x/frontend` and `./buttons/x/frontend.js`
  const reImport =
    /import\s+(?:type\s+)?(\w+)\s+from\s+"(\.\/[^"]*buttons\/[^"]*)"/g
  let m
  while ((m = reImport.exec(text)) !== null) {
    varToDir.set(m[1], m[2])
  }

  const map = {}
  const reBlock = /"([a-z0-9-]+:[a-z0-9:-]+)":\s*\{/g
  while ((m = reBlock.exec(text)) !== null) {
    const key = m[1]
    // Take a window after the key; find first `frontend: <ident>` and map it.
    const win = text.slice(m.index, m.index + 800)
    const fe = /frontend:\s*(?:[^,\n]*?\s+as\s+\w+\s*:\s*)?(\w+)/.exec(win)
    if (!fe) continue
    const rawDir = varToDir.get(fe[1])
    if (!rawDir) continue
    map[key] = rawDir.replace(/\/frontend(\.js)?$/, "").replace(/\.js$/, "")
  }
  return map
}

const schemaForConfig = async (addonRoot, relDir) => {
  const configPath = join(addonRoot, relDir, "config.ts")
  if (!existsSync(configPath)) return null
  try {
    const mod = await import(`file://${configPath}`)
    // Export name varies: configSchema, <button>ConfigSchema…
    const exportKey = Object.keys(mod).find(
      (k) => /^configSchema$/i.test(k) || /configschema$/i.test(k),
    )
    const schema = exportKey ? mod[exportKey] : mod.default?.configSchema
    if (!schema || typeof schema.safeParse !== "function") {
      if (process.env.DEBUG_SCHEMAS) {
        console.warn(
          `[schema] no zod export in ${relDir}/config.ts: exports=${Object.keys(mod).join(",")}`,
        )
      }
      return null
    }

    const jsonSchema = z.toJSONSchema(schema, {
      io: "input",
      unrepresentable: "any",
      override: (ctx) => {
        // Drop noisy $schema keys at every level — the site renders this as YAML.
        delete ctx.zodSchema.description ?? undefined
      },
    })
    delete jsonSchema.$schema

    // Simple example: defaults via safeParse of {} where fields are optional;
    // for required enum/string fields emit placeholder markers consumed by UI.
    const parsed = schema.safeParse({})
    const example = parsed.success ? stripUndefined(parsed.data) : {}

    return { jsonSchema, example }
  } catch (err) {
    console.warn(`[schema] ${relDir}: ${err.message}`)
    return null
  }
}

const stripUndefined = (obj) => {
  if (obj === null || typeof obj !== "object") return obj
  if (Array.isArray(obj)) return obj.map(stripUndefined)
  const out = {}
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined) continue
    out[k] = stripUndefined(v)
  }
  return out
}

const main = async () => {
  const result = {}

  // Builtin addons: one subdir each with an index.ts or manifest.ts.
  for (const name of readdirSync(BUILTIN_ROOT)) {
    const addonRoot = join(BUILTIN_ROOT, name)
    if (!statSync(addonRoot).isDirectory()) continue
    if (INTERNAL_ADDONS.has(name)) continue
    // Prefer the file actually declaring buttonTypes — some addons split a
    // thin index.ts re-exporting manifest.ts.
    const candidates = ["manifest.ts", "index.ts"]
      .map((f) => join(addonRoot, f))
      .filter((f) => existsSync(f))
    const entry =
      candidates.find((f) => readFileSync(f, "utf8").includes("buttonTypes")) ??
      candidates[0]
    if (!entry) continue

    const typeMap = parseButtonTypes(entry)
    if (process.env.DEBUG_SCHEMAS) {
      console.log(
        `[debug] ${name} entry=${entry.split("/").pop()} types=${Object.keys(typeMap).join(",") || "(none)"}`,
      )
    }
    for (const [typeId, dir] of Object.entries(typeMap)) {
      const info = await schemaForConfig(addonRoot, dir)
      if (info) result[typeId] = info
    }

    // system-status keeps its schemas inline in manifest.ts, no buttons/config.ts
    if (name === "system-status") {
      try {
        const mod = await import(`file://${join(addonRoot, "manifest.ts")}`)
        for (const exp of [
          "systemStatusConfigSchema",
          "SystemStatusConfigSchema",
          "configSchema",
        ]) {
          if (mod[exp]) {
            const jsonSchema = z.toJSONSchema(mod[exp], {
              io: "input",
              unrepresentable: "any",
            })
            delete jsonSchema.$schema
            for (const key of Object.keys(typeMap).filter((k) =>
              k.startsWith("system-status:"),
            )) {
              result[key] ??= {
                jsonSchema,
                example: { pages: [{ type: "bars", metrics: ["cpu"] }] },
              }
            }
          }
        }
      } catch (err) {
        console.warn(`[schema] system-status inline: ${err.message}`)
      }
    }
  }

  // npm addons under packages/addons/*
  for (const addonRoot of NPM_ADDON_GLOBS) {
    if (!existsSync(addonRoot)) continue
    const pkg = JSON.parse(
      readFileSync(join(addonRoot, "package.json"), "utf8"),
    )
    const entry = ["manifest.ts", "index.ts"]
      .map((f) => join(addonRoot, "src", f))
      .find((f) => existsSync(f))
    if (!entry) continue
    const typeMap = parseButtonTypes(entry)
    for (const [typeId, dir] of Object.entries(typeMap)) {
      // npm addons keep sources under src/, manifests reference ./buttons/...
      const info = await schemaForConfig(join(addonRoot), join("src", dir))
      if (info) result[typeId] = info
    }
  }

  mkdirSync(dirname(outPath), { recursive: true })
  writeFileSync(`${outPath}`, `${JSON.stringify(result, null, 2)}\n`)
  console.log(
    `[schemas] wrote ${Object.keys(result).length} entries → ${outPath}`,
  )
  console.log(`[schemas] keys: ${Object.keys(result).sort().join(", ")}`)
}

main().catch((err) => {
  console.error("[fatal]", err)
  process.exit(1)
})
