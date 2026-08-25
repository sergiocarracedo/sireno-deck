import { afterEach, describe, expect, it, vi } from "vitest"

import { probeAllCached, resetProbeCache } from "../probe-cache"

vi.mock("../probe", () => ({
  probeAll: vi.fn(async () => ({
    platform: "linux",
    homeDir: "/home/test",
    xdgConfigHome: "/home/test/.config",
    session: "x11",
    packageManager: "apt",
    capabilities: {
      keyMacro: { available: true },
      clipboard: { available: true },
      notification: { available: true },
      activeApp: { available: true },
    },
    udev: {
      rulesInstalled: true,
      rulesPath: "/etc/udev/rules.d/70.rules",
      streamDeckConnected: false,
      matchedProductIds: [],
    },
    config: { exists: true, path: "/home/test/.config/sireno-deck/config.yml" },
  })),
}))

const minimalDeps = {
  platform: "linux",
  homeDir: "/home/test",
  xdgConfigHome: "/home/test/.config",
  env: {} as NodeJS.ProcessEnv,
  executor: { run: async () => ({ exitCode: 0, stdout: "", stderr: "" }) },
  fileExists: () => true,
  readFile: () => null,
} as Parameters<typeof probeAllCached>[0]

describe("probeAllCached", () => {
  afterEach(() => {
    resetProbeCache()
    vi.clearAllMocks()
  })

  it("returns the cached report within the TTL", async () => {
    const probeMod = await import("../probe")
    const probeSpy = vi.mocked(probeMod.probeAll)

    const r1 = await probeAllCached(minimalDeps)
    const r2 = await probeAllCached(minimalDeps)
    expect(r1).toBe(r2)
    expect(probeSpy).toHaveBeenCalledTimes(1)
  })

  it("expires after the TTL", async () => {
    const probeMod = await import("../probe")
    const probeSpy = vi.mocked(probeMod.probeAll)

    await probeAllCached(minimalDeps)
    await probeAllCached(minimalDeps, 0)
    expect(probeSpy).toHaveBeenCalledTimes(2)
  })

  it("resetProbeCache forces a fresh probe", async () => {
    const probeMod = await import("../probe")
    const probeSpy = vi.mocked(probeMod.probeAll)

    await probeAllCached(minimalDeps)
    resetProbeCache()
    await probeAllCached(minimalDeps)
    expect(probeSpy).toHaveBeenCalledTimes(2)
  })
})
