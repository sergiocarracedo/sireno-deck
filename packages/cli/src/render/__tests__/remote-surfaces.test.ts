import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { startRemoteSurfaces } from "../remote-surfaces"

describe("remote surfaces", () => {
  it("provisions two encrypted surfaces and keeps the local trust identity", async () => {
    const root = await mkdtemp(join(tmpdir(), "sireno-surfaces-"))
    try {
      const surfaces = await startRemoteSurfaces({
        root,
        addresses: ["127.0.0.1"],
        host: "127.0.0.1",
        frontendPort: 12341,
        configPort: 12342,
        bridgePort: 12343,
        token: "synthetic",
      })
      try {
        expect(surfaces.frontendUrl).toMatch(/^https:\/\/127\.0\.0\.1:\d+\/$/)
        expect(surfaces.configUrl).toMatch(/^https:\/\/127\.0\.0\.1:\d+\/$/)
        expect(surfaces.frontendUrl).not.toBe(surfaces.configUrl)
        expect(surfaces.fingerprint).toMatch(/^[a-f0-9]{64}$/)
      } finally {
        await surfaces.close()
      }
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })
})
