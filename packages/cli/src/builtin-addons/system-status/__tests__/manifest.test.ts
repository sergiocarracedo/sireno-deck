import { afterEach, describe, expect, it, vi } from "vitest"

import { systemStatusManifest } from "../manifest"

describe("systemStatusManifest", () => {
  afterEach(() => vi.unstubAllEnvs())

  it("registers exactly one button type", () => {
    expect(Object.keys(systemStatusManifest.buttonTypes)).toEqual([
      "system-status:system-status",
    ])
  })

  it("does not register the legacy split types", () => {
    const types = Object.keys(systemStatusManifest.buttonTypes)
    expect(types).not.toContain("system-status:cpu")
    expect(types).not.toContain("system-status:ram")
    expect(types).not.toContain("system-status:disk")
    expect(types).not.toContain("system-status:net")
    expect(types).not.toContain("system-status:status")
  })

  it("binds a poller per metric plus chart-history", () => {
    const pollers = systemStatusManifest.globalService?.pollers ?? []
    const channels = pollers.map((p) => p.channel).sort()
    expect(channels).toEqual([
      "runtime:system-status:battery",
      "runtime:system-status:chart-history",
      "runtime:system-status:cpu",
      "runtime:system-status:cpu-boost",
      "runtime:system-status:cpu-voltages",
      "runtime:system-status:disk",
      "runtime:system-status:disk-io",
      "runtime:system-status:fan-rpm",
      "runtime:system-status:frequency",
      "runtime:system-status:gpu-temp",
      "runtime:system-status:gpu-usage",
      "runtime:system-status:load",
      "runtime:system-status:network",
      "runtime:system-status:network-read",
      "runtime:system-status:network-write",
      "runtime:system-status:processes",
      "runtime:system-status:ram",
      "runtime:system-status:swap",
      "runtime:system-status:temperature",
      "runtime:system-status:uptime",
    ])
  })

  it("returns stable capture fixture values for every metric", async () => {
    vi.stubEnv("SIRENO_CAPTURE_FAKE_METRICS", "1")
    const pollers = systemStatusManifest.globalService?.pollers ?? []
    const cpu = await pollers
      .find((poller) => poller.id === "metric:cpu")
      ?.poll({} as never)
    const ram = await pollers
      .find((poller) => poller.id === "metric:ram")
      ?.poll({} as never)
    const swap = await pollers
      .find((poller) => poller.id === "metric:swap")
      ?.poll({} as never)

    expect(cpu).toMatchObject({ value: 42, percentage: 42, available: true })
    expect(ram).toMatchObject({ value: 68, percentage: 68, available: true })
    expect(swap).toMatchObject({ value: 24, percentage: 24, available: true })
  })
})
