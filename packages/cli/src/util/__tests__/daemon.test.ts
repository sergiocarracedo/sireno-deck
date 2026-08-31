import {
  chmodSync,
  existsSync,
  mkdirSync,
  readFileSync,
  statSync,
} from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { afterEach, beforeEach, describe, expect, it } from "vitest"

import {
  acquireStartLock,
  generateToken,
  readChildren,
  readToken,
  removeStartLock,
  resolveDaemonPaths,
  terminateChildren,
  writeChildren,
  writeToken,
} from "../daemon"

const TEST_DIR = join(tmpdir(), `sirenodeck-daemon-test-${process.pid}`)

const removeAll = (dir: string): void => {
  const { rmSync } = require("node:fs") as typeof import("node:fs")
  if (existsSync(dir)) rmSync(dir, { recursive: true, force: true })
}

beforeEach(() => {
  removeAll(TEST_DIR)
  mkdirSync(TEST_DIR, { recursive: true })
  process.env["XDG_RUNTIME_DIR"] = TEST_DIR
})

afterEach(() => {
  delete process.env["XDG_RUNTIME_DIR"]
  removeAll(TEST_DIR)
})

describe("resolveDaemonPaths", () => {
  it("returns all three runtime files", () => {
    const paths = resolveDaemonPaths()
    expect(paths.runtimeDir).toBe(TEST_DIR)
    expect(paths.pidFile).toBe(join(TEST_DIR, "sirenodeck.pid"))
    expect(paths.tokenFile).toBe(join(TEST_DIR, "sirenodeck.token"))
    expect(paths.childrenFile).toBe(join(TEST_DIR, "sirenodeck.children.json"))
  })
})

describe("generateToken", () => {
  it("returns a base64url string", () => {
    const t = generateToken()
    expect(t).toMatch(/^[A-Za-z0-9_-]+$/)
    expect(t.length).toBeGreaterThanOrEqual(40)
  })

  it("returns different tokens on each call", () => {
    const a = generateToken()
    const b = generateToken()
    expect(a).not.toBe(b)
  })
})

describe("writeToken / readToken", () => {
  it("round-trips a token", () => {
    const token = generateToken()
    writeToken(token)
    expect(readToken()).toBe(token)
  })

  it("writes with mode 0600", () => {
    if (process.platform === "win32") return
    const token = generateToken()
    writeToken(token)
    const stat = statSync(join(TEST_DIR, "sirenodeck.token"))
    const mode = stat.mode & 0o777
    expect(mode).toBe(0o600)
  })

  it("returns null when file is missing", () => {
    expect(readToken()).toBeNull()
  })

  it("returns null when file is empty", () => {
    const path = join(TEST_DIR, "sirenodeck.token")
    const { writeFileSync } = require("node:fs") as typeof import("node:fs")
    writeFileSync(path, "", "utf8")
    expect(readToken()).toBeNull()
  })
})

describe("writeChildren / readChildren", () => {
  it("round-trips pids", () => {
    writeChildren({ pids: [123, 456, 789] })
    const state = readChildren()
    expect(state).toEqual({ pids: [123, 456, 789] })
  })

  it("filters out non-positive pids", () => {
    writeChildren({ pids: [123, -1, 0, 456, NaN as unknown as number] })
    const state = readChildren()
    expect(state).toEqual({ pids: [123, 456] })
  })

  it("returns null when file is missing", () => {
    expect(readChildren()).toBeNull()
  })

  it("returns null when file is malformed JSON", () => {
    const path = join(TEST_DIR, "sirenodeck.children.json")
    const { writeFileSync } = require("node:fs") as typeof import("node:fs")
    writeFileSync(path, "not json", "utf8")
    expect(readChildren()).toBeNull()
  })

  it("returns null when file has wrong shape", () => {
    const path = join(TEST_DIR, "sirenodeck.children.json")
    const { writeFileSync } = require("node:fs") as typeof import("node:fs")
    writeFileSync(path, JSON.stringify({ foo: "bar" }), "utf8")
    expect(readChildren()).toBeNull()
  })

  it("does not have strict file mode (operational metadata)", () => {
    const path = join(TEST_DIR, "sirenodeck.children.json")
    writeChildren({ pids: [1] })
    expect(existsSync(path)).toBe(true)
    expect(readFileSync(path, "utf8")).toContain('"pids"')
  })
})

describe("writeToken overwrites", () => {
  it("a second writeToken replaces the first", () => {
    writeToken("first-token")
    writeToken("second-token")
    expect(readToken()).toBe("second-token")
  })

  it("does not affect chmod of existing file", () => {
    if (process.platform === "win32") return
    writeToken("first-token")
    chmodSync(join(TEST_DIR, "sirenodeck.token"), 0o644)
    writeToken("second-token")
    const stat = statSync(join(TEST_DIR, "sirenodeck.token"))
    const mode = stat.mode & 0o777
    expect(mode).toBe(0o600)
  })
})

describe("terminateChildren", () => {
  it("no-op when there is no children file", async () => {
    await expect(
      terminateChildren({ logger: undefined }),
    ).resolves.toBeUndefined()
  })

  it("prunes stale entries (dead pids) and leaves the file empty", async () => {
    // writeChildren is bound to the real runtimeDir; use a real but
    // unreachable pid for the stale entry.
    writeChildren({ pids: [2_000_000_001] })
    await terminateChildren({ logger: undefined })
    const state = readChildren()
    expect(state?.pids ?? []).toEqual([])
  })
})

describe("acquireStartLock / removeStartLock", () => {
  const lockPath = (): string => join(TEST_DIR, "sirenodeck.pid.lock")

  const { writeFileSync } = require("node:fs") as typeof import("node:fs")

  it("acquires when no lock file exists and release() removes it", () => {
    const lock = acquireStartLock()
    expect(lock).not.toBeNull()
    expect(existsSync(lockPath())).toBe(true)
    expect(readFileSync(lockPath(), "utf8")).toBe(`${process.pid}\n`)
    lock!.release()
    expect(existsSync(lockPath())).toBe(false)
  })

  it("returns null while a live lock is held by the current process", () => {
    const first = acquireStartLock()
    expect(first).not.toBeNull()
    const second = acquireStartLock()
    expect(second).toBeNull()
    first!.release()
  })

  it("clears a stale lock whose holder pid is dead and re-acquires", () => {
    // Simulate a previous daemon that crashed without releasing — its lock
    // points at a pid that isn't running. Without the dead-PID fast clear
    // we'd have to wait 60s for the mtime fallback.
    writeFileSync(lockPath(), "2000000001\n", "utf8")
    expect(existsSync(lockPath())).toBe(true)

    const lock = acquireStartLock()
    expect(lock).not.toBeNull()
    expect(readFileSync(lockPath(), "utf8")).toBe(`${process.pid}\n`)
    lock!.release()
  })

  it("clears a lock older than 60s even when its pid is unreadable", () => {
    // Backdate the lock file's mtime past the staleness threshold.
    const { utimesSync } = require("node:fs") as typeof import("node:fs")
    writeFileSync(lockPath(), "garbage\n", "utf8")
    const past = (Date.now() - 120_000) / 1000
    utimesSync(lockPath(), past, past)

    const lock = acquireStartLock()
    expect(lock).not.toBeNull()
    lock!.release()
  })

  it("removeStartLock deletes an orphaned lock file", () => {
    writeFileSync(lockPath(), "12345\n", "utf8")
    expect(existsSync(lockPath())).toBe(true)
    removeStartLock()
    expect(existsSync(lockPath())).toBe(false)
  })

  it("removeStartLock is a no-op when no lock file exists", () => {
    expect(existsSync(lockPath())).toBe(false)
    expect(() => removeStartLock()).not.toThrow()
  })
})
