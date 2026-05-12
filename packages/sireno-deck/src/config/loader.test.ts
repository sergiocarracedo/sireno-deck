import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const loadConfigModule = async () => import("./loader.js")

describe("loadConfig", () => {
  const originalCwd = process.cwd()
  let tempDir: string

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "sireno-config-"))
    process.chdir(tempDir)
  })

  afterEach(() => {
    process.chdir(originalCwd)
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
  })

  it("throws on unknown keys because schema is strict", async () => {
    writeFileSync(
      join(tempDir, "config.yml"),
      ["theme: dark", "unknown_key: true"].join("\n"),
    )

    const { loadConfig } = await loadConfigModule()

    expect(() => loadConfig()).toThrow()
  })

  it("loads from XDG fallback when no cwd config exists", async () => {
    const fakeHome = mkdtempSync(join(tmpdir(), "sireno-home-"))
    mkdirSync(join(fakeHome, ".config", "sireno-deck"), { recursive: true })
    writeFileSync(
      join(fakeHome, ".config", "sireno-deck", "config.yml"),
      ["theme: dark", "addons: []"].join("\n"),
    )
    vi.spyOn(await import("node:os"), "homedir").mockReturnValue(fakeHome)

    const { loadConfig } = await loadConfigModule()
    const config = loadConfig()

    expect(config.theme).toBe("dark")
    rmSync(fakeHome, { recursive: true, force: true })
  })
})
