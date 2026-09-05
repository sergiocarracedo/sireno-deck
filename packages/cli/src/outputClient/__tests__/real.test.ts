import type pino from "pino"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { RealOutputClient } from "../real"

const mocks = vi.hoisted(() => ({
  connectStreamDeck: vi.fn(),
  pushBlackFrame: vi.fn(async () => undefined),
  rendererStart: vi.fn(async () => undefined),
  rendererStop: vi.fn(async () => undefined),
  supervisorStop: vi.fn(async () => undefined),
  supervise: vi.fn(),
}))

vi.mock("@/device/registry", () => ({
  listDevices: vi.fn(),
}))
vi.mock("@/device/stream-deck", () => ({
  connectStreamDeck: mocks.connectStreamDeck,
}))
vi.mock("@/device/black-frame", () => ({
  pushBlackFrame: mocks.pushBlackFrame,
}))
vi.mock("@/render/browser-renderer", () => ({
  BrowserRenderer: vi.fn(function FakeBrowserRenderer() {
    return { start: mocks.rendererStart, stop: mocks.rendererStop }
  }),
}))
vi.mock("@/render/push-raw-image", () => ({
  pushRawImage: vi.fn(async () => undefined),
}))
vi.mock("@/cli/commands/emulator-mode", () => ({
  DEFAULT_FRONTEND_PORT: 5180,
  killChild: vi.fn(),
  resolveConfigUiCwd: vi.fn(() => "/config-ui"),
  resolveFrontendCwd: vi.fn(() => "/frontend"),
  spawnConfigUiVite: vi.fn(),
  spawnFrontendVite: vi.fn(),
}))
vi.mock("@/cli/commands/subprocess-supervisor", () => ({
  DEFAULT_VITE_RETRY_SCHEDULE_MS: [],
  supervise: mocks.supervise,
}))

const silentLogger = (): pino.Logger =>
  ({
    info: () => undefined,
    warn: () => undefined,
    debug: () => undefined,
    error: () => undefined,
    fatal: () => undefined,
    trace: () => undefined,
    child: () => silentLogger(),
    level: "silent",
    silent: () => undefined,
  }) as unknown as pino.Logger

describe("RealOutputClient.validateReady", () => {
  beforeEach(async () => {
    vi.clearAllMocks()
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("throws friendly error when no devices are available", async () => {
    const { listDevices } = await import("@/device/registry")
    vi.mocked(listDevices).mockResolvedValueOnce([])
    const client = new RealOutputClient({ xdgConfigHome: "/tmp" })
    await expect(client.validateReady()).rejects.toThrow(
      /No Stream Deck devices found/,
    )
  })

  it("resolves when at least one device is available", async () => {
    const { listDevices } = await import("@/device/registry")
    vi.mocked(listDevices).mockResolvedValueOnce([
      {
        id: "ABC",
        model: "mk2",
        keyCount: 15,
        label: "MK.2 (ABC)",
        transport: "real",
      },
    ])
    const client = new RealOutputClient({ xdgConfigHome: "/tmp" })
    await expect(client.validateReady()).resolves.toBeUndefined()
  })
})

describe("RealOutputClient.selectDevice", () => {
  it("returns the only device when one is connected and no saved config", async () => {
    const client = new RealOutputClient({ xdgConfigHome: "/tmp" })
    const descriptor = {
      id: "ABC",
      model: "mk2",
      keyCount: 15,
      label: "MK.2 (ABC)",
      transport: "real" as const,
    }
    const result = await client.selectDevice([descriptor], null, silentLogger())
    expect(result).toEqual(descriptor)
  })

  it("uses saved id when present", async () => {
    const client = new RealOutputClient({ xdgConfigHome: "/tmp" })
    const a = {
      id: "AAA",
      model: "mk2",
      keyCount: 15,
      label: "MK.2 (AAA)",
      transport: "real" as const,
    }
    const b = {
      id: "BBB",
      model: "mk2",
      keyCount: 15,
      label: "MK.2 (BBB)",
      transport: "real" as const,
    }
    const result = await client.selectDevice([a, b], "BBB", silentLogger())
    expect(result.id).toBe("BBB")
  })
})

describe("RealOutputClient.storeSelection", () => {
  it("does not throw when given a valid descriptor", async () => {
    const client = new RealOutputClient({ xdgConfigHome: "/tmp" })
    await expect(
      client.storeSelection({
        id: "ABC",
        model: "mk2",
        keyCount: 15,
        label: "MK.2 (ABC)",
        transport: "real",
      }),
    ).resolves.toBeUndefined()
  })
})

describe("RealOutputClient.kind", () => {
  it("is 'real'", () => {
    const client = new RealOutputClient({ xdgConfigHome: "/tmp" })
    expect(client.kind).toBe("real")
  })
})

describe("RealOutputClient.init", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("clears the device when initialization fails after connecting", async () => {
    const device = {
      serial: "ABC",
      path: "/dev/hidraw0",
      model: "mk2",
      getKeyCount: () => 15,
      setBrightness: vi.fn(async () => undefined),
      fillKeyBuffer: vi.fn(async () => undefined),
      onKeyEvent: vi.fn(() => () => undefined),
      close: vi.fn(async () => {
        throw new Error("close failed")
      }),
    }
    mocks.connectStreamDeck.mockResolvedValue(device)
    mocks.rendererStart.mockRejectedValue(new Error("renderer failed"))
    mocks.supervise.mockResolvedValue({
      process: { pid: 1234 },
      stop: mocks.supervisorStop,
    })

    const client = new RealOutputClient({ xdgConfigHome: "/tmp" })
    await client.selectDevice(
      [
        {
          id: "ABC",
          model: "mk2",
          keyCount: 15,
          label: "MK.2 (ABC)",
          transport: "real",
        },
      ],
      null,
      silentLogger(),
    )

    await expect(
      client.init({
        bridge: {
          port: 52937,
          url: "ws://127.0.0.1:52937",
          setDevice: vi.fn(),
        },
        runtime: {},
        pubSub: {
          publish: vi.fn(),
          subscribe: vi.fn(() => () => undefined),
        },
        store: {},
        decks: [],
        theme: { name: "default", apiVersion: 1 },
        themeDir: "/themes",
        frontendUrl: "http://127.0.0.1:5180",
        logger: silentLogger(),
      } as never),
    ).rejects.toThrow("renderer failed")

    expect(mocks.rendererStop).toHaveBeenCalledTimes(1)
    expect(mocks.supervisorStop).toHaveBeenCalledTimes(1)
    expect(mocks.pushBlackFrame).toHaveBeenCalledWith(device, expect.anything())
    expect(device.close).toHaveBeenCalledTimes(1)
    expect(mocks.pushBlackFrame.mock.invocationCallOrder[0]).toBeLessThan(
      device.close.mock.invocationCallOrder[0]!,
    )
    expect((client as unknown as { device: unknown }).device).toBeNull()
  })
})
