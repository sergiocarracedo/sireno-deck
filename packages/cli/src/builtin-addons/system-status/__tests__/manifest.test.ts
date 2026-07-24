import { describe, expect, it } from "vitest"

import { systemStatusManifest } from "../manifest"

describe("systemStatusManifest", () => {
  it("registers exactly two button types", () => {
    expect(Object.keys(systemStatusManifest.buttonTypes).sort()).toEqual([
      "system-status:kpis",
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

  it("binds a poller per metric to runtime:system-status:<id>", () => {
    const pollers = systemStatusManifest.globalService?.pollers ?? []
    const channels = pollers.map((p) => p.channel).sort()
    expect(channels).toEqual([
      "runtime:system-status:battery",
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
})
