import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { BrowserRenderer } from "@/render/browser-renderer"

import { RealOutputClient } from "../real"

const ctorMock = vi.fn()
const startMock = vi.fn()
const stopMock = vi.fn()

vi.mock("@/render/browser-renderer", () => ({
  BrowserRenderer: vi.fn().mockImplementation(function MockRenderer(
    opts: unknown,
  ) {
    ctorMock(opts)
    return { start: startMock, stop: stopMock }
  }),
}))

const silentLogger = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
  trace: vi.fn(),
  fatal: vi.fn(),
  child: vi.fn(),
  level: "silent",
} as unknown as import("pino").Logger

const baseCtx = () => ({
  frontendUrl: "http://x",
  runtime: {} as never,
  pubSub: { publish: vi.fn(), subscribe: vi.fn(), clear: vi.fn() } as never,
  store: {} as never,
  decks: [],
  theme: { name: "default" },
  logger: silentLogger,
  addonByType: new Map(),
  bridge: {} as never,
})

const mockDevice = () => ({
  serial: "ABC",
  path: "/p",
  model: "original-mk2",
  getKeyCount: () => 15,
  setBrightness: vi.fn(async () => undefined),
  fillKeyBuffer: vi.fn(async () => undefined),
  close: vi.fn(async () => undefined),
})

describe("RealOutputClient", () => {
  beforeEach(() => {
    ctorMock.mockReset()
    startMock.mockReset()
    stopMock.mockReset()
    ;(BrowserRenderer as unknown as ReturnType<typeof vi.fn>).mockClear()
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("constructs BrowserRenderer with the given options", async () => {
    startMock.mockResolvedValueOnce(undefined)
    stopMock.mockResolvedValueOnce(undefined)
    const device = mockDevice()
    await new RealOutputClient({ device }).start({
      ...baseCtx(),
      frontendUrl: "http://example.test:1234",
    })
    expect(ctorMock).toHaveBeenCalledTimes(1)
    const opts = ctorMock.mock.calls[0]![0] as Record<string, unknown>
    expect(opts["frontendUrl"]).toBe("http://example.test:1234?compact=1")
    expect(opts["device"]).toBe(device)
    expect(opts["logger"]).toBe(silentLogger)
  })

  it("forwards intervalMs and pubSub when provided", async () => {
    startMock.mockResolvedValueOnce(undefined)
    stopMock.mockResolvedValueOnce(undefined)
    const pubSub = {
      publish: vi.fn(),
      subscribe: vi.fn(),
      clear: vi.fn(),
    } as never
    const device = mockDevice()
    await new RealOutputClient({ device, intervalMs: 750 }).start({
      ...baseCtx(),
      pubSub,
    })
    const opts = ctorMock.mock.calls[0]![0] as Record<string, unknown>
    expect(opts["intervalMs"]).toBe(750)
    expect(opts["pubSub"]).toBe(pubSub)
  })

  it("calls renderer.start() exactly once", async () => {
    startMock.mockResolvedValueOnce(undefined)
    stopMock.mockResolvedValueOnce(undefined)
    const handle = await new RealOutputClient({ device: mockDevice() }).start(
      baseCtx(),
    )
    expect(startMock).toHaveBeenCalledTimes(1)
    void handle
  })

  it("stop() calls renderer.stop() then device.close() in order", async () => {
    const order: string[] = []
    startMock.mockImplementationOnce(async () => {
      order.push("start")
    })
    stopMock.mockImplementationOnce(async () => {
      order.push("renderer.stop")
    })
    const device = mockDevice()
    device.close.mockImplementationOnce(async () => {
      order.push("device.close")
    })
    const handle = await new RealOutputClient({ device }).start(baseCtx())
    await handle.stop()
    expect(order).toEqual(["start", "renderer.stop", "device.close"])
  })

  it("propagates errors from renderer.start() and does NOT call device.close", async () => {
    startMock.mockRejectedValueOnce(new Error("boom"))
    const device = mockDevice()
    await expect(
      new RealOutputClient({ device }).start(baseCtx()),
    ).rejects.toThrow("boom")
    expect(device.close).not.toHaveBeenCalled()
  })

  it("device.close is called even if renderer.stop throws", async () => {
    startMock.mockResolvedValueOnce(undefined)
    stopMock.mockRejectedValueOnce(new Error("stop-fail"))
    const device = mockDevice()
    const handle = await new RealOutputClient({ device }).start(baseCtx())
    await expect(handle.stop()).rejects.toThrow("stop-fail")
    expect(device.close).toHaveBeenCalled()
  })
})
