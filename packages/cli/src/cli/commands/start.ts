import type pino from "pino"

import { loadConfig } from "../../config/loader.js"
import { ConfigValidationError } from "../../core/schemas.js"
import {
  blankRemainingKeys,
  createStreamDeckLifecycle,
  replayLastRenderedBuffers,
  StreamDeckConnection,
  StreamDeckSelectionError,
  writeRenderDescriptions,
  writeKeyBuffer,
} from "../../device/stream-deck.js"
import { formatLinuxUdevAccessError } from "../../device/linux-udev.js"
import { createDeckSurfaceElement, createDeckTextElement, renderDeck } from "../../render/reconciler.js"
import { createPollingScheduler } from "../../render/scheduler.js"
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

async function renderPhaseTwoDemo(connection: StreamDeckConnection, logger: pino.Logger): Promise<void> {
  const descriptions = renderDeck(createDeckTextElement({ keyIndex: 0, text: "Hello World" }))
  const blankBuffer = await renderBlankKeyImage()
  const renderedKeys = new Set<number>()

  for (const description of descriptions) {
    const buffer = await renderTextImage({ text: description.text })
    renderedKeys.add(description.keyIndex)
    await writeKeyBuffer(connection, description.keyIndex, buffer)
  }

  await blankRemainingKeys(connection, blankBuffer, renderedKeys)
  logger.info({ keyIndex: 0 }, "rendered first visual to key 0")
}

async function renderPollingDeck(connection: StreamDeckConnection, tick: number): Promise<void> {
  const labels = Array.from({ length: 15 }, (_, keyIndex) => `K${keyIndex} ${String((tick + keyIndex) % 10)}`)
  const descriptions = renderDeck(createDeckSurfaceElement({ labels }))
  const buffersByKey = new Map<number, Buffer>()

  for (const description of descriptions) {
    buffersByKey.set(description.keyIndex, await renderTextImage({ text: description.text }))
  }

  await writeRenderDescriptions(connection, buffersByKey)
}

export async function startDaemon(options: StartOptions): Promise<void> {
  const { logger } = options
  const existingPid = readPid()
  let cleanupSignals = () => {}
  let tick = 0

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
    const lifecycle = createStreamDeckLifecycle({
      logger,
      onReconnect: async (connection) => {
        // Replay last rendered buffers after reconnect.
        await replayLastRenderedBuffers(connection)
      },
      selector: { serial: config.device?.serial },
    })

    const connection = await lifecycle.start()
    await renderPhaseTwoDemo(connection, logger)

    const scheduler = createPollingScheduler({ intervalMs: 500 })
    scheduler.start(
      Array.from({ length: 15 }, (_, keyIndex) => ({
        id: `key-${keyIndex}`,
        run: async () => {
          tick += 1
          await renderPollingDeck(connection, tick + keyIndex)
        },
      })),
    )

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
      scheduler.stop()
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
  logger.info({ intervalMs: 500 }, "started scheduler-driven 15-key polling demo")
  logger.info("press Ctrl+C to stop")

  try {
    await new Promise(() => {
      setInterval(() => {}, 1000)
    })
  } finally {
    cleanupSignals()
  }
}
