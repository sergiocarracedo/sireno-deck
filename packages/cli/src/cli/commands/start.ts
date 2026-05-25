import { watch } from "node:fs"
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http"
import type { AddressInfo } from "node:net"
import { basename, dirname } from "node:path"

import type pino from "pino"

import { loadConfiguredAddons } from "../../addon/loader.js"
import { setDomAssetPathResolver } from "../../addon/api.js"
import { AddonManifestError } from "../../addon/manifest.js"
import { createBundledAddonRegistry, loadBootstrapConfig, loadConfigWithSources } from "../../config/loader.js"
import { resolveTheme, type Theme } from "../../config/theme.js"
import { ConfigValidationError } from "../../core/schemas.js"
import { createDeckRuntime } from "../../deck/runtime.js"
import {
  createStreamDeckLifecycle,
  createVirtualStreamDeckLifecycle,
  replayLastRenderedBuffers,
  StreamDeckSelectionError,
  writeKeyBuffer,
} from "../../device/stream-deck.js"
import { formatLinuxUdevAccessError } from "../../device/linux-udev.js"
import { createBrowserRenderer } from "../../render/browser-renderer.js"
import { renderDomDeck } from "../../render/dom-host.js"
import type { RuntimeRenderButton } from "../../deck/runtime.js"

import { resolveHostContext } from "../../system/host-context.js"
import { createSessionMonitor } from "../../system/session-monitor.js"
import { formatConfigError } from "../../util/errors.js"
import {
  isRunning,
  readPid,
  removePidFile,
  setupSignalHandlers,
  writePid,
} from "../../util/daemon.js"

import type { BrowserRenderer } from "../../render/browser-renderer.js"

export interface StartOptions {
  config?: string
  logger: pino.Logger
}

export interface EmulatorStartOptions extends StartOptions {
  keyCount?: number
  port?: number
}

export interface EmulatorSession {
  close: () => Promise<void>
  port: number
  url: string
}

interface EmulatorSurfaceState {
  html: string
  updatedAt: string | null
  version: number
}

const CONFIG_RELOAD_DEBOUNCE_MS = 75

export async function loadRuntimeConfig(options: StartOptions) {
  const sessionMonitor = await createSessionMonitor()

  try {
    const hostContext = await resolveHostContext(undefined, sessionMonitor.getSnapshot())
    const bootstrap = loadBootstrapConfig(options.config, hostContext)
    const registry = createBundledAddonRegistry()
    const addonLoadResult = await loadConfiguredAddons({
      addons: bootstrap.config.addons,
      cwd: bootstrap.cwd,
      registry,
    })

    for (const warning of addonLoadResult.warnings) {
      options.logger.warn({ addonName: warning.addonName, reason: warning.reason }, "skipping addon after startup warning")
    }

    if (sessionMonitor.getSnapshot().capability === "unsupported") {
      options.logger.warn(
        { platform: process.platform },
        "session lock monitoring unavailable on this host; continuing without lock-aware deck switching",
      )
    }

    const loadedConfig = loadConfigWithSources(bootstrap.filePath, registry, hostContext)
    const theme = await resolveTheme(loadedConfig.config.theme, { baseDirectory: dirname(loadedConfig.filePath) })

    return {
      config: loadedConfig.config,
      configDirectory: dirname(loadedConfig.filePath),
      filePaths: [...loadedConfig.filePaths, ...theme.filePaths],
      hostContext,
      registry,
      sessionMonitor,
      theme,
    }
  } catch (error) {
    await sessionMonitor.stop()
    throw error
  }
}

export function watchConfigFiles(filePaths: readonly string[], onChange: () => void): () => void {
  const uniqueFilePaths = Array.from(new Set(filePaths))
  const watchers = uniqueFilePaths.map((filePath) => watch(filePath, { persistent: false }, () => {
    scheduleReload()
  }))
  let reloadTimer: NodeJS.Timeout | undefined

  function scheduleReload(): void {
    if (reloadTimer) {
      clearTimeout(reloadTimer)
    }

    reloadTimer = setTimeout(() => {
      reloadTimer = undefined
      onChange()
    }, CONFIG_RELOAD_DEBOUNCE_MS)
  }

  return () => {
    if (reloadTimer) {
      clearTimeout(reloadTimer)
      reloadTimer = undefined
    }

    for (const watcher of watchers) {
      watcher.close()
    }
  }
}

export async function restoreReloadNavigation(
  runtime: ReturnType<typeof createDeckRuntime>,
  previousStack: readonly string[],
  previousActiveDeckId: string,
  mainDeckId: string,
): Promise<void> {
  const candidateStacks: string[][] = []

  if (previousStack.length > 0) {
    candidateStacks.push([...previousStack])
  }

  candidateStacks.push([previousActiveDeckId])

  if (previousActiveDeckId !== mainDeckId) {
    candidateStacks.push([mainDeckId])
  }

  for (const candidateStack of candidateStacks) {
    try {
      await runtime.restoreStack(candidateStack)
      return
    } catch {
      continue
    }
  }
}

export function createTemporaryConfigErrorLines(error: ConfigValidationError): string[] {
  const location = error.filePath
    ? `${basename(error.filePath)}${error.lineNumber !== undefined ? `:${error.lineNumber}` : ""}`
    : "config.yml"

  return [
    location,
    error.message,
    error.suggestion ?? "Fix the config and save again.",
  ]
}

export function isDomRenderButton(button: RuntimeRenderButton): button is RuntimeRenderButton & { content: NonNullable<RuntimeRenderButton["content"]> } {
  return button.content !== undefined
}

function createDeckHtml(
  keyCount: number,
  deckButtons: Array<RuntimeRenderButton & { content: NonNullable<RuntimeRenderButton["content"]> }>,
  theme?: Theme,
): string {
  return renderDomDeck(deckButtons.map((button) => ({
    content: button.content,
    ...(button.full_surface !== undefined ? { full_surface: button.full_surface } : {}),
    keyIndex: button.keyIndex,
    ...(button.sample_interval_ms !== undefined ? { sample_interval_ms: button.sample_interval_ms } : {}),
  })), {
    keyCount,
    theme,
  })
}

export async function ensureBrowserRenderer(
  browserRenderer: BrowserRenderer | null,
  keyCount: number,
): Promise<BrowserRenderer> {
  if (browserRenderer) {
    return browserRenderer
  }

  const nextBrowserRenderer = createBrowserRenderer({ keyCount })
  try {
    await nextBrowserRenderer.start()
    return nextBrowserRenderer
  } catch (error) {
    await nextBrowserRenderer.close().catch(() => {})
    throw error
  }
}

async function renderDomDeckSurface(
  connection: NonNullable<ReturnType<ReturnType<typeof createStreamDeckLifecycle>["getConnection"]>>,
  deckButtons: Array<RuntimeRenderButton & { content: NonNullable<RuntimeRenderButton["content"]> }>,
  browserRenderer: BrowserRenderer,
  logger: pino.Logger,
  theme?: Theme,
): Promise<void> {
  await browserRenderer.updateDeck(createDeckHtml(connection.info.keyCount, deckButtons, theme))

  const buffersByKey = await browserRenderer.captureKeyBuffers()
  for (const [keyIndex, buffer] of buffersByKey.entries()) {
    await writeKeyBuffer(connection, keyIndex, buffer)
  }

  logger.info({ deckId: "main deck", renderedKeys: Array.from(buffersByKey.keys()).sort((left, right) => left - right) }, "rendered browser-backed main deck")
}

export async function renderRuntimeDeckSurface(
  connection: NonNullable<ReturnType<ReturnType<typeof createStreamDeckLifecycle>["getConnection"]>>,
  buttons: RuntimeRenderButton[],
  browserRenderer: BrowserRenderer,
  logger: pino.Logger,
  theme?: Theme,
): Promise<void> {
  if (buttons.length > 0 && !buttons.every(isDomRenderButton)) {
    throw new Error("Runtime deck rendering must provide DOM-backed button content")
  }

  await renderDomDeckSurface(connection, buttons.filter(isDomRenderButton), browserRenderer, logger, theme)
}

function renderEmulatorShellHtml(): string {
  return [
    "<!doctype html>",
    "<html lang=\"en\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">",
    "<title>Sireno Deck Emulator</title>",
    "<style>",
    ":root{color-scheme:dark;font-family:'IBM Plex Sans', 'Aptos', sans-serif;background:#121418;color:#eef2f7}",
    "body{margin:0;min-height:100vh;background:radial-gradient(circle at top,#1f2530 0,#121418 55%);color:inherit}",
    ".shell{display:grid;gap:24px;grid-template-columns:minmax(280px,360px) minmax(320px,1fr);padding:24px}",
    ".panel{background:rgba(11,15,21,.84);border:1px solid rgba(125,211,252,.18);border-radius:18px;box-shadow:0 18px 40px rgba(0,0,0,.28);padding:20px}",
    ".eyebrow{color:#7dd3fc;font-family:'IBM Plex Mono','Cascadia Code',monospace;font-size:12px;letter-spacing:.18em;text-transform:uppercase}",
    "h1{font-size:32px;line-height:1.05;margin:10px 0 12px}",
    "p{color:#b7c0cf;line-height:1.5;margin:0 0 18px}",
    ".stats{display:grid;gap:10px}",
    ".stat{align-items:center;border-top:1px solid rgba(255,255,255,.08);display:flex;justify-content:space-between;padding-top:10px}",
    ".label{color:#8b97aa;font-family:'IBM Plex Mono','Cascadia Code',monospace;font-size:12px;letter-spacing:.12em;text-transform:uppercase}",
    ".value{font-size:14px;font-weight:600;text-align:right}",
    ".viewport{display:grid;place-items:center;min-height:70vh}",
    "iframe{background:#05070a;border:1px solid rgba(255,255,255,.08);border-radius:28px;box-shadow:0 26px 50px rgba(0,0,0,.36);height:min(80vh,720px);max-width:100%;width:100%}",
    "@media (max-width: 900px){.shell{grid-template-columns:1fr;padding:16px}.viewport{min-height:auto}iframe{height:70vh}}",
    "</style></head><body>",
    "<main class=\"shell\">",
    "<section class=\"panel\">",
    "<div class=\"eyebrow\">Local Emulator</div>",
    "<h1>Browser Deck Emulator</h1>",
    "<p>The iframe below renders the current deck through the same browser HTML path used by the runtime. This first slice is intentionally local, single-user, and hardware-free.</p>",
    "<div class=\"stats\">",
    "<div class=\"stat\"><span class=\"label\">Mode</span><span class=\"value\" id=\"mode\">emulator</span></div>",
    "<div class=\"stat\"><span class=\"label\">Device</span><span class=\"value\" id=\"device\">starting</span></div>",
    "<div class=\"stat\"><span class=\"label\">Active Deck</span><span class=\"value\" id=\"deck\">starting</span></div>",
    "<div class=\"stat\"><span class=\"label\">Render Status</span><span class=\"value\" id=\"status\">starting</span></div>",
    "<div class=\"stat\"><span class=\"label\">Render Version</span><span class=\"value\" id=\"version\">0</span></div>",
    "</div>",
    "</section>",
    "<section class=\"viewport\"><iframe id=\"deck-frame\" title=\"Sireno deck emulator\"></iframe></section>",
    "</main>",
    "<script>",
    "const frame = document.getElementById('deck-frame');",
    "const device = document.getElementById('device');",
    "const deck = document.getElementById('deck');",
    "const status = document.getElementById('status');",
    "const version = document.getElementById('version');",
    "let currentVersion = -1;",
    "async function refresh(){",
    "  const response = await fetch('/__sireno/state', { cache: 'no-store' });",
    "  const state = await response.json();",
    "  device.textContent = state.device;",
    "  deck.textContent = state.activeDeckId;",
    "  status.textContent = state.status;",
    "  version.textContent = String(state.version);",
    "  if (state.version > 0 && state.version !== currentVersion) {",
    "    currentVersion = state.version;",
    "    frame.src = `/__sireno/deck?v=${state.version}`;",
    "  }",
    "}",
    "refresh().catch((error) => { status.textContent = String(error); });",
    "setInterval(() => { void refresh().catch((error) => { status.textContent = String(error); }); }, 500);",
    "</script></body></html>",
  ].join("")
}

function writeHttpResponse(response: ServerResponse, statusCode: number, body: string, contentType: string): void {
  response.statusCode = statusCode
  response.setHeader("content-type", contentType)
  response.end(body)
}

function createEmulatorServer(options: {
  connectionInfo: { keyCount: number; model: string }
  runtime: ReturnType<typeof createDeckRuntime>
  surfaceState: EmulatorSurfaceState
}): Server {
  return createServer((request: IncomingMessage, response: ServerResponse) => {
    const url = new URL(request.url ?? "/", "http://127.0.0.1")

    if (url.pathname === "/" || url.pathname === "/index.html") {
      writeHttpResponse(response, 200, renderEmulatorShellHtml(), "text/html; charset=utf-8")
      return
    }

    if (url.pathname === "/__sireno/deck") {
      writeHttpResponse(
        response,
        options.surfaceState.version > 0 ? 200 : 503,
        options.surfaceState.html || "<!doctype html><html><body style=\"background:#05070a;color:#eef2f7;font-family:sans-serif;display:grid;place-items:center;min-height:100vh;margin:0;\">Waiting for first render...</body></html>",
        "text/html; charset=utf-8",
      )
      return
    }

    if (url.pathname === "/__sireno/state") {
      writeHttpResponse(response, 200, JSON.stringify({
        activeDeckId: options.runtime.getActiveDeck().id,
        device: `${options.connectionInfo.model} (${options.connectionInfo.keyCount} keys)`,
        status: options.surfaceState.version > 0 ? "ready" : "starting",
        updatedAt: options.surfaceState.updatedAt,
        version: options.surfaceState.version,
      }), "application/json; charset=utf-8")
      return
    }

    writeHttpResponse(response, 404, "Not Found", "text/plain; charset=utf-8")
  })
}

async function listenServer(server: Server, port: number): Promise<number> {
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject)
    server.listen(port, "127.0.0.1", () => {
      server.off("error", reject)
      resolve()
    })
  })

  const address = server.address() as AddressInfo | null
  if (!address) {
    throw new Error("Failed to resolve emulator server address")
  }

  return address.port
}

async function closeServer(server: Server): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error)
        return
      }

      resolve()
    })
  })
}

export async function startEmulatorSession(options: EmulatorStartOptions): Promise<EmulatorSession> {
  const loadedConfig = await loadRuntimeConfig(options)
  const keyCount = options.keyCount ?? 15
  const lifecycle = createVirtualStreamDeckLifecycle({
    keyCount,
    model: `Virtual Stream Deck ${keyCount}`,
  })
  const connection = await lifecycle.start()
  const browserRenderer = await ensureBrowserRenderer(null, connection.info.keyCount)
  const surfaceState: EmulatorSurfaceState = {
    html: "",
    updatedAt: null,
    version: 0,
  }
  setDomAssetPathResolver((assetReference) => loadedConfig.registry.resolveAssetPath(assetReference))

  const runtime = createDeckRuntime({
    addonRegistry: loadedConfig.registry,
    deck: loadedConfig.config.decks[loadedConfig.config.main_deck]!,
    decks: loadedConfig.config.decks,
    hostContext: loadedConfig.hostContext,
    keyCount: connection.info.keyCount,
    lockedDeckId: loadedConfig.config.session?.locked_deck,
    onRenderDeck: async (buttons) => {
      if (buttons.length > 0 && !buttons.every(isDomRenderButton)) {
        throw new Error("Runtime deck rendering must provide DOM-backed button content")
      }

      const html = createDeckHtml(connection.info.keyCount, buttons.filter(isDomRenderButton), loadedConfig.theme)
      surfaceState.html = html
      surfaceState.updatedAt = new Date().toISOString()
      surfaceState.version += 1
      await browserRenderer.updateDeck(html)
    },
    sessionMonitor: loadedConfig.sessionMonitor,
    subscribeKeyEvents: lifecycle.subscribeKeyEvents,
    theme: loadedConfig.theme,
  })
  const server = createEmulatorServer({
    connectionInfo: connection.info,
    runtime,
    surfaceState,
  })

  try {
    const port = await listenServer(server, options.port ?? 0)
    runtime.start()
    const url = `http://127.0.0.1:${port}`

    return {
      async close() {
        runtime.stop()
        await browserRenderer.close().catch(() => {})
        await loadedConfig.sessionMonitor.stop().catch(() => {})
        await lifecycle.close().catch(() => {})
        await closeServer(server).catch(() => {})
      },
      port,
      url,
    }
  } catch (error) {
    runtime.stop()
    await browserRenderer.close().catch(() => {})
    await loadedConfig.sessionMonitor.stop().catch(() => {})
    await lifecycle.close().catch(() => {})
    await closeServer(server).catch(() => {})
    throw error
  }
}

export async function startEmulator(options: EmulatorStartOptions): Promise<void> {
  const session = await startEmulatorSession(options)
  let cleanupSignals = () => {}

  cleanupSignals = setupSignalHandlers(options.logger, async () => {
    await session.close()
  })

  options.logger.info({ url: session.url }, "browser deck emulator started")
  options.logger.info("open the local emulator page in your browser")
  options.logger.info("press Ctrl+C to stop")

  try {
    await new Promise(() => {
      setInterval(() => {}, 1000)
    })
  } finally {
    cleanupSignals()
  }
}

export async function startDaemon(options: StartOptions): Promise<void> {
  const { logger } = options
  const existingPid = readPid()
  let cleanupSignals = () => {}

  if (existingPid !== null && isRunning(existingPid)) {
    logger.error({ pid: existingPid }, "daemon already running")
    process.exitCode = 1
    return
  }

  if (existingPid !== null) {
    logger.warn({ pid: existingPid }, "stale PID file found; removing it before start")
    removePidFile()
  }

  try {
    const initialLoad = await loadRuntimeConfig(options)
    let runtime: ReturnType<typeof createDeckRuntime> | null = null
    let sessionMonitor = initialLoad.sessionMonitor
    let browserRenderer: BrowserRenderer | null = null
    let stopWatchingConfig = () => {}
    let reloadInFlight = false
    let reloadQueued = false
    const lifecycle = createStreamDeckLifecycle({
      logger,
      onReconnect: async (connection) => {
        if (!runtime) {
          await replayLastRenderedBuffers(connection)
          return
        }

        await runtime.activateCurrentDeck()
      },
      selector: { serial: initialLoad.config.device?.serial },
    })

    const connection = await lifecycle.start()
    browserRenderer = await ensureBrowserRenderer(browserRenderer, connection.info.keyCount)

    setDomAssetPathResolver((assetReference) => initialLoad.registry.resolveAssetPath(assetReference))

    const createRuntime = async (loadedConfig: Awaited<ReturnType<typeof loadRuntimeConfig>>) => {
      return createDeckRuntime({
        addonRegistry: loadedConfig.registry,
        deck: loadedConfig.config.decks[loadedConfig.config.main_deck]!,
        decks: loadedConfig.config.decks,
        hostContext: loadedConfig.hostContext,
        keyCount: connection.info.keyCount,
        lockedDeckId: loadedConfig.config.session?.locked_deck,
        theme: loadedConfig.theme,
        onRenderDeck: async (buttons) => {
          const activeConnection = lifecycle.getConnection()
          if (!activeConnection || !browserRenderer) {
            return
          }

          await renderRuntimeDeckSurface(activeConnection, buttons, browserRenderer, logger, loadedConfig.theme)
        },
        sessionMonitor: loadedConfig.sessionMonitor,
        subscribeKeyEvents: lifecycle.subscribeKeyEvents,
      })
    }

    runtime = await createRuntime(initialLoad)

    async function reloadRuntime(): Promise<void> {
      if (!runtime) {
        return
      }

      if (reloadInFlight) {
        reloadQueued = true
        return
      }

      reloadInFlight = true

      do {
        reloadQueued = false
        let loadedConfig: Awaited<ReturnType<typeof loadRuntimeConfig>> | null = null

        try {
          loadedConfig = await loadRuntimeConfig(options)
          const nextRuntime = await createRuntime(loadedConfig)
          const previousRuntime = runtime
          const previousSessionMonitor = sessionMonitor
          const previousStack = previousRuntime.getStackSnapshot()
          const previousActiveDeckId = previousRuntime.getActiveDeck().id

          sessionMonitor = loadedConfig.sessionMonitor
          runtime = nextRuntime
          setDomAssetPathResolver((assetReference) => loadedConfig.registry.resolveAssetPath(assetReference))

          previousRuntime.stop()
          await previousSessionMonitor.stop()

          nextRuntime.start()
          await restoreReloadNavigation(nextRuntime, previousStack, previousActiveDeckId, loadedConfig.config.main_deck)

          stopWatchingConfig()
          stopWatchingConfig = watchConfigFiles(loadedConfig.filePaths, () => {
            void reloadRuntime().catch((error) => {
              logger.error({ error }, "config reload failed")
            })
          })
          logger.info({ filePaths: loadedConfig.filePaths }, "reloaded config after file change")
        } catch (error) {
          if (loadedConfig) {
            await loadedConfig.sessionMonitor.stop()
          }

          if (error instanceof ConfigValidationError) {
            console.error(formatConfigError(error))
            await runtime.showTemporaryErrorDeck(createTemporaryConfigErrorLines(error))
          } else {
            logger.error({ error }, "config reload failed")
          }
        }
      } while (reloadQueued)

      reloadInFlight = false
    }

    runtime.start()
    stopWatchingConfig = watchConfigFiles(initialLoad.filePaths, () => {
      void reloadRuntime().catch((error) => {
        logger.error({ error }, "config reload failed")
      })
    })

    logger.info({ config: initialLoad.config }, "config loaded successfully")
    logger.info(
      {
        keyCount: connection.info.keyCount,
        model: connection.info.model,
        serialNumber: connection.info.serialNumber,
      },
      "connected to Stream Deck",
    )

    writePid()
    cleanupSignals = setupSignalHandlers(logger, async () => {
      stopWatchingConfig()
      runtime?.stop()
      await browserRenderer?.close()
      await sessionMonitor.stop()
      await lifecycle.close()
    })
  } catch (error) {
    if (error instanceof AddonManifestError && error.code === "api_version_mismatch") {
      console.error(`Addon apiVersion error: ${error.message}`)
      process.exitCode = 1
      return
    }

    if (error instanceof ConfigValidationError) {
      console.error(formatConfigError(error))
      process.exitCode = 1
      return
    }

    if (error instanceof StreamDeckSelectionError) {
      console.error(error.message)
      process.exitCode = 1
      return
    }

    const linuxUdevMessage = formatLinuxUdevAccessError(error)
    if (linuxUdevMessage) {
      console.error(linuxUdevMessage)
      process.exitCode = 1
      return
    }

    throw error
  }

  logger.info({ pid: process.pid }, "sireno-deck daemon started")
  logger.info("started config-driven main deck runtime with addon-hosted buttons")
  logger.info("press Ctrl+C to stop")

  try {
    await new Promise(() => {
      setInterval(() => {}, 1000)
    })
  } finally {
    cleanupSignals()
  }
}
