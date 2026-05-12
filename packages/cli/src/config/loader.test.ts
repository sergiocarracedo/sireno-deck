import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { ConfigValidationError } from "../core/schemas.js"

const loadConfigModule = async () => import("./loader.js")

describe("loadConfig", () => {
  const originalCwd = process.cwd()
  const originalXdgConfigHome = process.env.XDG_CONFIG_HOME
  let tempDir: string

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "sireno-config-"))
    process.chdir(tempDir)
  })

  afterEach(() => {
    process.chdir(originalCwd)
    if (originalXdgConfigHome === undefined) {
      delete process.env.XDG_CONFIG_HOME
    } else {
      process.env.XDG_CONFIG_HOME = originalXdgConfigHome
    }
    vi.restoreAllMocks()
    rmSync(tempDir, { recursive: true, force: true })
  })

  it("loads a valid config from the current working directory", async () => {
    writeFileSync(
      join(tempDir, "config.yml"),
      [
        "theme: dark",
        "logging:",
        "  level: info",
        "addons: []",
      ].join("\n"),
    )

    const { loadConfig } = await loadConfigModule()
    const config = loadConfig()

    expect(config.theme).toBe("dark")
    expect(config.logging.level).toBe("info")
  })

  it("throws on invalid YAML", async () => {
    writeFileSync(join(tempDir, "config.yml"), "theme: [oops")

    const { loadConfig } = await loadConfigModule()

    expect(() => loadConfig()).toThrow(/YAML parse error/)

    try {
      loadConfig()
    } catch (error) {
      expect(error).toBeInstanceOf(ConfigValidationError)
      expect((error as ConfigValidationError).filePath).toBe(join(tempDir, "config.yml"))
      expect((error as ConfigValidationError).lineNumber).toBe(2)
      expect((error as ConfigValidationError).suggestion).toContain("Fix the YAML syntax")
    }
  })

  it("throws on unknown keys because schema is strict", async () => {
    writeFileSync(
      join(tempDir, "config.yml"),
      ["theme: dark", "unknown_key: true"].join("\n"),
    )

    const { loadConfig } = await loadConfigModule()

    expect(() => loadConfig()).toThrow()

    try {
      loadConfig()
    } catch (error) {
      expect(error).toBeInstanceOf(ConfigValidationError)
      expect((error as ConfigValidationError).filePath).toBe(join(tempDir, "config.yml"))
      expect((error as ConfigValidationError).lineNumber).toBe(2)
      expect((error as ConfigValidationError).suggestion).toContain("Remove 'unknown_key'")
    }
  })

  it("loads from XDG fallback when no cwd config exists", async () => {
    const fakeConfigHome = mkdtempSync(join(tmpdir(), "sireno-xdg-"))
    mkdirSync(join(fakeConfigHome, "sireno-deck"), { recursive: true })
    writeFileSync(
      join(fakeConfigHome, "sireno-deck", "config.yml"),
      ["theme: dark", "addons: []"].join("\n"),
    )
    process.env.XDG_CONFIG_HOME = fakeConfigHome

    const { loadConfig } = await loadConfigModule()
    const config = loadConfig()

    expect(config.theme).toBe("dark")
    rmSync(fakeConfigHome, { recursive: true, force: true })
  })
})
