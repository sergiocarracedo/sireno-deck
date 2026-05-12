import { EventEmitter } from "node:events"

import { describe, expect, it, vi } from "vitest"

import {
  StreamDeckSelectionError,
  blankRemainingKeys,
  connectStreamDeck,
  createStreamDeckLifecycle,
  replayLastRenderedBuffers,
  writeKeyBuffer,
} from "./stream-deck.js"

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
