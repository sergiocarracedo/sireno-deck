import { spawn, type ChildProcess } from "node:child_process"
import { mkdirSync, rmSync, writeFileSync, existsSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { afterEach, beforeEach, describe, expect, it } from "vitest"

import { createLogger } from "@/util/logger"

import { stop } from "../stop"

const silentLogger = () => createLogger({ level: "silent" })

const TEST_DIR = join(tmpdir(), `sireno-deck-stop-test-${process.pid}`)

beforeEach(() => {
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
  writeFileSync(join(TEST_DIR, "sireno-deck.pid"), `${pid}\n`, "utf8")
  writeFileSync(join(TEST_DIR, "sireno-deck.token"), "test-token\n", "utf8")
  writeFileSync(
    join(TEST_DIR, "sireno-deck.children.json"),
    JSON.stringify({ pids: childPids }),
    "utf8",
  )
}

describe("stop", () => {
  it("returns silently when no daemon is running", async () => {
    await stop({ logger: silentLogger() })
    expect(existsSync(join(TEST_DIR, "sireno-deck.pid"))).toBe(false)
  })

  it("removes stale pid file and reports no running daemon", async () => {
    writeFileSync(join(TEST_DIR, "sireno-deck.pid"), "999999\n", "utf8")
    await stop({ logger: silentLogger() })
    expect(existsSync(join(TEST_DIR, "sireno-deck.pid"))).toBe(false)
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
    expect(existsSync(join(TEST_DIR, "sireno-deck.pid"))).toBe(false)
    expect(existsSync(join(TEST_DIR, "sireno-deck.token"))).toBe(false)
    expect(existsSync(join(TEST_DIR, "sireno-deck.children.json"))).toBe(false)
  })

  it("kills children even when the daemon pid is stale", async () => {
    const child = spawnLongLivedChild()
    writeDaemonFiles(99_999_999, [child.pid!])

    await stop({ logger: silentLogger() })

    expect(await waitForExit(child.pid!)).toBe(true)
    expect(existsSync(join(TEST_DIR, "sireno-deck.children.json"))).toBe(false)
  })

  it("removes files when no children are tracked", async () => {
    const daemon = spawnLongLivedChild()
    writeDaemonFiles(daemon.pid!, [])

    await stop({ logger: silentLogger() })

    expect(await waitForExit(daemon.pid!)).toBe(true)
    expect(existsSync(join(TEST_DIR, "sireno-deck.pid"))).toBe(false)
    expect(existsSync(join(TEST_DIR, "sireno-deck.token"))).toBe(false)
  })
})
