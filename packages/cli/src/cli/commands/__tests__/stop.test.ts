import { spawn, type ChildProcess } from "node:child_process"
import { mkdirSync, rmSync, writeFileSync, existsSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { createLogger } from "@/util/logger"

const { isUnitInstalled, invokeManager } = vi.hoisted(() => ({
  isUnitInstalled: vi.fn(() => false),
  invokeManager: vi.fn(async () => undefined),
}))
vi.mock("../service-manager", () => ({ isUnitInstalled, invokeManager }))

import { stop } from "../stop"

const silentLogger = () => createLogger({ level: "silent" })

const TEST_DIR = join(tmpdir(), `sirenodeck-stop-test-${process.pid}`)

beforeEach(() => {
  vi.clearAllMocks()
  isUnitInstalled.mockReturnValue(false)
  if (existsSync(TEST_DIR)) rmSync(TEST_DIR, { recursive: true, force: true })
  mkdirSync(TEST_DIR, { recursive: true })
  process.env["XDG_RUNTIME_DIR"] = TEST_DIR
})

afterEach(() => {
  delete process.env["XDG_RUNTIME_DIR"]
  if (existsSync(TEST_DIR)) rmSync(TEST_DIR, { recursive: true, force: true })
})

const spawnLongLivedChild = (): ChildProcess => {
  const child = spawn(process.execPath, ["-e", "setInterval(() => {}, 1000)"], {
    stdio: "ignore",
  })
  if (child.pid === undefined) throw new Error("child has no pid")
  return child
}

const waitForExit = (pid: number, timeoutMs = 6_000): Promise<boolean> => {
  return new Promise((resolve) => {
    const start = Date.now()
    const tick = (): void => {
      try {
        process.kill(pid, 0)
        if (Date.now() - start > timeoutMs) {
          resolve(false)
          return
        }
        setTimeout(tick, 50)
      } catch {
        resolve(true)
      }
    }
    tick()
  })
}

const writeDaemonFiles = (pid: number, childPids: number[]): void => {
  writeFileSync(join(TEST_DIR, "sirenodeck.pid"), `${pid}\n`, "utf8")
  writeFileSync(
    join(TEST_DIR, "sirenodeck.children.json"),
    JSON.stringify({ pids: childPids }),
    "utf8",
  )
}

describe("stop", () => {
  it("stops the service manager even when the pid file is missing", async () => {
    isUnitInstalled.mockReturnValue(true)
    const logger = silentLogger()
    await stop({ logger })
    expect(invokeManager).toHaveBeenCalledWith({ action: "stop", logger })
  })

  it("stops the service before terminating a remaining daemon", async () => {
    isUnitInstalled.mockReturnValue(true)
    const daemon = spawnLongLivedChild()
    writeDaemonFiles(daemon.pid!, [])
    invokeManager.mockImplementationOnce(async () => {
      expect(daemon.exitCode).toBeNull()
    })
    await stop({ logger: silentLogger() })
    expect(invokeManager).toHaveBeenCalledOnce()
    expect(await waitForExit(daemon.pid!)).toBe(true)
  })

  it("does not kill a daemon when stopping its service fails", async () => {
    isUnitInstalled.mockReturnValue(true)
    invokeManager.mockRejectedValueOnce(new Error("service stop failed"))
    const daemon = spawnLongLivedChild()
    writeDaemonFiles(daemon.pid!, [])
    try {
      await expect(stop({ logger: silentLogger() })).rejects.toThrow(
        "service stop failed",
      )
      expect(existsSync(join(TEST_DIR, "sirenodeck.pid"))).toBe(true)
      expect(daemon.exitCode).toBeNull()
    } finally {
      daemon.kill()
    }
  })
  it("returns silently when no daemon is running", async () => {
    await stop({ logger: silentLogger() })
    expect(existsSync(join(TEST_DIR, "sirenodeck.pid"))).toBe(false)
  })

  it("removes stale pid file and reports no running daemon", async () => {
    writeFileSync(join(TEST_DIR, "sirenodeck.pid"), "999999\n", "utf8")
    await stop({ logger: silentLogger() })
    expect(existsSync(join(TEST_DIR, "sirenodeck.pid"))).toBe(false)
  })

  it("kills a real running daemon with its children", async () => {
    const daemon = spawnLongLivedChild()
    const child1 = spawnLongLivedChild()
    const child2 = spawnLongLivedChild()
    writeDaemonFiles(daemon.pid!, [child1.pid!, child2.pid!])

    await stop({ logger: silentLogger() })

    expect(await waitForExit(child1.pid!)).toBe(true)
    expect(await waitForExit(child2.pid!)).toBe(true)
    expect(await waitForExit(daemon.pid!)).toBe(true)
    expect(existsSync(join(TEST_DIR, "sirenodeck.pid"))).toBe(false)
    expect(existsSync(join(TEST_DIR, "sirenodeck.children.json"))).toBe(false)
  })

  it("kills children even when the daemon pid is stale", async () => {
    const child = spawnLongLivedChild()
    writeDaemonFiles(99_999_999, [child.pid!])

    await stop({ logger: silentLogger() })

    expect(await waitForExit(child.pid!)).toBe(true)
    expect(existsSync(join(TEST_DIR, "sirenodeck.children.json"))).toBe(false)
  })

  it("removes files when no children are tracked", async () => {
    const daemon = spawnLongLivedChild()
    writeDaemonFiles(daemon.pid!, [])

    await stop({ logger: silentLogger() })

    expect(await waitForExit(daemon.pid!)).toBe(true)
    expect(existsSync(join(TEST_DIR, "sirenodeck.pid"))).toBe(false)
  })
})
