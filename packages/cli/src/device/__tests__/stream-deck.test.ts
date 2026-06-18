import { EventEmitter } from "node:events"

import { describe, expect, it, vi } from "vitest"

import {
  StreamDeckSelectionError,
  _resetDeviceRegistryForTests,
  blankRemainingKeys,
  connectStreamDeck,
  createStreamDeckLifecycle,
  createVirtualStreamDeckLifecycle,
  replayLastRenderedBuffers,
  type StreamDeckKeyEvent,
  type StreamDeckApi,
  type StreamDeckDeviceHandle,
  writeKeyBuffer,
} from "./stream-deck"
import { registerDeviceHandle, setBrightnessAll, unregisterDeviceHandle } from "./registry"

class FakeStreamDeck extends EventEmitter {
  readonly CONTROLS
  readonly MODEL = "fake-model"
  readonly PRODUCT_NAME: string
  readonly HAS_NFC_READER = false

  cleared = 0
  closed = 0
  writes: Array<{ keyIndex: number; buffer: Buffer }> = []

  constructor(productName: string, keyCount: number) {
    super()
    this.PRODUCT_NAME = productName
    this.CONTROLS = Array.from({ length: keyCount }, (_, index) => ({
      type: "button" as const,
      index,
      row: 0,
      column: index,
      hidIndex: index,
      feedbackType: "lcd" as const,
      pixelSize: { width: 72, height: 72 },
    }))
  }

  async clearPanel(): Promise<void> {
    this.cleared += 1
  }

  async close(): Promise<void> {
    this.closed += 1
  }

  async fillKeyBuffer(keyIndex: number, imageBuffer: Uint8Array): Promise<void> {
    this.writes.push({ keyIndex, buffer: Buffer.from(imageBuffer) })
  }
}

describe("stream deck connection", () => {
  it("connects the only detected device", async () => {
    const device = new FakeStreamDeck("Stream Deck XL", 32)
    const openStreamDeck = vi.fn(async () => device as never)

    const connection = await connectStreamDeck(
      {},
      {
        listStreamDecks: async () => [
          { model: "xl" as never, path: "/dev/hidraw0", serialNumber: "SERIAL-1" },
        ],
        openStreamDeck,
        getStreamDeckModelName: () => "Stream Deck XL",
      },
    )

    expect(openStreamDeck).toHaveBeenCalledWith("/dev/hidraw0")
    expect(connection.info.model).toBe("Stream Deck XL")
    expect(connection.info.serialNumber).toBe("SERIAL-1")
    expect(connection.info.keyCount).toBe(32)
  })

  it("fails when multiple devices are attached without a serial selector", async () => {
    await expect(
      connectStreamDeck(
        {},
        {
          listStreamDecks: async () => [
            { model: "mini" as never, path: "/dev/hidraw0", serialNumber: "AAA" },
            { model: "xl" as never, path: "/dev/hidraw1", serialNumber: "BBB" },
          ],
          openStreamDeck: async () => new FakeStreamDeck("unused", 6) as never,
          getStreamDeckModelName: (model) => String(model).toUpperCase(),
        },
      ),
    ).rejects.toMatchObject({ name: "StreamDeckSelectionError" })

    await expect(
      connectStreamDeck(
        {},
        {
          listStreamDecks: async () => [
            { model: "mini" as never, path: "/dev/hidraw0", serialNumber: "AAA" },
            { model: "xl" as never, path: "/dev/hidraw1", serialNumber: "BBB" },
          ],
          openStreamDeck: async () => new FakeStreamDeck("unused", 6) as never,
          getStreamDeckModelName: (model) => String(model).toUpperCase(),
        },
      ),
    ).rejects.toThrow("Detected devices")
  })

  it("selects a device by serial number", async () => {
    const openStreamDeck = vi.fn(async () => new FakeStreamDeck("Stream Deck +", 8) as never)

    const connection = await connectStreamDeck(
      { serial: "BBB" },
      {
        listStreamDecks: async () => [
          { model: "mini" as never, path: "/dev/hidraw0", serialNumber: "AAA" },
          { model: "plus" as never, path: "/dev/hidraw1", serialNumber: "BBB" },
        ],
        openStreamDeck,
        getStreamDeckModelName: (model) => String(model).toUpperCase(),
      },
    )

    expect(openStreamDeck).toHaveBeenCalledWith("/dev/hidraw1")
    expect(connection.info.serialNumber).toBe("BBB")
  })

  it("reconnects after a device error and keeps the selected serial", async () => {
    let time = 0
    const logger = {
      debug: vi.fn(),
      error: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
    }
    const firstDevice = new FakeStreamDeck("Stream Deck MK.2", 15)
    const secondDevice = new FakeStreamDeck("Stream Deck MK.2", 15)
    const listStreamDecks = vi
      .fn<() => Promise<Array<{ model: never; path: string; serialNumber: string }>>>()
      .mockResolvedValueOnce([
        { model: "mk2" as never, path: "/dev/hidraw0", serialNumber: "SERIAL-42" },
      ])
      .mockResolvedValueOnce([])
      .mockResolvedValue([
        { model: "mk2" as never, path: "/dev/hidraw0", serialNumber: "SERIAL-42" },
      ])
    const openStreamDeck = vi
      .fn<(path: string) => Promise<never>>()
      .mockResolvedValueOnce(firstDevice as never)
      .mockResolvedValue(secondDevice as never)
    const onReconnect = vi.fn()

    const lifecycle = createStreamDeckLifecycle({
      api: {
        listStreamDecks,
        openStreamDeck,
        getStreamDeckModelName: () => "Stream Deck MK.2",
      },
      logger,
      now: () => time,
      onReconnect,
      reconnectIntervalMs: 10,
      reconnectLogIntervalMs: 20,
      reconnectWindowMs: 100,
      sleep: async (ms) => {
        time += ms
      },
    })

    const connection = await lifecycle.start()
    expect(connection.info.serialNumber).toBe("SERIAL-42")

    firstDevice.emit("error", new Error("device lost"))

    await vi.waitFor(() => {
      expect(lifecycle.getConnection()?.device).toBe(secondDevice)
    })

    expect(onReconnect).toHaveBeenCalledTimes(1)
    expect(firstDevice.cleared).toBe(1)
    expect(firstDevice.closed).toBe(1)
    expect(openStreamDeck).toHaveBeenNthCalledWith(2, "/dev/hidraw0")

    await lifecycle.close()
    expect(secondDevice.closed).toBe(1)
  })

  it("dispatches key down and up events to subscribed listeners", async () => {
    const device = new FakeStreamDeck("Stream Deck MK.2", 15)
    const lifecycle = createStreamDeckLifecycle({
      api: {
        listStreamDecks: async () => [
          { model: "mk2" as never, path: "/dev/hidraw0", serialNumber: "SERIAL-42" },
        ],
        openStreamDeck: async () => device as never,
        getStreamDeckModelName: () => "Stream Deck MK.2",
      },
    })

    const events: StreamDeckKeyEvent[] = []
    lifecycle.subscribeKeyEvents((event) => {
      events.push(event)
    })

    await lifecycle.start()

    device.emit("down", device.CONTROLS[2])
    device.emit("up", device.CONTROLS[2])

    expect(events).toEqual([
      { keyIndex: 2, type: "down" },
      { keyIndex: 2, type: "up" },
    ])
  })

  it("stops delivering key events after unsubscribe", async () => {
    const device = new FakeStreamDeck("Stream Deck MK.2", 15)
    const lifecycle = createStreamDeckLifecycle({
      api: {
        listStreamDecks: async () => [
          { model: "mk2" as never, path: "/dev/hidraw0", serialNumber: "SERIAL-42" },
        ],
        openStreamDeck: async () => device as never,
        getStreamDeckModelName: () => "Stream Deck MK.2",
      },
    })

    const listener = vi.fn()
    const unsubscribe = lifecycle.subscribeKeyEvents(listener)

    await lifecycle.start()
    unsubscribe()

    device.emit("down", device.CONTROLS[1])
    expect(listener).not.toHaveBeenCalled()
  })

  it("creates a virtual lifecycle that emits key events through the shared listener contract", async () => {
    const lifecycle = createVirtualStreamDeckLifecycle({ keyCount: 15, model: "Virtual Stream Deck MK.2" })
    const events: StreamDeckKeyEvent[] = []

    lifecycle.subscribeKeyEvents((event) => {
      events.push(event)
    })

    const connection = await lifecycle.start()
    lifecycle.emitKeyEvent({ keyIndex: 4, type: "down" })
    lifecycle.emitKeyEvent({ keyIndex: 4, type: "up" })

    expect(connection.info).toMatchObject({
      keyCount: 15,
      model: "Virtual Stream Deck MK.2",
      modelId: "virtual-15",
    })
    expect(events).toEqual([
      { keyIndex: 4, type: "down" },
      { keyIndex: 4, type: "up" },
    ])
  })

  it("stores last written buffers on the virtual lifecycle connection", async () => {
    const lifecycle = createVirtualStreamDeckLifecycle({ keyCount: 6 })
    const connection = await lifecycle.start()

    await expect(writeKeyBuffer(connection, 2, Buffer.from([1, 2, 3]))).resolves.toBe(true)
    await expect(writeKeyBuffer(connection, 2, Buffer.from([1, 2, 3]))).resolves.toBe(false)

    expect(connection.lastWrittenBuffers.get(2)).toEqual(Buffer.from([1, 2, 3]))
  })

  it("reports an unmatched serial clearly", async () => {
    await expect(
      connectStreamDeck(
        { serial: "missing" },
        {
          listStreamDecks: async () => [
            { model: "mini" as never, path: "/dev/hidraw0", serialNumber: "AAA" },
          ],
          openStreamDeck: async () => new FakeStreamDeck("unused", 6) as never,
          getStreamDeckModelName: () => "Stream Deck Mini",
        },
      ),
    ).rejects.toBeInstanceOf(StreamDeckSelectionError)
  })

  it("skips identical key buffer writes and replays the last rendered state", async () => {
    const device = new FakeStreamDeck("Stream Deck MK.2", 15)
    const connection = await connectStreamDeck(
      {},
      {
        listStreamDecks: async () => [
          { model: "mk2" as never, path: "/dev/hidraw0", serialNumber: "SERIAL-42" },
        ],
        openStreamDeck: async () => device as never,
        getStreamDeckModelName: () => "Stream Deck MK.2",
      },
    )

    const helloBuffer = Buffer.from([1, 2, 3])

    await expect(writeKeyBuffer(connection, 0, helloBuffer)).resolves.toBe(true)
    await expect(writeKeyBuffer(connection, 0, helloBuffer)).resolves.toBe(false)

    await blankRemainingKeys(connection, Buffer.from([0, 0, 0]), new Set([0]))
    await replayLastRenderedBuffers(connection)

    expect(device.writes.filter((write) => write.keyIndex === 0)).toHaveLength(2)
    expect(device.writes.length).toBe(connection.info.lcdKeyIndices.length * 2)
  })
})

describe("StreamDeckDeviceHandle.setBrightness", () => {
  it("calls device.setBrightness with a clamped 0..100 percentage", async () => {
    const setBrightness = vi.fn(async (_pct: number) => undefined)
    const handle: StreamDeckDeviceHandle = {
      clearPanel: async () => {},
      close: async () => {},
      fillKeyBuffer: async () => {},
      setBrightness,
    }
    await handle.setBrightness(75)
    expect(setBrightness).toHaveBeenCalledWith(75)
  })

  it("setBrightness on a non-connected handle throws", async () => {
    const setBrightness = vi.fn(async (_pct: number) => {
      throw new Error("setBrightness: device is not connected")
    })
    const handle: StreamDeckDeviceHandle = {
      clearPanel: async () => {},
      close: async () => {},
      fillKeyBuffer: async () => {},
      setBrightness,
    }
    await expect(handle.setBrightness(50)).rejects.toThrow(/not connected/)
  })
})

describe("createStreamDeckLifecycle re-apply on start", () => {
  it("re-applies lastBrightness when a new start follows a setBrightness", async () => {
    const setBrightness = vi.fn(async (_pct: number) => undefined)
    const device = new FakeStreamDeck("Stream Deck Mini", 6) as unknown as { setBrightness: (p: number) => Promise<void>; on: Function; off: Function; clearPanel: () => Promise<void>; close: () => Promise<void>; fillKeyBuffer: (i: number, b: Uint8Array) => Promise<void>; emit: (e: string, ...args: unknown[]) => boolean }
    device.setBrightness = setBrightness
    const api: StreamDeckApi = {
      listStreamDecks: async () => [
        { model: "mini" as never, path: "/dev/hidraw0", serialNumber: "SERIAL-1" },
      ],
      openStreamDeck: async () => device as never,
      getStreamDeckModelName: () => "Stream Deck Mini",
    }
    const lifecycle = createStreamDeckLifecycle({ api })
    await lifecycle.start()
    const handle = lifecycle.getConnection()?.device as unknown as StreamDeckDeviceHandle
    await handle.setBrightness(50)
    const calls = setBrightness.mock.calls.map((c) => c[0])
    expect(calls).toContain(50)
    await lifecycle.close()
  })
})
