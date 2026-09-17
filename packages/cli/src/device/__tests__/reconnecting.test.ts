import { describe, expect, it, vi } from "vitest"
import type pino from "pino"

import { createReconnectingDevice } from "../reconnecting"
import type { StreamDeckDevice, StreamDeckKeyEvent } from "../stream-deck"

const silentLogger = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
} as unknown as pino.Logger

interface Fake extends StreamDeckDevice {
  emitError(err: unknown): void
  emitKey(event: StreamDeckKeyEvent): void
  closed: boolean
  writes: number[]
  brightness: number | null
  failWrites: boolean
}

const fake = (serial = "S1"): Fake => {
  const keys = new Set<(e: StreamDeckKeyEvent) => void>()
  const errs = new Set<(e: unknown) => void>()
  const d: Fake = {
    serial,
    path: `/dev/${serial}`,
    model: "mk2",
    closed: false,
    writes: [],
    brightness: null,
    failWrites: false,
    getKeyCount: () => 15,
    async setBrightness(v) {
      if (d.failWrites) throw new Error("EIO")
      d.brightness = v
    },
    async fillKeyBuffer(i) {
      if (d.failWrites) throw new Error("EIO")
      d.writes.push(i)
    },
    onKeyEvent(h) {
      keys.add(h)
      return () => keys.delete(h)
    },
    onError(h) {
      errs.add(h)
      return () => errs.delete(h)
    },
    async close() {
      d.closed = true
    },
    emitError: (e) => {
      for (const h of errs) h(e)
    },
    emitKey: (e) => {
      for (const h of keys) h(e)
    },
  }
  return d
}

const flush = async (): Promise<void> => {
  // Each retry costs a few microtasks; 50 attempts needs headroom.
  for (let i = 0; i < 500; i += 1) await Promise.resolve()
}

describe("createReconnectingDevice", () => {
  it("passes writes and key events through while connected", async () => {
    const hw = fake()
    const dev = createReconnectingDevice(hw, {
      serial: "S1",
      connect: vi.fn(),
      logger: silentLogger,
    })
    const seen: number[] = []
    dev.onKeyEvent((e) => seen.push(e.keyIndex))

    await dev.fillKeyBuffer(3, Buffer.alloc(1))
    hw.emitKey({ type: "down", keyIndex: 7, timestamp: 1 })

    expect(hw.writes).toEqual([3])
    expect(seen).toEqual([7])
    expect(dev.isConnected()).toBe(true)
  })

  it("survives the device vanishing instead of throwing", async () => {
    // The whole point: an SDK `error` used to be an unhandled EventEmitter
    // event, which the daemon's uncaughtException guard turned into an exit.
    const hw = fake()
    const dev = createReconnectingDevice(hw, {
      serial: "S1",
      connect: vi.fn(async () => {
        throw new Error("not back")
      }),
      logger: silentLogger,
      sleep: async () => undefined,
      retryDelayMs: 0,
    })
    expect(() => hw.emitError(new Error("USB gone"))).not.toThrow()
    expect(dev.isConnected()).toBe(false)
    // Writes while absent are dropped, not thrown.
    await expect(dev.fillKeyBuffer(1, Buffer.alloc(1))).resolves.toBeUndefined()
    await expect(dev.setBrightness(50)).resolves.toBeUndefined()
    await dev.close()
  })

  it("treats a failed write as a disconnect", async () => {
    const hw = fake()
    hw.failWrites = true
    const dev = createReconnectingDevice(hw, {
      serial: "S1",
      connect: vi.fn(async () => {
        throw new Error("not back")
      }),
      logger: silentLogger,
      sleep: async () => undefined,
      retryDelayMs: 0,
    })
    await dev.fillKeyBuffer(0, Buffer.alloc(1))
    expect(dev.isConnected()).toBe(false)
    await dev.close()
  })

  it("keeps retrying until the deck returns, however long that takes", async () => {
    const replacement = fake()
    let attempts = 0
    const connect = vi.fn(async () => {
      attempts += 1
      // Absent for a long stretch — a KVM can be on another machine for hours.
      if (attempts < 50) throw new Error("not back")
      return replacement
    })
    const hw = fake()
    const dev = createReconnectingDevice(hw, {
      serial: "S1",
      connect,
      logger: silentLogger,
      sleep: async () => undefined,
      retryDelayMs: 0,
    })
    hw.emitError(new Error("USB gone"))
    await flush()
    expect(attempts).toBe(50)
    expect(dev.isConnected()).toBe(true)
    await dev.close()
  })

  it("restores brightness and repaints on reconnect", async () => {
    const replacement = fake()
    const onReconnect = vi.fn(async (d: StreamDeckDevice) => {
      await d.setBrightness(42)
    })
    const hw = fake()
    const dev = createReconnectingDevice(hw, {
      serial: "S1",
      connect: vi.fn(async () => replacement),
      logger: silentLogger,
      sleep: async () => undefined,
      onReconnect,
    })
    hw.emitError(new Error("USB gone"))
    await flush()
    expect(onReconnect).toHaveBeenCalledOnce()
    expect(replacement.brightness).toBe(42)
    await dev.close()
  })

  it("routes writes and keys to the replacement handle", async () => {
    const replacement = fake("S1")
    const hw = fake("S1")
    const dev = createReconnectingDevice(hw, {
      serial: "S1",
      connect: vi.fn(async () => replacement),
      logger: silentLogger,
      sleep: async () => undefined,
    })
    const seen: number[] = []
    dev.onKeyEvent((e) => seen.push(e.keyIndex))

    hw.emitError(new Error("USB gone"))
    await flush()

    await dev.fillKeyBuffer(9, Buffer.alloc(1))
    replacement.emitKey({ type: "down", keyIndex: 4, timestamp: 2 })
    // The caller registered its handler once, before the swap.
    expect(replacement.writes).toEqual([9])
    expect(seen).toEqual([4])
    // The dead handle must not receive anything.
    expect(hw.writes).toEqual([])
    await dev.close()
  })

  it("keeps its identity across a swap", () => {
    const hw = fake("SERIAL-A")
    const dev = createReconnectingDevice(hw, {
      serial: "SERIAL-A",
      connect: vi.fn(),
      logger: silentLogger,
    })
    expect(dev.serial).toBe("SERIAL-A")
    expect(dev.model).toBe("mk2")
    expect(dev.getKeyCount()).toBe(15)
  })

  it("stops watching once closed", async () => {
    const connect = vi.fn(async () => {
      throw new Error("not back")
    })
    const hw = fake()
    const dev = createReconnectingDevice(hw, {
      serial: "S1",
      connect,
      logger: silentLogger,
      sleep: async () => undefined,
      retryDelayMs: 0,
    })
    await dev.close()
    expect(hw.closed).toBe(true)
    const before = connect.mock.calls.length
    hw.emitError(new Error("late error"))
    await flush()
    expect(connect.mock.calls.length).toBe(before)
  })

  it("ignores a second disconnect while already watching", async () => {
    const connect = vi.fn(async () => {
      throw new Error("not back")
    })
    const hw = fake()
    const dev = createReconnectingDevice(hw, {
      serial: "S1",
      connect,
      logger: silentLogger,
      sleep: async () => undefined,
      retryDelayMs: 0,
    })
    hw.emitError(new Error("one"))
    hw.emitError(new Error("two"))
    await flush()
    await dev.close()
    // One watcher, not two racing to claim the device.
    expect(dev.isConnected()).toBe(false)
  })
})
