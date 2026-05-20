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
import type { DeckButtonProps } from "../../render/reconciler.js"

import { createDeckSurfaceElement, renderDeck } from "../../render/reconciler.js"
import { renderBlankKeyImage, renderTextImage } from "../../render/text-image.js"
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

export interface StartOptions {
  config?: string
  logger: pino.Logger
}

const CONFIG_RELOAD_DEBOUNCE_MS = 75

export function resolvePrimitiveRenderOptions(
  button: DeckButtonProps,
  registry: Pick<ReturnType<typeof createBundledAddonRegistry>, "getStylePrimitive" | "getWrapperPrimitive">,
): { sharedStyleTone?: "accent" | "default"; wrapper?: "shared" } {
  const sharedStyleTone = button.style_id ? registry.getStylePrimitive(button.style_id)?.shared?.tone : undefined
  const wrapper = button.full_surface
    ? undefined
    : button.wrapper ?? (button.wrapper_id ? registry.getWrapperPrimitive(button.wrapper_id)?.wrapper : undefined)

  return {
    ...(sharedStyleTone !== undefined ? { sharedStyleTone } : {}),
    ...(wrapper !== undefined ? { wrapper } : {}),
  }
}

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

async function renderMainDeck(
  connection: NonNullable<ReturnType<ReturnType<typeof createStreamDeckLifecycle>["getConnection"]>>,
  deckButtons: DeckButtonProps[],
  theme: ReturnType<typeof resolveTheme>,
  resolvePrimitiveRenderOptions: (button: DeckButtonProps) => { sharedStyleTone?: "accent" | "default"; wrapper?: "shared" },
  logger: pino.Logger,
): Promise<void> {
  const descriptions = renderDeck(createDeckSurfaceElement({ buttons: deckButtons }))
  const blankBuffer = await renderBlankKeyImage()
  const renderedKeys = new Set<number>()

  for (const description of descriptions) {
    const primitiveOptions = resolvePrimitiveRenderOptions(description)
    const buffer = await renderTextImage({
      accent: description.accent,
      background: description.background,
      detailLines: description.detailLines,
      displayValue: description.displayValue,
      fit: description.fit,
      icon: description.icon,
      progress: description.progress,
      sharedStyleTone: primitiveOptions.sharedStyleTone,
      subtitle: description.subtitle,
      text: description.label,
      theme,
      toggleMode: description.toggle_mode,
      variant: description.variant,
      wrapper: description.wrapper ?? primitiveOptions.wrapper,
    })
    renderedKeys.add(description.keyIndex)
    await writeKeyBuffer(connection, description.keyIndex, buffer)
  }

  await blankRemainingKeys(connection, blankBuffer, renderedKeys)
  logger.info({ deckId: "main deck", renderedKeys: Array.from(renderedKeys).sort((left, right) => left - right) }, "rendered themed main deck")
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
    let registry = initialLoad.registry
    let sessionMonitor = initialLoad.sessionMonitor
    let stopWatchingConfig = () => {}
    let reloadInFlight = false
    let reloadQueued = false
    const getPrimitiveRenderOptions = (button: DeckButtonProps) => resolvePrimitiveRenderOptions(button, registry)
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
      onRenderButton: async (button) => {
        const activeConnection = lifecycle.getConnection()
        if (!activeConnection) {
          return
        }

        const buffer = await renderTextImage({
          accent: button.accent,
          background: button.background,
          detailLines: button.detailLines,
          displayValue: button.displayValue,
          fit: button.fit,
          icon: button.icon,
          progress: button.progress,
          ...getPrimitiveRenderOptions(button),
          subtitle: button.subtitle,
          text: button.label,
          theme: runtimeTheme,
          toggleMode: button.toggle_mode,
          variant: button.variant,
          wrapper: button.wrapper ?? getPrimitiveRenderOptions(button).wrapper,
        })
        await writeKeyBuffer(activeConnection, button.keyIndex, buffer)
      },
      onRenderDeck: async (buttons) => {
        const activeConnection = lifecycle.getConnection()
        if (!activeConnection) {
          return
        }

        await renderMainDeck(activeConnection, buttons, runtimeTheme, getPrimitiveRenderOptions, logger)
      },
      sessionMonitor: loadedConfig.sessionMonitor,
      subscribeKeyEvents: lifecycle.subscribeKeyEvents,
    })
    }

    const connection = await lifecycle.start()
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

          registry = loadedConfig.registry
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
