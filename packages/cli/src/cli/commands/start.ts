import type pino from "pino"

import { loadConfiguredAddons } from "../../addon/loader.js"
import { AddonManifestError } from "../../addon/manifest.js"
import { createBundledAddonRegistry, loadBootstrapConfig, loadConfig } from "../../config/loader.js"
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

export async function loadRuntimeConfig(options: StartOptions) {
  const bootstrap = loadBootstrapConfig(options.config)
  const registry = createBundledAddonRegistry()
  const addonLoadResult = await loadConfiguredAddons({
    addons: bootstrap.config.addons,
    cwd: bootstrap.cwd,
    registry,
  })

  for (const warning of addonLoadResult.warnings) {
    options.logger.warn({ addonName: warning.addonName, reason: warning.reason }, "skipping addon after startup warning")
  }

  return {
    config: loadConfig(bootstrap.filePath, registry),
    registry,
  }
}

async function renderMainDeck(
  connection: NonNullable<ReturnType<ReturnType<typeof createStreamDeckLifecycle>["getConnection"]>>,
  deckButtons: DeckButtonProps[],
  theme: ReturnType<typeof resolveTheme>,
  logger: pino.Logger,
): Promise<void> {
  const descriptions = renderDeck(createDeckSurfaceElement({ buttons: deckButtons }))
  const blankBuffer = await renderBlankKeyImage()
  const renderedKeys = new Set<number>()

  for (const description of descriptions) {
    const buffer = await renderTextImage({
      detailLines: description.detailLines,
      displayValue: description.displayValue,
      icon: description.icon,
      progress: description.progress,
      subtitle: description.subtitle,
      text: description.label,
      theme,
      variant: description.variant,
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
    const { config } = await loadRuntimeConfig(options)
    const theme = resolveTheme(config.theme)
    const mainDeck = config.decks[config.main_deck]
    let runtime: ReturnType<typeof createDeckRuntime> | null = null
    const lifecycle = createStreamDeckLifecycle({
      logger,
      onReconnect: async (connection) => {
        if (!runtime) {
          await replayLastRenderedBuffers(connection)
          return
        }

        await runtime.activateCurrentDeck()
      },
      selector: { serial: config.device?.serial },
    })

    const connection = await lifecycle.start()
    runtime = createDeckRuntime({
      deck: mainDeck,
      decks: config.decks,
      keyCount: connection.info.keyCount,
      theme,
      onRenderButton: async (button) => {
        const activeConnection = lifecycle.getConnection()
        if (!activeConnection) {
          return
        }

        const buffer = await renderTextImage({
          detailLines: button.detailLines,
          displayValue: button.displayValue,
          icon: button.icon,
          progress: button.progress,
          subtitle: button.subtitle,
          text: button.label,
          theme,
          variant: button.variant,
        })
        await writeKeyBuffer(activeConnection, button.keyIndex, buffer)
      },
      onRenderDeck: async (buttons) => {
        const activeConnection = lifecycle.getConnection()
        if (!activeConnection) {
          return
        }

        await renderMainDeck(activeConnection, buttons, theme, logger)
      },
      subscribeKeyEvents: lifecycle.subscribeKeyEvents,
    })

    runtime.start()

    logger.info({ config }, "config loaded successfully")
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
      runtime?.stop()
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
