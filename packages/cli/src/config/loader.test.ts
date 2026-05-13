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
        "main_deck: main",
        "decks:",
        "  main:",
        "    id: main",
        "    buttons:",
        "      - position: 0",
        "        type: builtin-display-text",
        "        label: Clock",
        "logging:",
        "  level: info",
        "addons: []",
      ].join("\n"),
    )

    const { loadConfig } = await loadConfigModule()
    const config = loadConfig()

    expect(config.theme).toBe("dark")
    expect(config.main_deck).toBe("main")
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
      [
        "theme: dark",
        "main_deck: main",
        "decks:",
        "  main:",
        "    id: main",
        "    buttons: []",
        "unknown_key: true",
      ].join("\n"),
    )

    const { loadConfig } = await loadConfigModule()

    expect(() => loadConfig()).toThrow()

    try {
      loadConfig()
    } catch (error) {
      expect(error).toBeInstanceOf(ConfigValidationError)
      expect((error as ConfigValidationError).filePath).toBe(join(tempDir, "config.yml"))
      expect((error as ConfigValidationError).lineNumber).toBe(7)
      expect((error as ConfigValidationError).suggestion).toContain("Remove 'unknown_key'")
    }
  })

  it("throws when main_deck is missing from the deck map", async () => {
    writeFileSync(
      join(tempDir, "config.yml"),
      [
        "theme: dark",
        "main_deck: main",
        "decks:",
        "  secondary:",
        "    id: secondary",
        "    buttons: []",
      ].join("\n"),
    )

    const { loadConfig } = await loadConfigModule()

    try {
      loadConfig()
    } catch (error) {
      expect(error).toBeInstanceOf(ConfigValidationError)
      expect((error as ConfigValidationError).lineNumber).toBe(2)
      expect((error as ConfigValidationError).message).toContain("Main deck 'main' is not defined")
      return
    }

    throw new Error("Expected config validation to fail")
  })

  it("throws when a display button has neither label nor icon", async () => {
    writeFileSync(
      join(tempDir, "config.yml"),
      [
        "theme: dark",
        "main_deck: main",
        "decks:",
        "  main:",
        "    id: main",
        "    buttons:",
        "      - position: 0",
        "        type: builtin-display-text",
      ].join("\n"),
    )

    const { loadConfig } = await loadConfigModule()

    try {
      loadConfig()
    } catch (error) {
      expect(error).toBeInstanceOf(ConfigValidationError)
      expect((error as ConfigValidationError).message).toContain("Required")
      expect((error as ConfigValidationError).lineNumber).toBe(7)
      return
    }

    throw new Error("Expected config validation to fail")
  })

  it("loads from XDG fallback when no cwd config exists", async () => {
    const fakeConfigHome = mkdtempSync(join(tmpdir(), "sireno-xdg-"))
    mkdirSync(join(fakeConfigHome, "sireno-deck"), { recursive: true })
    writeFileSync(
      join(fakeConfigHome, "sireno-deck", "config.yml"),
      [
        "theme: dark",
        "main_deck: main",
        "decks:",
        "  main:",
        "    id: main",
        "    buttons:",
        "      - position: 0",
        "        type: builtin-display-text",
        "        label: Clock",
        "addons: []",
      ].join("\n"),
    )
    process.env.XDG_CONFIG_HOME = fakeConfigHome

    const { loadConfig } = await loadConfigModule()
    const config = loadConfig()

    expect(config.theme).toBe("dark")
    rmSync(fakeConfigHome, { recursive: true, force: true })
  })

  it("validates addon-backed button payloads through the bundled registry", async () => {
    writeFileSync(
      join(tempDir, "config.yml"),
      [
        "theme: dark",
        "main_deck: main",
        "decks:",
        "  main:",
        "    id: main",
        "    buttons:",
        "      - position: 0",
        "        type: builtin-display-text",
        "        label: Clock",
        "addons: []",
      ].join("\n"),
    )

    const { loadConfig } = await loadConfigModule()
    const config = loadConfig()

    expect(config.decks.main?.buttons[0]).toMatchObject({
      config: { label: "Clock" },
      label: "Clock",
      position: 0,
      type: "builtin-display-text",
    })
    expect(config.decks.main?.buttons[0]?.definition.type).toBe("builtin-display-text")
  })

  it("reports unknown addon button types with line information", async () => {
    writeFileSync(
      join(tempDir, "config.yml"),
      [
        "theme: dark",
        "main_deck: main",
        "decks:",
        "  main:",
        "    id: main",
        "    buttons:",
        "      - position: 0",
        "        type: missing-addon-button",
        "        label: Clock",
      ].join("\n"),
    )

    const { loadConfig } = await loadConfigModule()

    try {
      loadConfig()
    } catch (error) {
      expect(error).toBeInstanceOf(ConfigValidationError)
      expect((error as ConfigValidationError).message).toContain("Unknown button type 'missing-addon-button'")
      expect((error as ConfigValidationError).lineNumber).toBe(8)
      return
    }

    throw new Error("Expected config validation to fail")
  })
})
