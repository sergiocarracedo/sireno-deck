import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import { existsSync, readFileSync, unlinkSync, writeFileSync, mkdirSync } from "node:fs"
import { join } from "node:path"
import { tmpdir } from "node:os"

const { readConfigPath, writeConfigPath, removeConfigPathFile, terminateChildren } = await import("@/util/daemon")

const testDir = join(tmpdir(), `daemon-test-${Date.now()}`)
const testPaths = {
  runtimeDir: testDir,
  pidFile: join(testDir, "test.pid"),
  tokenFile: join(testDir, "test.token"),
  childrenFile: join(testDir, "test.children.json"),
  configPathFile: join(testDir, "test.config"),
}

beforeEach(() => {
  mkdirSync(testDir, { recursive: true })
})

const cleanup = () => {
  try {
    if (existsSync(testPaths.configPathFile)) unlinkSync(testPaths.configPathFile)
  } catch {}
  try {
    if (existsSync(testDir)) {
      for (const f of ["Sireno-deck.pid", "Sireno-deck.token", "Sireno-deck.children.json", "Sireno-deck.config"]) {
        const p = join(testDir, f)
        if (existsSync(p)) unlinkSync(p)
      }
    }
  } catch {}
}

describe("configPath state file", () => {
  afterEach(cleanup)

  it("writeConfigPath writes the config path", () => {
    writeConfigPath("/path/to/config.yml", testPaths)
    expect(existsSync(testPaths.configPathFile)).toBe(true)
  })

  it("readConfigPath returns the written path", () => {
    writeConfigPath("/my/config.yml", testPaths)
    expect(readConfigPath(testPaths)).toBe("/my/config.yml")
  })

  it("readConfigPath returns null if file does not exist", () => {
    expect(readConfigPath(testPaths)).toBeNull()
  })

  it("readConfigPath returns null for empty file", () => {
    writeFileSync(testPaths.configPathFile, "\n", { encoding: "utf8" })
    expect(readConfigPath(testPaths)).toBeNull()
  })

  it("removeConfigPathFile removes the file", () => {
    writeConfigPath("/my/config.yml", testPaths)
    removeConfigPathFile(testPaths)
    expect(existsSync(testPaths.configPathFile)).toBe(false)
  })
})

describe("terminateChildren", () => {
  afterEach(cleanup)

  it("does nothing when no children file exists", async () => {
    const logger = { debug: vi.fn(), info: vi.fn() }
    const result = await terminateChildren({ logger, paths: testPaths })
    expect(result).toBeUndefined()
    expect(logger.debug).not.toHaveBeenCalled()
  })

  it("does nothing when children list is empty", async () => {
    writeFileSync(testPaths.childrenFile, '{"pids":[]}', { encoding: "utf8" })
    const logger = { debug: vi.fn(), info: vi.fn() }
    await terminateChildren({ logger, paths: testPaths })
    expect(logger.debug).not.toHaveBeenCalled()
  })
})
