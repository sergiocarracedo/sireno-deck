import { readFileSync, readdirSync } from "node:fs"
import { existsSync } from "node:fs"
import { dirname, join, resolve as resolvePath } from "node:path"
import { fileURLToPath } from "node:url"

import type { AddonPoller, AddonPollerChannel } from "@/addon/api-types"

export interface ScannedDeck {
  readonly id: string
  readonly paginated: boolean
  readonly buttons: number
  readonly internal: boolean
  readonly hasTrigger: boolean
  readonly generated?: boolean
  readonly isOverlay?: boolean
}

export interface ScannedAddon {
  readonly name: string
  readonly types: ReadonlyArray<string>
  /**
   * The module the DAEMON imports (Node). Its host-UI specifiers are stubbed
   * at build time so plain Node can load it for the manifest and global
   * service.
   */
  readonly frontendEntry: string | null
  /**
   * The module the BROWSER loads, when the addon ships a separate bundle.
   *
   * ponytail: these two were one field, set to `browserEntryPath ?? entryPath`.
   * The browser bundle deliberately leaves `@sirenodeck/sirenodeck/ui/*`
   * external, which Node cannot resolve — so the daemon's `import()` threw
   * into a silent catch, no button handler was registered, and every tap on
   * an addon button did nothing at all. They must stay separate.
   */
  readonly browserEntry?: string | null
  readonly publishIntervalMs: number | null
  readonly pollerEntry: string | null
  readonly buttonTypes: Readonly<Record<string, ScannedButtonType>>
  readonly deckTypes: Readonly<Record<string, string>>
  readonly source: "json" | "regex"
  readonly globalServiceEntry: string | null
  readonly decks: ReadonlyArray<ScannedDeck>
  readonly path?: string
  readonly internal?: boolean
  readonly defaultButton?: string | null
}

export interface ScannedButtonType {
  readonly exportName: string
  readonly internal: boolean
  readonly defaultConfig?: unknown
}

export interface AddonFrontendRef {
  readonly name: string
  readonly frontendEntry: string | null
}

const buildAddonByType = (
  scanned: ReadonlyArray<ScannedAddon>,
): Map<string, AddonFrontendRef> => {
  const map = new Map<string, AddonFrontendRef>()
  for (const addon of scanned) {
    for (const type of addon.types) {
      if (!map.has(type)) {
        map.set(type, { name: addon.name, frontendEntry: addon.frontendEntry })
      }
      if (type === `${addon.name}:${addon.name}` && !map.has(addon.name)) {
        map.set(addon.name, {
          name: addon.name,
          frontendEntry: addon.frontendEntry,
        })
      }
    }
  }
  return map
}

export const collectBuiltinAddonRegistry = async (): Promise<{
  scanned: ReadonlyArray<ScannedAddon>
  byType: Map<string, AddonFrontendRef>
}> => {
  const scanned = await scanBuiltinAddons()
  return { scanned, byType: buildAddonByType(scanned) }
}

const here = dirname(fileURLToPath(import.meta.url))

/**
 * Where the builtin addons live on disk, from wherever this module is running.
 *
 * ponytail: this used to be a single hard-coded hop — `../../builtin-addons` —
 * which is right only when the module runs from source at `src/cli/commands/`.
 * The published CLI runs the bundle at `dist/main.mjs`, where the same hop
 * lands on `<pkg>/../builtin-addons`: a path that does not exist. The scan
 * below then returned an empty array without a word, and the consequences were
 * entirely silent and entirely fatal to the deck — every builtin lost its
 * frontend entry, so it was absent from `SIRENO_ADDONS`, absent from the
 * frontend's `virtual:sireno/addons/registry`, and `ButtonSurface` rendered
 * `null` for it. The deck came up with blank keys, no error anywhere, and the
 * only buttons that survived were the hardcoded system ones and addons loaded
 * from an absolute path outside the package.
 *
 * The package ships `src/` beside `dist/` (see the `files` field in
 * package.json), so the sources are present in both layouts; only the number
 * of hops differs. Try each layout and take the one that is actually there.
 */
export const resolveBuiltinDir = (
  moduleDir: string,
  exists: (path: string) => boolean = existsSync,
): string => {
  const candidates = [
    // running from source: src/cli/commands → src/builtin-addons
    resolvePath(moduleDir, "..", "..", "builtin-addons"),
    // running from the bundle: dist → src/builtin-addons
    resolvePath(moduleDir, "..", "src", "builtin-addons"),
    // bundled alongside, if a future build ever emits them next to the entry
    resolvePath(moduleDir, "builtin-addons"),
  ]
  return candidates.find((candidate) => exists(candidate)) ?? candidates[0]!
}

export const builtinDir = resolveBuiltinDir(here)

/**
 * The text of the modules an entry file re-exports, one hop deep.
 *
 * ponytail: the regex scan used to read only the entry file itself, which is
 * empty of button types whenever the entry is a barrel — `system-status` and
 * `coding-agents` both just re-export `./manifest`. Those two addons have a
 * `sirenodeck.json`, so the JSON path was meant to cover them by importing the
 * entry and reading `buttonTypes` off the module. That works under tsx and
 * fails under the published bundle, because `await import()` on a `.ts` file
 * is not something plain node can do — and the failure is swallowed by a catch
 * that leaves the type list empty. The result was two addons whose buttons
 * rendered blank only in a real install, which is the worst place to find out.
 *
 * Reading the re-exported file's text needs no loader, so it works in both.
 * One hop is enough for a barrel and keeps this from walking a module graph.
 */
const reexportedSources = (addonDir: string, entrySource: string): string[] => {
  const out: string[] = []
  const seen = new Set<string>()
  for (const match of entrySource.matchAll(
    /(?:^|\n)\s*(?:export|import)\b[^"']*from\s*["'](\.[^"']+)["']/g,
  )) {
    const spec = match[1]
    if (spec === undefined || seen.has(spec)) continue
    seen.add(spec)
    const base = resolvePath(addonDir, spec)
    // TypeScript's ESM imports name the emitted `.js`, so `./manifest.js` is
    // `manifest.ts` on disk — `coding-agents` imports exactly that way, and
    // without the swap its barrel looked like it re-exported nothing.
    const withoutJs = base.replace(/\.(js|jsx|mjs|cjs)$/, "")
    for (const candidate of [
      base,
      `${base}.ts`,
      `${base}.tsx`,
      `${withoutJs}.ts`,
      `${withoutJs}.tsx`,
      join(base, "index.ts"),
      join(base, "index.tsx"),
    ]) {
      if (!existsSync(candidate)) continue
      try {
        out.push(readFileSync(candidate, "utf8"))
      } catch {
        // unreadable sibling — the entry's own text still stands
      }
      break
    }
  }
  return out
}

const scanAddonDir = async (
  addonDir: string,
  addonName: string,
): Promise<ScannedAddon | null> => {
  const jsonScanned = await scanAddonJsonManifest(addonDir, addonName)
  if (jsonScanned !== null && jsonScanned.types.length > 0) return jsonScanned
  const indexPath = join(addonDir, "index.ts")
  const indexTsxPath = join(addonDir, "index.tsx")
  // ponytail: the text fallback used to insist on an `index.ts`, so an addon
  // whose manifest names a different entry had no fallback at all — it simply
  // returned the empty JSON scan. `coding-agents` has no index.ts and declares
  // `manifest.ts`, which is why its two buttons were missing from the registry
  // in a published install while every other builtin recovered. When the
  // manifest names an entry, that is the file to read.
  const manifestEntry = jsonScanned?.frontendEntry ?? null
  const indexFile = existsSync(indexPath)
    ? indexPath
    : existsSync(indexTsxPath)
      ? indexTsxPath
      : manifestEntry !== null && existsSync(manifestEntry)
        ? manifestEntry
        : null
  if (indexFile === null) return jsonScanned
  let raw: string
  try {
    raw = readFileSync(indexFile, "utf8")
  } catch {
    return jsonScanned
  }
  const allSources = [raw, ...reexportedSources(dirname(indexFile), raw)]
  const scanFrom = (source: string): Set<string> => {
    const out = new Set<string>()
    for (const m of source.matchAll(
      /type:\s*["']([a-z0-9-]+:[a-z0-9-]+)["']/gi,
    )) {
      if (m[1] !== undefined) out.add(m[1])
    }
    for (const m of source.matchAll(
      /["']([a-z0-9-]+:[a-z0-9-]+)["']\s*:\s*\{/g,
    )) {
      if (m[1] !== undefined) out.add(m[1])
    }
    return out
  }
  // Scan the re-exported modules too: a barrel entry declares no types of its
  // own, which is exactly how `system-status` and `coding-agents` came up empty.
  const types = new Set<string>()
  for (const source of allSources)
    for (const type of scanFrom(source)) types.add(type)
  let publishIntervalMs: number | null = null
  for (const src of allSources) {
    const match = src.match(/publishIntervalMs:\s*(\d+)/)
    if (match !== null) {
      publishIntervalMs = Number.parseInt(match[1]!, 10)
      break
    }
  }
  const pollerEntry = existsSync(join(addonDir, "poller.ts"))
    ? join(addonDir, "poller.ts")
    : null
  // Across every source, for the same reason as the type scan: a barrel entry
  // declares nothing itself, and `system-status` keeps its globalService in
  // `manifest.ts`. Testing only the entry text left it with no backend at all,
  // so its buttons rendered but never received a metric to show.
  const hasGlobalService = allSources.some((source) =>
    /\bglobalService\b/.test(source),
  )
  if (types.size === 0 && pollerEntry === null && !hasGlobalService)
    return jsonScanned
  const buttonTypes: Record<string, ScannedButtonType> = {}
  const entryMapRegex =
    /["']([a-z0-9-]+:[a-z0-9-]+)["']\s*:\s*\{\s*(?=[^}]*frontend\s*:\s*([A-Za-z_$][A-Za-z0-9_$]*))/g
  for (const src of allSources) {
    for (const m of src.matchAll(entryMapRegex)) {
      const type = m[1]
      const exportName = m[2]
      if (
        type !== undefined &&
        exportName !== undefined &&
        !buttonTypes[type]
      ) {
        buttonTypes[type] = { exportName, internal: false }
      }
    }
  }
  return {
    name: addonName,
    types: [...types],
    frontendEntry: indexFile,
    publishIntervalMs,
    pollerEntry,
    buttonTypes,
    deckTypes: {},
    source: "regex",
    // ponytail: prefer a dedicated global-entry.ts — index.ts is imported by
    // the frontend's virtual addons/registry, so a global backend reachable
    // from it puts node builtins in the browser graph and crashes the app.
    // A global-entry.ts next to index.ts keeps the node side out of the
    // browser bundle entirely.
    globalServiceEntry: existsSync(join(addonDir, "global-entry.ts"))
      ? join(addonDir, "global-entry.ts")
      : hasGlobalService && indexFile !== null
        ? indexFile
        : null,
    decks: [],
    internal: true,
    path: addonDir,
  }
}

const scanAddonJsonManifest = async (
  addonDir: string,
  addonName: string,
): Promise<ScannedAddon | null> => {
  const jsonPath = join(addonDir, "sirenodeck.json")
  if (!existsSync(jsonPath)) return null
  let raw: unknown
  try {
    raw = JSON.parse(readFileSync(jsonPath, "utf8")) as unknown
  } catch {
    return null
  }
  if (raw === null || typeof raw !== "object") return null
  const obj = raw as Record<string, unknown>
  if (obj["kind"] !== "addon") return null
  if (obj["apiVersion"] !== 1) return null
  const name = obj["name"]
  const entry = obj["entry"]
  if (typeof name !== "string" || typeof entry !== "string") return null
  if (name !== addonName) return null

  const entryPath = resolvePath(addonDir, entry)
  const types = new Set<string>()
  const buttonTypes: Record<string, ScannedButtonType> = {}
  let publishIntervalMs: number | null = null
  let hasGlobalService = false
  const decks: Array<{
    id: string
    hasTrigger: boolean
    paginated: boolean
    buttons: number
    internal: boolean
  }> = []
  try {
    const mod = (await import(entryPath)) as {
      default?: {
        buttonTypes?: Record<string, unknown>
        decks?: unknown
        publishIntervalMs?: number
        globalService?: unknown
      }
    }
    const exported =
      mod !== null &&
      typeof mod === "object" &&
      "default" in mod &&
      mod.default !== undefined
        ? mod.default
        : mod
    const candidate =
      exported !== null && typeof exported === "object"
        ? (exported as {
            buttonTypes?: Record<string, unknown>
            decks?: unknown
            publishIntervalMs?: number
            globalService?: unknown
          })
        : null
    if (candidate !== null) {
      for (const [type, def] of Object.entries(candidate.buttonTypes ?? {})) {
        types.add(type)
        const d = def as Record<string, unknown> | null
        const service =
          d !== null && typeof d === "object"
            ? (d["service"] as Record<string, unknown> | undefined)
            : undefined
        const internal =
          service?.["internal"] === true || d?.["internal"] === true
        buttonTypes[type] = { exportName: "default", internal }
      }
      if (typeof candidate.publishIntervalMs === "number") {
        publishIntervalMs = candidate.publishIntervalMs
      }
      if (candidate.globalService !== undefined) {
        hasGlobalService = true
      }
      if (candidate.decks !== null && typeof candidate.decks === "object") {
        const isArray = Array.isArray(candidate.decks)
        if (isArray) {
          for (const entry of candidate.decks as Array<
            Record<string, unknown>
          >) {
            if (entry === null || typeof entry !== "object") continue
            // Static entry: { id: string, buttons?: [], trigger?: {...}, ... }
            if (
              typeof entry["id"] === "string" &&
              entry["createDeck"] === undefined &&
              entry["createDecks"] === undefined
            ) {
              const trigger = entry["trigger"] as
                | Record<string, unknown>
                | undefined
              const hasTrigger =
                trigger !== undefined &&
                (trigger["process_name"] !== undefined ||
                  trigger["window_name"] !== undefined)
              decks.push({
                id: entry["id"] as string,
                hasTrigger,
                paginated: entry["paginated"] === true,
                buttons: Array.isArray(entry["buttons"])
                  ? (entry["buttons"] as unknown[]).length
                  : 0,
                internal: entry["internal"] === true,
              })
              continue
            }
            // Single-dynamic: { createDeck: fn } — id is the entry's id field
            if (
              typeof entry["createDeck"] === "function" &&
              typeof entry["id"] === "string"
            ) {
              const trigger = entry["trigger"] as
                | Record<string, unknown>
                | undefined
              const hasTrigger =
                trigger !== undefined &&
                (trigger["process_name"] !== undefined ||
                  trigger["window_name"] !== undefined)
              decks.push({
                id: entry["id"] as string,
                hasTrigger,
                paginated: entry["paginated"] === true,
                buttons: 0,
                internal: entry["internal"] === true,
              })
              continue
            }
            // Multi-dynamic: { createDecks: fn } — id unknown without calling it; skip
          }
        } else {
          // Legacy Record<string, AddonDeckDefinition> form
          for (const [deckId, deckDef] of Object.entries(
            candidate.decks as Record<string, unknown>,
          )) {
            if (deckDef === null || typeof deckDef !== "object") continue
            const d = deckDef as Record<string, unknown>
            const trigger = d["trigger"] as Record<string, unknown> | undefined
            const hasTrigger =
              trigger !== undefined &&
              (trigger["process_name"] !== undefined ||
                trigger["window_name"] !== undefined)
            const paginated = d["paginated"] === true
            const buttonCount = Array.isArray(d["buttons"])
              ? d["buttons"].length
              : 0
            const deckInternal = d["internal"] === true
            decks.push({
              id: deckId,
              hasTrigger,
              paginated,
              buttons: buttonCount,
              internal: deckInternal,
            })
          }
        }
      }
    }
  } catch {
    // Fall through with empty types — caller will fall back to regex scan.
  }

  return {
    name: addonName,
    types: [...types],
    frontendEntry: entryPath,
    publishIntervalMs,
    pollerEntry: null,
    buttonTypes,
    deckTypes: {},
    source: "json",
    // ponytail: prefer a dedicated global-entry.ts when present (mirrors the
    // regex path's rule at line 153). A browser-safe manifest can't export a
    // node-only globalService, so this entry file is where it lives.
    globalServiceEntry: existsSync(join(addonDir, "global-entry.ts"))
      ? join(addonDir, "global-entry.ts")
      : hasGlobalService
        ? entryPath
        : null,
    decks,
    internal: true,
    path: addonDir,
  }
}

const scanBuiltinAddons = async (): Promise<ReadonlyArray<ScannedAddon>> => {
  if (!existsSync(builtinDir)) {
    // Never normal: without these the deck renders blank keys. Say so loudly
    // rather than returning an empty list and letting the UI explain it.
    process.emitWarning(
      `sirenodeck: builtin addons not found at ${builtinDir} — every builtin button will render empty`,
      "SirenoDeckBuiltinsMissing",
    )
    return []
  }
  const entries = readdirSync(builtinDir, { withFileTypes: true })
  const out: ScannedAddon[] = []
  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    const scanned = await scanAddonDir(join(builtinDir, entry.name), entry.name)
    if (scanned !== null) out.push(scanned)
  }
  return out
}

export interface ButtonValidationIssue {
  readonly addon: string
  readonly button: string
  readonly message: string
}

const validateButtonConfigExport = (
  addonName: string,
  buttonDir: string,
  buttonName: string,
): ButtonValidationIssue | null => {
  const backendPath = join(buttonDir, "backend.ts")
  const configPath = join(buttonDir, "config.ts")

  if (!existsSync(backendPath)) {
    return {
      addon: addonName,
      button: buttonName,
      message: "missing backend.ts",
    }
  }
  if (!existsSync(configPath)) {
    return {
      addon: addonName,
      button: buttonName,
      message: "missing config.ts",
    }
  }

  let backendSrc: string
  try {
    backendSrc = readFileSync(backendPath, "utf8")
  } catch {
    return {
      addon: addonName,
      button: buttonName,
      message: "could not read backend.ts",
    }
  }

  const usesAddonButtonService =
    /import\s+type\s+\{[^}]*AddonButtonService[^}]*\}\s+from\s+["']@\/addon\/api["']/.test(
      backendSrc,
    )
  if (usesAddonButtonService) return null

  if (
    !/import\s*\{[^}]*\bconfigSchema\b[^}]*\}\s*from\s*["']\.\/config(\.js)?["']/.test(
      backendSrc,
    )
  ) {
    return {
      addon: addonName,
      button: buttonName,
      message: 'backend.ts does not import { configSchema } from "./config"',
    }
  }

  let configSrc: string
  try {
    configSrc = readFileSync(configPath, "utf8")
  } catch {
    return {
      addon: addonName,
      button: buttonName,
      message: "could not read config.ts",
    }
  }

  if (!/export\s+const\s+configSchema\b/.test(configSrc)) {
    return {
      addon: addonName,
      button: buttonName,
      message: 'config.ts does not export "configSchema" as a named const',
    }
  }

  return null
}

export const validateBuiltinButtonConfigs =
  (): ReadonlyArray<ButtonValidationIssue> => {
    if (!existsSync(builtinDir)) return []
    const issues: ButtonValidationIssue[] = []
    for (const addonEntry of readdirSync(builtinDir, { withFileTypes: true })) {
      if (!addonEntry.isDirectory()) continue
      const addonName = addonEntry.name
      const addonDir = join(builtinDir, addonName)
      const buttonsDir = join(addonDir, "buttons")
      if (!existsSync(buttonsDir)) continue
      for (const btnEntry of readdirSync(buttonsDir, { withFileTypes: true })) {
        if (!btnEntry.isDirectory()) continue
        const btnDir = join(buttonsDir, btnEntry.name)
        if (!existsSync(join(btnDir, "backend.ts"))) continue
        const issue = validateButtonConfigExport(
          addonName,
          btnDir,
          btnEntry.name,
        )
        if (issue !== null) issues.push(issue)
      }
    }
    return issues
  }

const matchesManifest = (
  publishIntervalMs: number | null,
  addonName: string,
): boolean => {
  if (publishIntervalMs === null) return false
  return Boolean(addonName)
}

export interface DiscoveredAddonPoller {
  readonly addonName: string
  readonly channels: ReadonlyArray<AddonPollerChannel>
}

export interface AddonPollerDependencies {
  readonly executor?: unknown
  readonly mediaProvider?: unknown
  readonly brightnessProvider?: unknown
}

export const discoverAddonPollers = async (
  deps: AddonPollerDependencies,
  scanned: ReadonlyArray<ScannedAddon>,
): Promise<ReadonlyArray<DiscoveredAddonPoller>> => {
  const out: DiscoveredAddonPoller[] = []
  for (const addon of scanned) {
    if (addon.pollerEntry === null) continue
    if (!matchesManifest(addon.publishIntervalMs, addon.name)) continue
    try {
      const mod = (await import(addon.pollerEntry)) as {
        createPoller?: (deps: AddonPollerDependencies) => AddonPoller
      }
      if (typeof mod.createPoller !== "function") continue
      const poller = mod.createPoller(deps)
      if (poller.channels.length === 0) continue
      out.push({ addonName: addon.name, channels: poller.channels })
    } catch {
      // Poller failed to load; skip.
    }
  }
  return out
}

export { scanBuiltinAddons }
