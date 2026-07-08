import type pino from "pino"
import { describe, expect, it } from "vitest"

import { RealOutputClient } from "../real"

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