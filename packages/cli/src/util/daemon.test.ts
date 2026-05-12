import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { afterEach, beforeEach, describe, expect, it } from "vitest"

import {
  ensurePidDir,
  getPidPath,
  isRunning,
  readPid,
  removePidFile,
  writePid,
} from "./daemon.js"

describe("daemon utilities", () => {
  const originalXdgStateHome = process.env.XDG_STATE_HOME
  let tempStateHome: string

  beforeEach(() => {
    tempStateHome = mkdtempSync(join(tmpdir(), "sireno-state-"))
    process.env.XDG_STATE_HOME = tempStateHome
  })

  afterEach(() => {
    if (originalXdgStateHome === undefined) {
      delete process.env.XDG_STATE_HOME
    } else {
      process.env.XDG_STATE_HOME = originalXdgStateHome
    }

    rmSync(tempStateHome, { recursive: true, force: true })
  })

  it("writePid creates a file with the provided PID", () => {
    writePid(4242)

    expect(existsSync(getPidPath())).toBe(true)
    expect(readPid()).toBe(4242)
  })

  it("readPid returns the PID previously written", () => {
    writePid(1337)

    expect(readPid()).toBe(1337)
  })

  it("readPid returns null when no PID file exists", () => {
    expect(readPid()).toBeNull()
  })

  it("removePidFile deletes the PID file", () => {
    writePid(777)

    removePidFile()

    expect(existsSync(getPidPath())).toBe(false)
    expect(readPid()).toBeNull()
  })

  it("readPid returns null when PID file content is invalid", () => {
    ensurePidDir()
    writeFileSync(getPidPath(), "not-a-pid", "utf-8")

    expect(readPid()).toBeNull()
  })

  it("isRunning returns false for a non-existent PID", () => {
    expect(isRunning(99999999)).toBe(false)
  })
})
