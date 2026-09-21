import { mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { createServer } from "node:net"
import { afterEach, describe, expect, it } from "vitest"

import { acquireInstanceLock, isSocketLive } from "../single-instance"
import type { DaemonPaths } from "../daemon"

/**
 * These tests exercise the real socket, not a mock: the whole point of the
 * lock is that the kernel arbitrates it, and a mocked bind would prove nothing
 * about the guarantee. Each test gets its own runtime dir so they can run in
 * parallel without contending for the same path.
 */
const dirs: string[] = []

const makePaths = (): DaemonPaths => {
  const runtimeDir = mkdtempSync(join(tmpdir(), "sd-lock-"))
  dirs.push(runtimeDir)
  return {
    runtimeDir,
    pidFile: join(runtimeDir, "sirenodeck.pid"),
    controlSocket: join(runtimeDir, "sirenodeck.sock"),
    childrenFile: join(runtimeDir, "children.json"),
    dataDir: runtimeDir,
    configPathFile: join(runtimeDir, "config"),
    flagsFile: join(runtimeDir, "flags.json"),
    runtimeStateFile: join(runtimeDir, "runtime-state.json"),
    stateFile: join(runtimeDir, "runtime-state.json"),
  }
}

afterEach(() => {
  for (const dir of dirs.splice(0))
    rmSync(dir, { recursive: true, force: true })
})

describe("single-instance lock", () => {
  it("refuses a second daemon while the first holds the lock", async () => {
    const paths = makePaths()

    const first = await acquireInstanceLock(paths)
    expect(first.kind).toBe("acquired")

    const second = await acquireInstanceLock(paths)
    expect(second.kind).toBe("busy")

    if (first.kind === "acquired") first.lock.release()
  })

  it("names the pid of the daemon that holds it, so start can say who", async () => {
    const paths = makePaths()
    writeFileSync(paths.pidFile, "4242\n")

    const first = await acquireInstanceLock(paths)
    const second = await acquireInstanceLock(paths)

    expect(second.kind === "busy" && second.holderPid).toBe(4242)
    if (first.kind === "acquired") first.lock.release()
  })

  it("lets the next daemon in once the holder releases", async () => {
    const paths = makePaths()

    const first = await acquireInstanceLock(paths)
    if (first.kind === "acquired") first.lock.release()

    const second = await acquireInstanceLock(paths)
    expect(second.kind).toBe("acquired")
    if (second.kind === "acquired") second.lock.release()
  })

  /**
   * A daemon that is SIGKILL'd leaves the socket file behind. That file is not
   * a held lock, and treating it as one is what used to strand the user with
   * "another start is already in progress" until a timeout expired.
   */
  it("takes the lock over a socket file left behind by a dead daemon", async () => {
    const paths = makePaths()
    writeFileSync(join(paths.runtimeDir, "sirenodeck.lock.sock"), "")

    const result = await acquireInstanceLock(paths)

    expect(result.kind).toBe("acquired")
    if (result.kind === "acquired") result.lock.release()
  })

  it("only one of a burst of simultaneous starts wins", async () => {
    const paths = makePaths()

    const results = await Promise.all(
      Array.from({ length: 8 }, () => acquireInstanceLock(paths)),
    )
    const acquired = results.filter((r) => r.kind === "acquired")

    expect(acquired).toHaveLength(1)
    for (const r of acquired) if (r.kind === "acquired") r.lock.release()
  })
})

describe("isSocketLive", () => {
  it("is false for a path nothing is listening on", async () => {
    const paths = makePaths()
    expect(await isSocketLive(join(paths.runtimeDir, "nope.sock"))).toBe(false)
  })

  it("is true while a server is listening", async () => {
    const paths = makePaths()
    const socketPath = join(paths.runtimeDir, "live.sock")
    const server = createServer((s) => s.destroy())
    await new Promise<void>((r) => server.listen(socketPath, r))

    expect(await isSocketLive(socketPath)).toBe(true)

    await new Promise<void>((r) => server.close(() => r()))
  })
})
