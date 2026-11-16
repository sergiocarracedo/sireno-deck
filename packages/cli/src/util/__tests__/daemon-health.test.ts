import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { createLogger } from "../logger"
import { requestDaemonHealth, startDaemonControl } from "../daemon-control"
import { runtimeHealth } from "../runtime-health"
import type { DaemonPaths } from "../daemon"

describe("daemon health control", () => {
  it("reports the live runtime and renderer status through its control socket", async () => {
    const dir = mkdtempSync(join(tmpdir(), "sireno-health-"))
    const paths = { controlSocket: join(dir, "control.sock") } as DaemonPaths
    const server = await startDaemonControl(
      "secret",
      paths,
      createLogger({ level: "silent" }),
    )
    try {
      runtimeHealth.setCore("ready")
      runtimeHealth.setRenderer("recovering", 123)
      const result = await requestDaemonHealth(paths)
      expect(result?.core).toBe("ready")
      expect(result?.renderer).toEqual({
        state: "recovering",
        lastFrameAt: 123,
      })
      expect(result?.identity.version).toBeTruthy()
    } finally {
      await new Promise<void>((resolve, reject) =>
        server.close((err) => (err ? reject(err) : resolve())),
      )
      rmSync(dir, { recursive: true, force: true })
      runtimeHealth.setCore("starting")
      runtimeHealth.setRenderer("starting", null)
    }
  })
})
