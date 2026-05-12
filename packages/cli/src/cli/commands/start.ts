import type pino from "pino"

import { loadConfig } from "../../config/loader.js"
import { resolveTheme } from "../../config/theme.js"
import { ConfigValidationError } from "../../core/schemas.js"
import {
  blankRemainingKeys,
  createStreamDeckLifecycle,
  replayLastRenderedBuffers,
  StreamDeckSelectionError,
  writeKeyBuffer,
} from "../../device/stream-deck.js"
import { formatLinuxUdevAccessError } from "../../device/linux-udev.js"
import { createDeckSurfaceElement, createDisplayButtonModels, renderDeck } from "../../render/reconciler.js"
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

async function renderMainDeck(
  connection: Awaited<ReturnType<ReturnType<typeof createStreamDeckLifecycle>["start"]>>,
  deckButtons: ReturnType<typeof createDisplayButtonModels>,
  theme: ReturnType<typeof resolveTheme>,
  logger: pino.Logger,
): Promise<void> {
  const descriptions = renderDeck(createDeckSurfaceElement({ buttons: deckButtons }))
  const blankBuffer = await renderBlankKeyImage()
  const renderedKeys = new Set<number>()

  for (const description of descriptions) {
    const buffer = await renderTextImage({
      icon: description.icon,
      text: description.label,
      theme,
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
    const config = loadConfig(options.config)
    const theme = resolveTheme(config.theme)
    const mainDeck = config.decks[config.main_deck]
    const mainDeckButtons = createDisplayButtonModels(mainDeck.buttons)
    const lifecycle = createStreamDeckLifecycle({
      logger,
      onReconnect: async (connection) => {
        // Replay last rendered buffers after reconnect.
        await replayLastRenderedBuffers(connection)
      },
      selector: { serial: config.device?.serial },
    })

    const connection = await lifecycle.start()
    await renderMainDeck(connection, mainDeckButtons, theme, logger)

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
      await lifecycle.close()
    })
  } catch (error) {
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
  logger.info("started config-driven main deck runtime")
  logger.info("press Ctrl+C to stop")

  try {
    await new Promise(() => {
      setInterval(() => {}, 1000)
    })
  } finally {
    cleanupSignals()
  }
}
