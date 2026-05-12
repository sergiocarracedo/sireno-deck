import * as streamDeckNode from "@elgato-stream-deck/node"

import type {
  StreamDeck,
  StreamDeckButtonControlDefinition,
  StreamDeckDeviceInfo,
  StreamDeckEncoderControlDefinition,
} from "@elgato-stream-deck/node"

export interface StreamDeckSelector {
  serial?: string
}

export interface StreamDeckCandidate {
  modelId: string
  model: string
  path: string
  serialNumber?: string
}

export interface StreamDeckConnectionInfo extends StreamDeckCandidate {
  lcdKeyIndices: number[]
  keyCount: number
}

export interface StreamDeckConnection {
  device: StreamDeck
  info: StreamDeckConnectionInfo
  lastWrittenBuffers: Map<number, Buffer>
}

export interface StreamDeckLogger {
  debug: (...args: unknown[]) => void
  info: (...args: unknown[]) => void
  warn: (...args: unknown[]) => void
  error: (...args: unknown[]) => void
}

export interface StreamDeckApi {
  listStreamDecks: () => Promise<StreamDeckDeviceInfo[]>
  openStreamDeck: (path: string) => Promise<StreamDeck>
  getStreamDeckModelName: (model: StreamDeckDeviceInfo["model"]) => string
}

export interface StreamDeckLifecycleOptions {
  api?: StreamDeckApi
  logger?: StreamDeckLogger
  now?: () => number
  onReconnect?: (connection: StreamDeckConnection) => Promise<void> | void
  reconnectIntervalMs?: number
  reconnectLogIntervalMs?: number
  reconnectWindowMs?: number
  selector?: StreamDeckSelector
  sleep?: (ms: number) => Promise<void>
}

export interface StreamDeckLifecycle {
  close: () => Promise<void>
  getConnection: () => StreamDeckConnection | null
  subscribeKeyEvents: (listener: StreamDeckKeyListener) => () => void
  start: () => Promise<StreamDeckConnection>
}

export interface StreamDeckKeyEvent {
  keyIndex: number
  type: "down" | "up"
}

export type StreamDeckKeyListener = (event: StreamDeckKeyEvent) => void

const defaultApi: StreamDeckApi = {
  listStreamDecks: streamDeckNode.listStreamDecks,
  openStreamDeck: streamDeckNode.openStreamDeck,
  getStreamDeckModelName: streamDeckNode.getStreamDeckModelName,
}

const noopLogger: StreamDeckLogger = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
}

export class StreamDeckSelectionError extends Error {
  constructor(
    message: string,
    public readonly devices: readonly StreamDeckCandidate[] = [],
  ) {
    super(
      devices.length > 0
        ? `${message}\nDetected devices:\n${formatDetectedDevices(devices)}`
        : message,
    )
    this.name = "StreamDeckSelectionError"
  }
}

function sleepFor(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function getCandidate(device: StreamDeckDeviceInfo, api: StreamDeckApi): StreamDeckCandidate {
  return {
    modelId: String(device.model),
    model: api.getStreamDeckModelName(device.model),
    path: device.path,
    serialNumber: device.serialNumber,
  }
}

function getButtonCount(device: StreamDeck): number {
  return device.CONTROLS.filter((control) => control.type === "button").length
}

function getLcdKeyIndices(device: StreamDeck): number[] {
  return device.CONTROLS.flatMap((control) => {
    if (control.type !== "button" || control.feedbackType !== "lcd") {
      return []
    }

    return [control.index]
  })
}

export function formatDetectedDevices(devices: readonly StreamDeckCandidate[]): string {
  return devices
    .map((device) => {
      const serialNumber = device.serialNumber ?? "unknown"
      return `- ${device.model} (serial: ${serialNumber}, path: ${device.path})`
    })
    .join("\n")
}

export async function listConnectedStreamDecks(api: StreamDeckApi = defaultApi): Promise<StreamDeckCandidate[]> {
  const devices = await api.listStreamDecks()
  return devices.map((device) => getCandidate(device, api))
}

export function selectStreamDeck(
  devices: readonly StreamDeckCandidate[],
  selector: StreamDeckSelector = {},
): StreamDeckCandidate {
  if (selector.serial) {
    const match = devices.find((device) => device.serialNumber === selector.serial)
    if (!match) {
      throw new StreamDeckSelectionError(
        `No Stream Deck matched serial '${selector.serial}'.`,
        devices,
      )
    }

    return match
  }

  if (devices.length === 0) {
    throw new StreamDeckSelectionError("No Stream Deck devices detected.")
  }

  if (devices.length > 1) {
    throw new StreamDeckSelectionError(
      "Multiple Stream Deck devices detected; set device.serial in config.yml to choose one.",
      devices,
    )
  }

  return devices[0]
}

export async function connectStreamDeck(
  selector: StreamDeckSelector = {},
  api: StreamDeckApi = defaultApi,
  lastWrittenBuffers = new Map<number, Buffer>(),
): Promise<StreamDeckConnection> {
  const devices = await listConnectedStreamDecks(api)
  const selected = selectStreamDeck(devices, selector)
  const device = await api.openStreamDeck(selected.path)

  return {
    device,
    info: {
      ...selected,
      lcdKeyIndices: getLcdKeyIndices(device),
      keyCount: getButtonCount(device),
      model: device.PRODUCT_NAME,
    },
    lastWrittenBuffers,
  }
}

export async function writeKeyBuffer(
  connection: StreamDeckConnection,
  keyIndex: number,
  buffer: Buffer,
): Promise<boolean> {
  const previousBuffer = connection.lastWrittenBuffers.get(keyIndex)
  if (previousBuffer?.equals(buffer)) {
    // skip unchanged writes so repeated renders do not hammer the device
    return false
  }

  await connection.device.fillKeyBuffer(keyIndex, buffer, { format: "rgb" })
  connection.lastWrittenBuffers.set(keyIndex, Buffer.from(buffer))
  return true
}

export async function blankRemainingKeys(
  connection: StreamDeckConnection,
  blankBuffer: Buffer,
  renderedKeys: ReadonlySet<number>,
): Promise<void> {
  const blankWrites = connection.info.lcdKeyIndices
    .filter((keyIndex) => !renderedKeys.has(keyIndex))
    .map((keyIndex) => writeKeyBuffer(connection, keyIndex, blankBuffer))

  await Promise.all(blankWrites)
}

export async function writeRenderDescriptions(
  connection: StreamDeckConnection,
  buffersByKey: ReadonlyMap<number, Buffer>,
): Promise<void> {
  for (const [keyIndex, buffer] of buffersByKey.entries()) {
    await writeKeyBuffer(connection, keyIndex, buffer)
  }
}

export async function replayLastRenderedBuffers(connection: StreamDeckConnection): Promise<void> {
  for (const [keyIndex, buffer] of connection.lastWrittenBuffers.entries()) {
    await connection.device.fillKeyBuffer(keyIndex, buffer, { format: "rgb" })
  }
}

export async function closeStreamDeckConnection(connection: StreamDeckConnection | null): Promise<void> {
  if (!connection) {
    return
  }

  await connection.device.clearPanel().catch(() => undefined)
  await connection.device.close().catch(() => undefined)
}

function isButtonControl(
  control: StreamDeckButtonControlDefinition | StreamDeckEncoderControlDefinition,
): control is StreamDeckButtonControlDefinition {
  return control.type === "button"
}

export function createStreamDeckLifecycle(
  options: StreamDeckLifecycleOptions = {},
): StreamDeckLifecycle {
  const api = options.api ?? defaultApi
  const logger = options.logger ?? noopLogger
  const now = options.now ?? Date.now
  const sleep = options.sleep ?? sleepFor
  const reconnectIntervalMs = options.reconnectIntervalMs ?? 2_000
  const reconnectLogIntervalMs = options.reconnectLogIntervalMs ?? 30_000
  const reconnectWindowMs = options.reconnectWindowMs ?? 5 * 60_000

  let activeConnection: StreamDeckConnection | null = null
  let activeErrorHandler: ((error: unknown) => void) | null = null
  let activeDownHandler:
    | ((control: StreamDeckButtonControlDefinition | StreamDeckEncoderControlDefinition) => void)
    | null = null
  let activeUpHandler:
    | ((control: StreamDeckButtonControlDefinition | StreamDeckEncoderControlDefinition) => void)
    | null = null
  let closed = false
  const lastWrittenBuffers = new Map<number, Buffer>()
  const keyListeners = new Set<StreamDeckKeyListener>()
  let reconnectPromise: Promise<void> | null = null
  let reconnectSerial = options.selector?.serial

  function detachErrorHandler(): void {
    if (activeConnection && activeErrorHandler) {
      activeConnection.device.off("error", activeErrorHandler)
    }

    activeErrorHandler = null
  }

  function detachKeyHandlers(): void {
    if (activeConnection && activeDownHandler) {
      activeConnection.device.off("down", activeDownHandler)
    }

    if (activeConnection && activeUpHandler) {
      activeConnection.device.off("up", activeUpHandler)
    }

    activeDownHandler = null
    activeUpHandler = null
  }

  function attachConnection(connection: StreamDeckConnection): void {
    detachErrorHandler()
    detachKeyHandlers()
    activeConnection = connection
    reconnectSerial = connection.info.serialNumber ?? reconnectSerial

    activeErrorHandler = (error: unknown) => {
      if (closed || reconnectPromise) {
        return
      }

      void handleDisconnect(error)
    }

    connection.device.on("error", activeErrorHandler)

    activeDownHandler = (control) => {
      if (!isButtonControl(control)) {
        return
      }

      for (const listener of keyListeners) {
        listener({ keyIndex: control.index, type: "down" })
      }
    }

    activeUpHandler = (control) => {
      if (!isButtonControl(control)) {
        return
      }

      for (const listener of keyListeners) {
        listener({ keyIndex: control.index, type: "up" })
      }
    }

    connection.device.on("down", activeDownHandler)
    connection.device.on("up", activeUpHandler)
  }

  async function handleDisconnect(error: unknown): Promise<void> {
    const disconnected = activeConnection
    detachErrorHandler()
    activeConnection = null

    await closeStreamDeckConnection(disconnected)

    logger.warn(
      {
        error,
        model: disconnected?.info.model,
        serialNumber: disconnected?.info.serialNumber,
      },
      "Stream Deck disconnected; attempting to reconnect",
    )

    reconnectPromise = runReconnectLoop()
    try {
      await reconnectPromise
    } finally {
      reconnectPromise = null
    }
  }

  async function runReconnectLoop(): Promise<void> {
    const startedAt = now()
    let attempt = 0
    let lastProgressLogAt = 0

    while (!closed && now() - startedAt < reconnectWindowMs) {
      attempt += 1

      try {
        const connection = await connectStreamDeck({ serial: reconnectSerial }, api, lastWrittenBuffers)
        attachConnection(connection)

        logger.info(
          {
            attempts: attempt,
            model: connection.info.model,
            serialNumber: connection.info.serialNumber,
          },
          "Stream Deck reconnected",
        )

        await options.onReconnect?.(connection)
        return
      } catch (error) {
        const elapsedMs = now() - startedAt
        const remainingMs = reconnectWindowMs - elapsedMs

        if (remainingMs <= 0) {
          break
        }

        if (lastProgressLogAt === 0 || now() - lastProgressLogAt >= reconnectLogIntervalMs) {
          lastProgressLogAt = now()
          logger.warn(
            {
              attempts: attempt,
              secondsRemaining: Math.ceil(remainingMs / 1_000),
            },
            "Still waiting for Stream Deck to reconnect",
          )
          logger.debug({ error }, "Reconnect attempt failed")
        }

        await sleep(Math.min(reconnectIntervalMs, remainingMs))
      }
    }

    logger.error("Failed to reconnect to Stream Deck within 5 minutes")
  }

  return {
    async start() {
      if (closed) {
        throw new Error("Stream Deck lifecycle is closed")
      }

      if (activeConnection) {
        return activeConnection
      }

      const connection = await connectStreamDeck(options.selector, api, lastWrittenBuffers)
      attachConnection(connection)
      return connection
    },
    getConnection() {
      return activeConnection
    },
    subscribeKeyEvents(listener) {
      keyListeners.add(listener)

      return () => {
        keyListeners.delete(listener)
      }
    },
    async close() {
      closed = true
      const pendingReconnect = reconnectPromise
      reconnectPromise = null
      detachErrorHandler()
      detachKeyHandlers()

      const connection = activeConnection
      activeConnection = null
      await closeStreamDeckConnection(connection)

      if (pendingReconnect) {
        await pendingReconnect
      }
    },
  }
}
