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

  it("accepts a configured locked deck reference through the top-level session config", async () => {
    writeFileSync(
      join(tempDir, "config.yml"),
      [
        "theme: dark",
        "main_deck: main",
        "session:",
        "  locked_deck: locked",
        "decks:",
        "  main:",
        "    id: main",
        "    buttons: []",
        "  locked:",
        "    id: locked",
        "    buttons:",
        "      - position: 0",
        "        type: display-text",
        "        label: Locked",
      ].join("\n"),
    )

    const { loadConfig } = await loadConfigModule()
    const config = loadConfig()

    expect(config.session).toEqual({ locked_deck: "locked" })
  })

  it("reports missing locked deck references with line information", async () => {
    writeFileSync(
      join(tempDir, "config.yml"),
      [
        "theme: dark",
        "main_deck: main",
        "session:",
        "  locked_deck: missing",
        "decks:",
        "  main:",
        "    id: main",
        "    buttons: []",
      ].join("\n"),
    )

    const { loadConfig } = await loadConfigModule()

    try {
      loadConfig()
    } catch (error) {
      expect(error).toBeInstanceOf(ConfigValidationError)
      expect((error as ConfigValidationError).message).toContain("Locked deck 'missing' is not defined")
      expect((error as ConfigValidationError).lineNumber).toBe(4)
      expect((error as ConfigValidationError).pathSegments).toEqual(["session", "locked_deck"])
      return
    }

    throw new Error("Expected config validation to fail")
  })

  it("keeps core-owned deck and button backgrounds while preserving strict addon validation", async () => {
    writeFileSync(
      join(tempDir, "config.yml"),
      [
        "theme: dark",
        "main_deck: main",
        "decks:",
        "  main:",
        "    id: main",
        "    background: '#223344'",
        "    buttons:",
        "      - position: 0",
        "        type: display-text",
        "        label: Clock",
        "        background: '#556677'",
      ].join("\n"),
    )

    const { loadConfig } = await loadConfigModule()
    const config = loadConfig()

    expect(config.decks.main?.background).toBe("#223344")
    expect(config.decks.main?.buttons[0]?.background).toBe("#556677")
    expect(config.decks.main?.buttons[0]?.config).toEqual({ label: "Clock" })
  })

  it("reports invalid button background values with line information", async () => {
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
        "        background:",
      ].join("\n"),
    )

    const { loadConfig } = await loadConfigModule()

    try {
      loadConfig()
    } catch (error) {
      expect(error).toBeInstanceOf(ConfigValidationError)
      expect((error as ConfigValidationError).lineNumber).toBe(10)
      expect((error as ConfigValidationError).pathSegments).toEqual(["decks", "main", "buttons", 0, "background"])
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

  it("loads registered wrapper and style primitive references through the core button envelope", async () => {
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
        "        label: Clock",
        "        wrapper_id: external-addon/shared-card",
        "        style_id: external-addon/accent",
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
      styles: [{ name: "accent", shared: { tone: "accent" } }],
      wrappers: [{ name: "shared-card", wrapper: "shared" }],
    })

    const { loadConfig } = await loadConfigModule()
    const config = loadConfig(undefined, registry)

    expect(config.decks.main?.buttons[0]).toMatchObject({
      config: { label: "Clock" },
      label: "Clock",
      style_id: "external-addon/accent",
      wrapper_id: "external-addon/shared-card",
    })
  })

  it("reports unknown wrapper primitive references with line information", async () => {
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
        "        wrapper_id: missing-addon/shared-card",
      ].join("\n"),
    )

    const { loadConfig } = await loadConfigModule()

    try {
      loadConfig()
    } catch (error) {
      expect(error).toBeInstanceOf(ConfigValidationError)
      expect((error as ConfigValidationError).message).toContain("Unknown wrapper primitive 'missing-addon/shared-card'")
      expect((error as ConfigValidationError).lineNumber).toBe(10)
      expect((error as ConfigValidationError).pathSegments).toEqual(["decks", "main", "buttons", 0, "wrapper_id"])
      return
    }

    throw new Error("Expected wrapper primitive validation to fail")
  })

  it("reports wrong-kind wrapper references with line information", async () => {
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
        "        wrapper_id: external-addon/accent",
        "addons: []",
      ].join("\n"),
    )

    const registry = createAddonRegistry()
    registry.registerAddon({
      apiVersion: 1,
      buttons: [
        {
          type: "display-text",
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
      name: "external-addon",
      styles: [{ name: "accent", shared: { tone: "accent" } }],
    })

    const { loadConfig } = await loadConfigModule()

    try {
      loadConfig(undefined, registry)
    } catch (error) {
      expect(error).toBeInstanceOf(ConfigValidationError)
      expect((error as ConfigValidationError).message).toContain("Wrapper reference 'external-addon/accent' points to a style primitive")
      expect((error as ConfigValidationError).lineNumber).toBe(10)
      expect((error as ConfigValidationError).pathSegments).toEqual(["decks", "main", "buttons", 0, "wrapper_id"])
      return
    }

    throw new Error("Expected wrong-kind wrapper validation to fail")
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

  it("interpolates canonical host-context placeholders during config loading", async () => {
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
        "        label: \"{{host.os.type}} / {{host.os.variant}} / {{host.session.state}}\"",
        "addons: []",
      ].join("\n"),
    )

    const { loadConfig } = await loadConfigModule()
    const config = loadConfig(undefined, undefined, {
      os: {
        type: "linux",
        variant: "ubuntu",
        version: "24.04",
      },
      session: {
        capability: "unknown",
        state: "unknown",
      },
    })

    expect(config.decks.main?.buttons[0]).toMatchObject({
      config: { label: "linux / ubuntu / unknown" },
      label: "linux / ubuntu / unknown",
    })
  })

  it("leaves command placeholders unresolved during config loading", async () => {
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
        "    select_command: \"printf '%s' '{{emoji}} @ {{host.os.type}}'\"",
        "addons: []",
      ].join("\n"),
    )

    const { loadConfig } = await loadConfigModule()
    const config = loadConfig(undefined, undefined, {
      os: {
        type: "linux",
        variant: "ubuntu",
        version: "24.04",
      },
      session: {
        capability: "unknown",
        state: "unknown",
      },
    })

    expect(config.decks["emoji-favorites"]?.buttons[0]).toMatchObject({
      select_command: "printf '%s' '{{emoji}} @ {{host.os.type}}'",
    })
  })

  it("loads the committed Phase 11 host-context fixture through render and action-bearing config paths", async () => {
    const fixturePath = join(originalCwd, "fixtures/phase-11/config.host-context.yml")
    const { loadConfig } = await loadConfigModule()
    const config = loadConfig(fixturePath, undefined, {
      os: {
        type: "linux",
        variant: "ubuntu",
        version: "24.04",
      },
      session: {
        capability: "unknown",
        state: "unknown",
      },
    })

    expect(config.decks.main?.buttons[0]).toMatchObject({
      config: { label: "linux / ubuntu / unknown" },
      label: "linux / ubuntu / unknown",
      type: "display-text",
    })
    expect(config.decks["emoji-favorites"]?.buttons[0]).toMatchObject({
      select_command: "printf '%s' '{{emoji}} @ {{host.os.type}} @ {{host.session.state}}'",
      type: "emoji-entry-button",
    })
  })

  it("loads bundled internal toggle config through the single-type toggle contract", async () => {
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
        "        type: toggle",
        "        mode: internal",
        "        label: Desk Lamp",
        "        on:",
        "          subtitle: ON",
        "addons: []",
      ].join("\n"),
    )

    const { loadConfig } = await loadConfigModule()
    const config = loadConfig()

    expect(config.decks.main?.buttons[0]).toMatchObject({
      config: {
        initial_state: "off",
        label: "Desk Lamp",
        mode: "internal",
        on: { subtitle: "ON" },
      },
      label: "Desk Lamp",
      type: "toggle",
    })
  })

  it("rejects command-only fields on the internal toggle schema branch with line information", async () => {
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
        "        type: toggle",
        "        mode: internal",
        "        label: Desk Lamp",
        "        set_on_command: \"printf 'on'\"",
        "addons: []",
      ].join("\n"),
    )

    const { loadConfig } = await loadConfigModule()

    try {
      loadConfig()
    } catch (error) {
      expect(error).toBeInstanceOf(ConfigValidationError)
      expect((error as ConfigValidationError).message).toContain("Unknown key 'set_on_command'")
      expect((error as ConfigValidationError).lineNumber).toBe(11)
      expect((error as ConfigValidationError).pathSegments).toEqual(["decks", "main", "buttons", 0, "set_on_command"])
      return
    }

    throw new Error("Expected internal toggle config validation to fail")
  })

  it("loads bundled get-set toggle config through the single-type toggle contract", async () => {
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
        "        type: toggle",
        "        mode: get-set",
        "        label: Desk Lamp",
        "        get_state_command: \"printf 'on'\"",
        "        set_on_command: \"turn-on-lamp\"",
        "        set_off_command: \"turn-off-lamp\"",
        "        on_values:",
        "          - on",
        "        off_values:",
        "          - off",
        "addons: []",
      ].join("\n"),
    )

    const { loadConfig } = await loadConfigModule()
    const config = loadConfig()

    expect(config.decks.main?.buttons[0]).toMatchObject({
      config: {
        get_state_command: "printf 'on'",
        label: "Desk Lamp",
        mode: "get-set",
        off_values: ["off"],
        on_values: ["on"],
        set_off_command: "turn-off-lamp",
        set_on_command: "turn-on-lamp",
      },
      label: "Desk Lamp",
      type: "toggle",
    })
  })

  it("rejects get-set toggle config when required commands are missing", async () => {
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
        "        type: toggle",
        "        mode: get-set",
        "        label: Desk Lamp",
        "        set_on_command: \"turn-on-lamp\"",
        "        set_off_command: \"turn-off-lamp\"",
        "addons: []",
      ].join("\n"),
    )

    const { loadConfig } = await loadConfigModule()

    try {
      loadConfig()
    } catch (error) {
      expect(error).toBeInstanceOf(ConfigValidationError)
      expect((error as ConfigValidationError).message).toContain("Required")
      expect((error as ConfigValidationError).lineNumber).toBe(7)
      expect((error as ConfigValidationError).pathSegments).toEqual(["decks", "main", "buttons", 0, "get_state_command"])
      return
    }

    throw new Error("Expected get-set toggle config validation to fail")
  })

  it("rejects toggle-status fields on the get-set toggle schema branch with line information", async () => {
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
        "        type: toggle",
        "        mode: get-set",
        "        label: Desk Lamp",
        "        get_state_command: \"printf 'on'\"",
        "        set_on_command: \"turn-on-lamp\"",
        "        set_off_command: \"turn-off-lamp\"",
        "        toggle_command: \"toggle-lamp\"",
        "addons: []",
      ].join("\n"),
    )

    const { loadConfig } = await loadConfigModule()

    try {
      loadConfig()
    } catch (error) {
      expect(error).toBeInstanceOf(ConfigValidationError)
      expect((error as ConfigValidationError).message).toContain("Unknown key 'toggle_command'")
      expect((error as ConfigValidationError).lineNumber).toBe(14)
      expect((error as ConfigValidationError).pathSegments).toEqual(["decks", "main", "buttons", 0, "toggle_command"])
      return
    }

    throw new Error("Expected wrong-branch get-set toggle validation to fail")
  })

  it("rejects empty get-set token lists with line information", async () => {
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
        "        type: toggle",
        "        mode: get-set",
        "        label: Desk Lamp",
        "        get_state_command: \"printf 'on'\"",
        "        set_on_command: \"turn-on-lamp\"",
        "        set_off_command: \"turn-off-lamp\"",
        "        on_values: []",
        "addons: []",
      ].join("\n"),
    )

    const { loadConfig } = await loadConfigModule()

    try {
      loadConfig()
    } catch (error) {
      expect(error).toBeInstanceOf(ConfigValidationError)
      expect((error as ConfigValidationError).lineNumber).toBe(14)
      expect((error as ConfigValidationError).pathSegments).toEqual(["decks", "main", "buttons", 0, "on_values"])
      return
    }

    throw new Error("Expected get-set token list validation to fail")
  })

  it("loads bundled toggle-status config through the single-type toggle contract", async () => {
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
        "        type: toggle",
        "        mode: toggle-status",
        "        label: Desk Lamp",
        "        toggle_command: \"toggle-lamp\"",
        "        status_command: \"read-lamp\"",
        "        on_values:",
        "          - on",
        "        off_values:",
        "          - off",
        "addons: []",
      ].join("\n"),
    )

    const { loadConfig } = await loadConfigModule()
    const config = loadConfig()

    expect(config.decks.main?.buttons[0]).toMatchObject({
      config: {
        label: "Desk Lamp",
        mode: "toggle-status",
        off_values: ["off"],
        on_values: ["on"],
        status_command: "read-lamp",
        toggle_command: "toggle-lamp",
      },
      label: "Desk Lamp",
      type: "toggle",
    })
  })

  it("rejects toggle-status config when status_command is missing", async () => {
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
        "        type: toggle",
        "        mode: toggle-status",
        "        label: Desk Lamp",
        "        toggle_command: \"toggle-lamp\"",
        "addons: []",
      ].join("\n"),
    )

    const { loadConfig } = await loadConfigModule()

    try {
      loadConfig()
    } catch (error) {
      expect(error).toBeInstanceOf(ConfigValidationError)
      expect((error as ConfigValidationError).message).toContain("Required")
      expect((error as ConfigValidationError).lineNumber).toBe(7)
      expect((error as ConfigValidationError).pathSegments).toEqual(["decks", "main", "buttons", 0, "status_command"])
      return
    }

    throw new Error("Expected toggle-status validation to fail")
  })

  it("rejects get-set fields on the toggle-status schema branch with line information", async () => {
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
        "        type: toggle",
        "        mode: toggle-status",
        "        label: Desk Lamp",
        "        toggle_command: \"toggle-lamp\"",
        "        status_command: \"read-lamp\"",
        "        set_on_command: \"turn-on-lamp\"",
        "addons: []",
      ].join("\n"),
    )

    const { loadConfig } = await loadConfigModule()

    try {
      loadConfig()
    } catch (error) {
      expect(error).toBeInstanceOf(ConfigValidationError)
      expect((error as ConfigValidationError).message).toContain("Unknown key 'set_on_command'")
      expect((error as ConfigValidationError).lineNumber).toBe(13)
      expect((error as ConfigValidationError).pathSegments).toEqual(["decks", "main", "buttons", 0, "set_on_command"])
      return
    }

    throw new Error("Expected wrong-branch toggle-status validation to fail")
  })

  it("rejects empty toggle-status token lists with line information", async () => {
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
        "        type: toggle",
        "        mode: toggle-status",
        "        label: Desk Lamp",
        "        toggle_command: \"toggle-lamp\"",
        "        status_command: \"read-lamp\"",
        "        off_values: []",
        "addons: []",
      ].join("\n"),
    )

    const { loadConfig } = await loadConfigModule()

    try {
      loadConfig()
    } catch (error) {
      expect(error).toBeInstanceOf(ConfigValidationError)
      expect((error as ConfigValidationError).lineNumber).toBe(13)
      expect((error as ConfigValidationError).pathSegments).toEqual(["decks", "main", "buttons", 0, "off_values"])
      return
    }

    throw new Error("Expected toggle-status token list validation to fail")
  })
})
