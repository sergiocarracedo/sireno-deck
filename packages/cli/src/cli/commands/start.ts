import { watch } from "node:fs"
import { basename, dirname } from "node:path"

import type pino from "pino"

import { loadConfiguredAddons } from "../../addon/loader.js"
import { AddonManifestError } from "../../addon/manifest.js"
import { createBundledAddonRegistry, loadBootstrapConfig, loadConfigWithSources } from "../../config/loader.js"
import { resolveTheme } from "../../config/theme.js"
import { ConfigValidationError } from "../../core/schemas.js"
import { createDeckRuntime } from "../../deck/runtime.js"
import {
  blankRemainingKeys,
  createStreamDeckLifecycle,
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

    return {
      config: loadedConfig.config,
      configDirectory: dirname(loadedConfig.filePath),
      filePaths: loadedConfig.filePaths,
      hostContext,
      registry,
      sessionMonitor,
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
  theme?: ReturnType<typeof resolveTheme>,
): Promise<void> {
  await browserRenderer.updateDeck(renderDomDeck(deckButtons.map((button) => ({
    content: button.content,
    ...(button.full_surface !== undefined ? { full_surface: button.full_surface } : {}),
    keyIndex: button.keyIndex,
    ...(button.sample_interval_ms !== undefined ? { sample_interval_ms: button.sample_interval_ms } : {}),
  })), {
    keyCount: connection.info.keyCount,
    theme,
  }))

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
  theme?: ReturnType<typeof resolveTheme>,
): Promise<void> {
  if (buttons.length > 0 && !buttons.every(isDomRenderButton)) {
    throw new Error("Runtime deck rendering must provide DOM-backed button content")
  }

  await renderDomDeckSurface(connection, buttons.filter(isDomRenderButton), browserRenderer, logger, theme)
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

    const createRuntime = (loadedConfig: Awaited<ReturnType<typeof loadRuntimeConfig>>) => {
      const runtimeTheme = resolveTheme(loadedConfig.config.theme, { baseDirectory: loadedConfig.configDirectory })

      return createDeckRuntime({
        addonRegistry: loadedConfig.registry,
        deck: loadedConfig.config.decks[loadedConfig.config.main_deck]!,
        decks: loadedConfig.config.decks,
        hostContext: loadedConfig.hostContext,
        keyCount: connection.info.keyCount,
        lockedDeckId: loadedConfig.config.session?.locked_deck,
        theme: runtimeTheme,
        onRenderDeck: async (buttons) => {
          const activeConnection = lifecycle.getConnection()
          if (!activeConnection || !browserRenderer) {
            return
          }

          await renderRuntimeDeckSurface(activeConnection, buttons, browserRenderer, logger, runtimeTheme)
        },
        sessionMonitor: loadedConfig.sessionMonitor,
        subscribeKeyEvents: lifecycle.subscribeKeyEvents,
      })
    }

    runtime = createRuntime(initialLoad)

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
          const nextRuntime = createRuntime(loadedConfig)
          const previousRuntime = runtime
          const previousSessionMonitor = sessionMonitor
          const previousStack = previousRuntime.getStackSnapshot()
          const previousActiveDeckId = previousRuntime.getActiveDeck().id

          sessionMonitor = loadedConfig.sessionMonitor
          runtime = nextRuntime

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
