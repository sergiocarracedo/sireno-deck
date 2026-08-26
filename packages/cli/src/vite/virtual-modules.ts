import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import type { Plugin, ViteDevServer } from "vite"

export interface SirenoVitePluginTheme {
  name: string
  manifestPath: string
  uiOverridesPath: string | null
}

export interface SirenoVitePluginAddon {
  name: string
  frontend?: { main: string; styles?: string[] }
  buttons?: ReadonlyArray<{ type: string }>
  buttonTypes?: Readonly<Record<string, string>>
}

export interface SirenoVitePluginOptions {
  token?: string
  addons?: ReadonlyArray<SirenoVitePluginAddon>
  theme?: SirenoVitePluginTheme
}

const TOKEN_VIRTUAL_ID = "virtual:sireno/token"
const TOKEN_RESOLVED_ID = "\0virtual:sireno/token"

const ADDONS_VIRTUAL_ID = "virtual:sireno/addons"
const ADDONS_RESOLVED_ID = "\0virtual:sireno/addons"

const ADDONS_REGISTRY_VIRTUAL_ID = "virtual:sireno/addons/registry"
const ADDONS_REGISTRY_RESOLVED_ID = "\0virtual:sireno/addons/registry"

const THEME_VIRTUAL_ID = "virtual:sireno/theme.css"
const THEME_RESOLVED_ID = "\0virtual:sireno/theme.css"

const THEMES_MANIFEST_VIRTUAL_ID = "virtual:sireno/themes/manifest"
const THEMES_MANIFEST_RESOLVED_ID = "\0virtual:sireno/themes/manifest"

/**
 * Invalidate hooks registered by addon frontends. When a TSX file changes,
 * the addon can register a cleanup that runs before HMR swaps the module,
 * clearing intervals, animation frames, and event listeners that would
 * otherwise fire on stale state.
 *
 * Addon code calls:
 *   `__SIRENO_ADDON_CLEANUP__(addonName, () => clearInterval(id))`
 *
 * The plugin collects these per addon and invokes them whenever the
 * addon's main module is updated.
 */
const cleanupRegistry = new Map<string, Set<() => void>>()

export const __SIRENO_ADDON_CLEANUP__ = (
  addonName: string,
  cleanup: () => void,
): void => {
  const set = cleanupRegistry.get(addonName) ?? new Set<() => void>()
  set.add(cleanup)
  cleanupRegistry.set(addonName, set)
}

export const __SIRENO_RUN_ADDON_CLEANUPS__ = (addonName: string): number => {
  const set = cleanupRegistry.get(addonName)
  if (set === undefined || set.size === 0) return 0
  for (const cleanup of set) {
    try {
      cleanup()
    } catch {
      // cleanup may throw if the addon is in an intermediate state — ignore
    }
  }
  set.clear()
  return set.size
}

export const TOKEN_MODULE = (token: string): string =>
  `export const token = ${JSON.stringify(token)};\n`

const sanitizeIdentifier = (name: string): string => {
  const sanitized = name.replace(/[^a-zA-Z0-9_$]/g, "_")
  return /^[a-zA-Z_$]/.test(sanitized) ? sanitized : `_${sanitized}`
}

export const buildAddonsImports = (
  addons: ReadonlyArray<SirenoVitePluginAddon>,
): string => {
  const lines: string[] = []
  for (const addon of addons) {
    if (addon.frontend === undefined) continue
    lines.push(
      `import * as ${sanitizeIdentifier(addon.name)}_frontend from ${JSON.stringify(addon.frontend.main)};`,
    )
  }
  lines.push(
    `export const addons = ${JSON.stringify(
      addons
        .filter((a) => a.frontend !== undefined)
        .map((a) => ({
          name: a.name,
          main: a.frontend!.main,
          styles: a.frontend!.styles ?? [],
        })),
    )};`,
  )
  return lines.join("\n")
}

export const buildAddonsRegistryModule = (
  addons: ReadonlyArray<SirenoVitePluginAddon>,
): string => {
  const lines: string[] = []
  for (const addon of addons) {
    if (addon.frontend === undefined) continue
    if (addon.buttonTypes === undefined) continue
    const modName = sanitizeIdentifier(addon.name) + "_manifest"
    lines.push(
      `import * as ${modName} from ${JSON.stringify(addon.frontend.main)};`,
    )
  }
  lines.push("/* eslint-disable */")
  for (const addon of addons) {
    if (addon.frontend === undefined) continue
    if (addon.buttonTypes === undefined) continue
    const modName = sanitizeIdentifier(addon.name) + "_manifest"
    lines.push(
      `const ${modName}Obj = ${modName}.manifest ?? ${modName}.default;`,
    )
  }
  lines.push("export const addonRegistry = {")
  for (const addon of addons) {
    if (addon.frontend === undefined) continue
    if (addon.buttonTypes === undefined) continue
    const modName = sanitizeIdentifier(addon.name) + "_manifest"
    for (const [type, exportName] of Object.entries(addon.buttonTypes)) {
      lines.push(
        `  ${JSON.stringify(type)}: { addonName: ${JSON.stringify(addon.name)}, Component: (${modName}Obj.buttonTypes[${JSON.stringify(type)}] ?? ${modName}[${JSON.stringify(exportName)}] ?? ${modName}.default?.buttonTypes?.[${JSON.stringify(type)}])?.frontend, gestures: (${modName}Obj.buttonTypes[${JSON.stringify(type)}] ?? ${modName}[${JSON.stringify(exportName)}] ?? ${modName}.default?.buttonTypes?.[${JSON.stringify(type)}])?.backend?.gestureHandlers },`,
      )
      if (type === `${addon.name}:${addon.name}`) {
        lines.push(
          `  ${JSON.stringify(addon.name)}: { addonName: ${JSON.stringify(addon.name)}, Component: (${modName}Obj.buttonTypes[${JSON.stringify(type)}] ?? ${modName}[${JSON.stringify(exportName)}] ?? ${modName}.default?.buttonTypes?.[${JSON.stringify(type)}])?.frontend, gestures: (${modName}Obj.buttonTypes[${JSON.stringify(type)}] ?? ${modName}[${JSON.stringify(exportName)}] ?? ${modName}.default?.buttonTypes?.[${JSON.stringify(type)}])?.backend?.gestureHandlers },`,
        )
      }
    }
  }
  lines.push("};")
  return lines.join("\n")
}

export const readThemeCss = (themeDir: string | undefined): string => {
  if (!themeDir) return ""
  const cssPath = join(themeDir, ".sireno-deck", "theme.css")
  try {
    return readFileSync(cssPath, "utf8")
  } catch {
    return ""
  }
}

export const buildThemesManifestModule = (
  theme: SirenoVitePluginTheme | undefined,
): string => {
  if (!theme) {
    return `export const activeTheme = null;\nexport const colorTokens = null;\nexport const typography = null;\n`
  }

  let manifestData = "{}"
  try {
    manifestData = readFileSync(theme.manifestPath, "utf8")
  } catch {
    // ignore — manifest may not exist in all setups
  }

  const uiOverridesImport = theme.uiOverridesPath
    ? `import * as _uiOverrides from ${JSON.stringify(theme.uiOverridesPath)};`
    : null

  const uiOverridesBody =
    theme.uiOverridesPath !== null
      ? [
          `const _components = _uiOverrides?.components ?? {};`,
          `const _surfaces = _uiOverrides?.surfaces ?? {};`,
          `const _primitives = _uiOverrides?.primitives ?? {};`,
          `export const components = _components;`,
          `export const surfaces = _surfaces;`,
          `export const primitives = _primitives;`,
          `export { _uiOverrides as uiOverrides };`,
        ].join("\n")
      : [
          `export const components = null;`,
          `export const surfaces = null;`,
          `export const primitives = null;`,
          `export const uiOverrides = null;`,
        ].join("\n")

  return [
    uiOverridesImport,
    `const _manifest = JSON.parse(${JSON.stringify(manifestData)})`,
    `export const activeTheme = { name: ${JSON.stringify(theme.name)}, manifestPath: ${JSON.stringify(theme.manifestPath)}, uiOverridesPath: ${JSON.stringify(theme.uiOverridesPath)} };`,
    `export const colorTokens = _manifest.colorTokens ?? null;`,
    `export const typography = _manifest.typography ?? null;`,
    uiOverridesBody,
  ]
    .filter(Boolean)
    .join("\n")
}

/**
 * Node-only modules that can appear in third-party addon SOURCE graphs
 * served to the browser (the run pipeline hands vite each addon's
 * `src/index.ts` when it exists — see browserFrontendMain in run.ts).
 * Nothing on the render path invokes these; an inert stub keeps vite's
 * transform and ESM link checks happy.
 *
 * Named exports must cover every named import across all addon sources
 * (ESM link-time check fails on missing names). If a browser console
 * reports "does not provide an export named 'X'", add X here.
 */
const BROWSER_NODE_STUBS: ReadonlyArray<{
  specifier: string
  hasDefault: boolean
  names: ReadonlyArray<string>
}> = [
  { specifier: "chokidar", hasDefault: true, names: [] },
  { specifier: "execa", hasDefault: false, names: ["execa"] },
  {
    specifier: "@opencode-ai/sdk",
    hasDefault: false,
    names: ["createOpencodeClient"],
  },
  {
    specifier: "node:fs/promises",
    hasDefault: false,
    names: ["readFile", "readdir", "stat"],
  },
  { specifier: "node:path", hasDefault: false, names: ["join"] },
]

const nodeStubSource = ({
  hasDefault,
  names,
}: {
  hasDefault: boolean
  names: ReadonlyArray<string>
}): string => {
  const lines = [
    "// Generated by the sirenoDeck2 vite plugin — inert browser stub for a",
    "// Node-only dependency imported by third-party addon source graphs.",
    "// Never call these: they exist only so module evaluation succeeds.",
    "const noop = () => {}",
    "const proxy = new Proxy(noop, { get: () => noop })",
  ]
  if (hasDefault) lines.push("export default noop")
  for (const name of names) lines.push(`export const ${name} = noop`)
  return `${lines.join("\n")}\n`
}

const writeNodeDepStubs = (dir: string): void => {
  const stubDir = join(dir, "node-dep-stubs")
  if (!existsSync(stubDir)) mkdirSync(stubDir, { recursive: true })
  for (const stub of BROWSER_NODE_STUBS) {
    const fileName = `${stub.specifier.replace(/[^a-zA-Z0-9]/g, "-")}.js`
    writeFileSync(join(stubDir, fileName), nodeStubSource(stub), "utf8")
  }
}

export const sirenoDeck2 = (options: SirenoVitePluginOptions = {}): Plugin => {
  const token = options.token ?? ""
  const addons = options.addons ?? []
  const theme = options.theme
  const themeDir = process.env["SIRENO_THEME_DIR"]
  let themeCss = readThemeCss(themeDir)

  return {
    name: "sireno-deck",
    resolveId: (id) => {
      if (id === TOKEN_VIRTUAL_ID) return TOKEN_RESOLVED_ID
      if (id === ADDONS_VIRTUAL_ID) return ADDONS_RESOLVED_ID
      if (id === ADDONS_REGISTRY_VIRTUAL_ID) return ADDONS_REGISTRY_RESOLVED_ID
      if (id === THEME_VIRTUAL_ID) return THEME_RESOLVED_ID
      if (id === THEMES_MANIFEST_VIRTUAL_ID) return THEMES_MANIFEST_RESOLVED_ID
      return null
    },
    load: (id) => {
      if (id === TOKEN_RESOLVED_ID) return TOKEN_MODULE(token)
      if (id === ADDONS_RESOLVED_ID) return buildAddonsImports(addons)
      if (id === ADDONS_REGISTRY_RESOLVED_ID)
        return buildAddonsRegistryModule(addons)
      if (id === THEME_RESOLVED_ID) return readThemeCss(themeDir)
      if (id === THEMES_MANIFEST_RESOLVED_ID)
        return buildThemesManifestModule(theme)
      return null
    },
    configResolved: (config) => {
      const root = config.root ?? process.cwd()
      const dir = join(root, ".sireno-deck")
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
      writeNodeDepStubs(dir)
      if (themeCss.length === 0) return
      const filePath = join(dir, "theme.css")
      // Sireno-deck serves a local Stream Deck UI over loopback — every
      // byte ships through localhost, so Tailwind's "purge unused
      // utilities" optimization costs nothing to undo. Scan the entire
      // CLI package (frontend, emulator, shared ui, builtin addons)
      // plus each third-party addon's frontend directory so addon
      // authors can use any utility class without coordinating with
      // the Vite plugin.
      const cliPackage = join(root, "..")
      const sourceLines = [`@source "${cliPackage}/**/*.{ts,tsx}";\n`]
      const seenFrontendDirs = new Set<string>()
      for (const addon of addons) {
        const mainPath = addon.frontend?.main
        if (typeof mainPath !== "string" || mainPath.length === 0) continue
        const frontendDir = dirname(mainPath)
        if (seenFrontendDirs.has(frontendDir)) continue
        if (frontendDir.startsWith(cliPackage)) continue
        seenFrontendDirs.add(frontendDir)
        sourceLines.push(`@source "${frontendDir}/**/*.{ts,tsx}";\n`)
      }
      const sourceDirective = sourceLines.join("")
      writeFileSync(filePath, sourceDirective + themeCss, "utf8")
    },
    config: (config) => {
      // ponytail: never spread the incoming config — it carries `esbuild`
      // and `optimizeDeps.esbuildOptions` from earlier plugins
      // (`@vitejs/plugin-react`'s vite:react-babel hook). Re-emitting them
      // via our `config` return makes Vite attribute the deprecation
      // warnings to this plugin.
      const root = config.root ?? process.cwd()
      const dir = join(root, ".sireno-deck")
      const alias = (config.resolve?.alias ?? []) as Array<{
        find: string | RegExp
        replacement: string
      }>
      const extra: Array<{ find: string | RegExp; replacement: string }> = [
        ...BROWSER_NODE_STUBS.map(({ specifier }) => ({
          find: new RegExp(
            `^${specifier.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
          ),
          replacement: join(
            dir,
            "node-dep-stubs",
            `${specifier.replace(/[^a-zA-Z0-9]/g, "-")}.js`,
          ),
        })),
      ]
      if (themeCss.length > 0) {
        extra.push({
          find: /^sireno-deck-theme$/,
          replacement: join(dir, "theme.css"),
        })
      }
      return {
        resolve: {
          ...config.resolve,
          alias: [...alias, ...extra],
        },
      }
    },
    configureServer: (server: ViteDevServer) => {
      const signalReady = (): void => {
        const addr = server.httpServer?.address()
        const port = typeof addr === "object" && addr !== null ? addr.port : 0
        process.stdout.write(`READY ${port}\n`)
      }

      // ponytail: --remote gates HTTP access with the daemon's token. The
      // emulator/frontend vite is bound to 0.0.0.0 so any host on the LAN
      // can reach it; without this gate, anyone with the URL could load
      // the bundle and (via the bundle's baked token) replay commands on
      // the WS bridge. Accept the token via `?token=` query OR a
      // `sireno-token` cookie (the HTML page parses the URL token and sets
      // the cookie on first load so subsequent module/HMR requests stay
      // authenticated). Vite's HMR webSocket is exempt — it's a debug-only
      // surface and tying it to token would break dev refresh.
      const requiredToken = process.env["SIRENO_REQUIRE_TOKEN"]
      if (requiredToken !== undefined && requiredToken.length > 0) {
        const checkToken = (req: {
          url?: string
          headers?: Record<string, string | string[] | undefined>
        }): boolean => {
          const url = req.url ?? ""
          if (url.startsWith("/@vite/") || url.startsWith("/__vite_ping")) {
            return true
          }
          const queryIdx = url.indexOf("?")
          if (queryIdx !== -1) {
            const params = new URLSearchParams(url.slice(queryIdx + 1))
            if (params.get("token") === requiredToken) return true
          }
          const cookieHeader = req.headers?.["cookie"]
          if (typeof cookieHeader === "string") {
            for (const part of cookieHeader.split(";")) {
              const [rawName, ...rest] = part.trim().split("=")
              if (
                rawName === "sireno-token" &&
                rest.join("=") === requiredToken
              ) {
                return true
              }
            }
          }
          return false
        }
        server.middlewares.use((req, res, next) => {
          if (checkToken(req)) {
            next()
            return
          }
          res.statusCode = 403
          res.end("token required")
        })
      }

      server.httpServer?.once("listening", () => {
        // Wait for vite's dep optimizer to finish so the first browser
        // request doesn't hit a 504 "Outdated Optimize Dep" while deps
        // are still being pre-bundled.
        const warmup = async (): Promise<void> => {
          try {
            await server.warmupRequest("/index.html")
          } catch {
            // ignore warmup failures
          }
          try {
            await server.transformRequest("/src/main.tsx")
          } catch {
            // ignore transform failures
          }
          signalReady()
        }
        void warmup()
      })

      // Theme.css lives on disk and the daemon re-stages it when the
      // active theme changes. Watch the staged file and reload the
      // THEME_VIRTUAL_ID module so the browser gets the new CSS via
      // vite's HMR without a full reload.
      if (themeDir) {
        const stagedCss = join(themeDir, ".sireno-deck", "theme.css")
        if (existsSync(stagedCss)) {
          server.watcher.add(stagedCss)
          server.watcher.on("change", (file) => {
            if (file !== stagedCss) return
            themeCss = readThemeCss(themeDir)
            const mod = server.moduleGraph.getModuleById(THEME_RESOLVED_ID)
            if (mod) server.reloadModule(mod)
          })
        }
      }
    },
    // ponytail: --remote requires a way to authenticate subsequent module
    // requests after the HTML loads. Inject a small script that parses
    // `?token=X` from the URL and stores it in `document.cookie` so vite's
    // middleware accepts the cascade of `/src/...` and asset requests.
    transformIndexHtml: {
      order: "pre",
      handler: (html, ctx) => {
        if (process.env["SIRENO_REQUIRE_TOKEN"] === undefined) return html
        const script =
          `<script>(function(){try{var p=new URLSearchParams(location.search);` +
          `var t=p.get("token");if(t){document.cookie="sireno-token="+` +
          `encodeURIComponent(t)+"; path=/; SameSite=Lax";` +
          `p.delete("token");var q=p.toString();` +
          `var u=location.pathname+(q?"?"+q:"")+location.hash;` +
          `history.replaceState(null,"",u);}}catch(e){}})();</script>`
        return html.replace("<head>", `<head>${script}`)
      },
    },
    handleHotUpdate: ({ file, server }) => {
      // When an addon frontend file changes, run any registered cleanup
      // hooks BEFORE Vite swaps in the new module. This lets setInterval,
      // requestAnimationFrame, and event listeners be cleared in time to
      // prevent the old instance from calling state setters on the new
      // (or unmounted) React tree.
      let totalCleanups = 0
      for (const addon of addons) {
        if (addon.frontend === undefined) continue
        const frontendPath = addon.frontend.main
        const normalizedFile = file.replace(/\\/g, "/")
        const normalizedFrontend = frontendPath.replace(/\\/g, "/")
        if (
          !normalizedFile.endsWith(normalizedFrontend) &&
          !normalizedFile.includes(normalizedFrontend)
        )
          continue
        const cleared = __SIRENO_RUN_ADDON_CLEANUPS__(addon.name)
        if (cleared > 0) {
          server.config.logger.info(
            `[sireno-deck] cleared ${cleared} cleanup(s) for addon "${addon.name}" before HMR of ${normalizedFile}`,
          )
        }
        totalCleanups += cleared
      }
      // Always return undefined so Vite handles the HMR normally; the
      // cleanups are side effects, not module replacements.
      void totalCleanups
      return undefined
    },
  }
}
