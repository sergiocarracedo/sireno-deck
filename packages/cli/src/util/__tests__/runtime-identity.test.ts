import { afterEach, describe, expect, it, vi } from "vitest"

describe("runtime identity", () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  it("marks pnpm dev processes with -dev and a source fingerprint", async () => {
    vi.stubEnv("SIRENO_DEV_MODE", "true")
    vi.resetModules()
    const { runtimeIdentity } = await import("../runtime-identity")
    expect(runtimeIdentity.version).toMatch(/-dev$/)
    expect(runtimeIdentity.buildId).toMatch(/^[a-f0-9]{64}$/)
  })
})
