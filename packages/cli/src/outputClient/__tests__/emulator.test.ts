import type pino from "pino"
import { describe, expect, it } from "vitest"

import { EmulatorOutputClient } from "../emulator"

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

describe("EmulatorOutputClient.listDevices", () => {
  it("returns virtual descriptors for mk2, xl", async () => {
    const client = new EmulatorOutputClient()
    const devices = await client.listDevices()
    expect(devices).toHaveLength(2)
    const ids = devices.map((d) => d.id).sort()
    expect(ids).toEqual(["emulator:mk2", "emulator:xl"])
    for (const d of devices) {
      expect(d.transport).toBe("emulated")
      expect(d.label).toMatch(/^Emulator /)
      expect(d.keyCount).toBeGreaterThan(0)
    }
  })
})

describe("EmulatorOutputClient.selectDevice", () => {
  it("returns the saved device when savedId matches a virtual id", async () => {
    const client = new EmulatorOutputClient()
    const devices = await client.listDevices()
    const result = await client.selectDevice(
      devices,
      "emulator:xl",
      silentLogger(),
    )
    expect(result.id).toBe("emulator:xl")
  })

  it("falls back to mk2 default when savedId does not match", async () => {
    const client = new EmulatorOutputClient()
    const devices = await client.listDevices()
    const result = await client.selectDevice(devices, "stale", silentLogger())
    expect(result.id).toBe("emulator:mk2")
  })

  it("falls back to mk2 default when savedId is null", async () => {
    const client = new EmulatorOutputClient()
    const devices = await client.listDevices()
    const result = await client.selectDevice(devices, null, silentLogger())
    expect(result.id).toBe("emulator:mk2")
  })
})

describe("EmulatorOutputClient.validateReady", () => {
  it("resolves (emulator virtual devices always exist)", async () => {
    const client = new EmulatorOutputClient()
    await expect(client.validateReady()).resolves.toBeUndefined()
  })
})

describe("EmulatorOutputClient.storeSelection", () => {
  it("is a no-op (no persistent config for emulator)", async () => {
    const client = new EmulatorOutputClient()
    await expect(
      client.storeSelection({
        id: "emulator:mk2",
        model: "mk2",
        keyCount: 15,
        label: "Emulator MK.2",
        transport: "emulated",
      }),
    ).resolves.toBeUndefined()
  })
})

describe("EmulatorOutputClient.init", () => {
  it("does not throw 'selectDevice() must run first' after selectDevice runs", async () => {
    const client = new EmulatorOutputClient()
    const devices = await client.listDevices()
    await client.selectDevice(devices, null, silentLogger())
    // init() will reject downstream (spawnEmulatorVite can't run in unit test env);
    // we only assert the descriptor guard from selectDevice has been removed.
    await expect(
      client.init({
        bridge: {
          port: 0,
          url: "ws://x",
          setDevice: () => undefined,
          broadcast: () => undefined,
          onMessage: () => () => undefined,
          onConnection: () => undefined,
          close: async () => undefined,
          registerCacheablePoller: () => undefined,
        },
        runtime: {} as never,
        pubSub: {
          publish: () => undefined,
          subscribe: () => () => undefined,
          clear: () => undefined,
        },
        store: {
          get: () => undefined,
          set: () => undefined,
          delete: () => undefined,
        },
        decks: [],
        theme: { name: "x", apiVersion: 1 },
        themeDir: "/x",
        logger: silentLogger(),
        addonByType: new Map(),
      }),
    ).rejects.not.toThrow(/selectDevice\(\) must run first/)
  })
})
