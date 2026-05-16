import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { z } from "zod"

import { ConfigValidationError } from "../core/schemas.js"
import { createAddonRegistry } from "../addon/registry.js"

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
        "        type: display-text",
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

  it("accepts disabled illustrative addon declarations in the shipped config shape", async () => {
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
        "        type: display-text",
        "        label: Clock",
        "addons:",
        "  - name: local-clock-addon",
        "    enabled: false",
        "    source: local",
        "    path: addons/local-clock-addon",
        "  - name: \"@sireno-deck/community-addon\"",
        "    enabled: false",
        "    source: npm",
        "logging:",
        "  level: info",
      ].join("\n"),
    )

    const { loadBootstrapConfig, loadConfig } = await loadConfigModule()
    const bootstrap = loadBootstrapConfig()
    const config = loadConfig()

    expect(bootstrap.config.addons).toEqual([
      { enabled: false, name: "local-clock-addon", path: "addons/local-clock-addon", source: "local" },
      { enabled: false, name: "@sireno-deck/community-addon", source: "npm" },
    ])
    expect(config.addons).toEqual(bootstrap.config.addons)
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
        "        type: display-text",
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
        "        type: display-text",
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
        "        type: display-text",
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
      type: "display-text",
    })
    expect(config.decks.main?.buttons[0]?.definition.type).toBe("display-text")
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

  it("validates externally registered addon payloads and preserves line information", async () => {
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
        "        type: external-clock",
        "addons: []",
      ].join("\n"),
    )

    const registry = createAddonRegistry()
    registry.registerAddon({
      apiVersion: 1,
      name: "external-addon",
      buttons: [
        {
          type: "external-clock",
          configSchema: z.object({
            label: z.string().min(1),
          }),
          createInstance() {
            return {
              render() {
                return null as never
              },
            }
          },
        },
      ],
    })

    const { loadConfig } = await loadConfigModule()

    try {
      loadConfig(undefined, registry)
    } catch (error) {
      expect(error).toBeInstanceOf(ConfigValidationError)
      expect((error as ConfigValidationError).lineNumber).toBe(7)
      expect((error as ConfigValidationError).pathSegments).toEqual(["decks", "main", "buttons", 0, "label"])
      return
    }

    throw new Error("Expected external addon payload validation to fail")
  })

  it("expands bundled addon deck types and resolves addon asset paths", async () => {
    writeFileSync(
      join(tempDir, "config.yml"),
      [
        "theme: dark",
        "main_deck: emoji",
        "decks:",
        "  emoji:",
        "    id: emoji",
        "    type: emoji-selector",
        "    favorites:",
        "      - 😀",
        "    select_command: \"printf '%s' '{{emoji}}'\"",
        "addons: []",
      ].join("\n"),
    )

    const { loadConfig } = await loadConfigModule()
    const config = loadConfig()

    expect(config.decks.emoji?.deckType).toBe("emoji-selector")
    expect(config.decks.emoji?.buttons[0]).toMatchObject({
      icon: expect.stringContaining("favorites.svg"),
      label: "Favorites",
      target_deck: "emoji-favorites",
      type: "emoji-category-button",
    })
    expect(config.decks["emoji-favorites"]?.buttons[1]).toMatchObject({
      icon: expect.stringContaining("back.svg"),
      label: "Back",
      type: "emoji-back-button",
    })
  })
})
