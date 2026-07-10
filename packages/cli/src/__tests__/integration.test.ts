import { mkdtempSync, writeFileSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { describe, expect, it, afterAll } from "vitest"

import { AddonRegistry } from "@/addon/registry"
import { internalSettingsAddon } from "@/builtin-addons/internal-settings/index"
import { coreAddon } from "@/builtin-addons/core/index"
import { sessionAddon } from "@/builtin-addons/session/index"
import { createDeckRuntime, type RuntimeDeck } from "@/deck/index"
import { loadConfig } from "@/config/loader"
import { validateFull } from "@/config/validation"
import { createLogger } from "@/util/logger"

const tmpDir = mkdtempSync(join(tmpdir(), "sireno-integration-"))
afterAll(() => rmSync(tmpDir, { recursive: true, force: true }))

const writeConfig = (yaml: string): string => {
  const path = join(tmpDir, "config.yml")
  writeFileSync(path, yaml, "utf8")
  return path
}

const registryWithBuiltins = (): AddonRegistry => {
  const reg = new AddonRegistry()
  reg.load(coreAddon)
  reg.load(internalSettingsAddon)
  reg.load(sessionAddon)
  return reg
}

const silentLogger = () => createLogger({ level: "silent" })

describe("integration: full pipeline", () => {
  it("loads config, validates, registers addons, navigates, runs command", async () => {
    const path = writeConfig(`
decks:
  main:
    name: Home
    buttons:
      - position: 0
        type: core:change-deck
        config:
          deck: media
      - position: 1
        type: core:action
        actions:
          tap: 'echo integration'
        config:
          label: Integration
  media:
    name: Media
    buttons: []
`)
    const result = loadConfig({ configPath: path })
    expect(result.config.decks.main).toBeDefined()
    const reg = registryWithBuiltins()
    const full = validateFull(result.config, reg)
    expect(full.issues).toEqual([])

    const decks: RuntimeDeck[] = Object.entries(result.config.decks).map(
      ([id, deck]) => ({
        id,
        name: deck.name ?? id,
        buttons: (
          deck.buttons as Array<{
            position?: number
            id?: string
            type: string
            config?: unknown
          }>
        ).map((b, i) => ({
          id: b.id ?? `btn-${i}`,
          type: b.type,
          config: b.config,
        })),
        isMain: id === "main",
      }),
    )

    const { runtime, methods } = createDeckRuntime({
      decks,
      logger: silentLogger(),
    })

    runtime.registerButtonHandler("main:btn-0", {
      onTap: () => methods.navigateToDeck({ id: "media" }),
    })
    runtime.registerButtonHandler("main:btn-1", {
      onTap: async () => {
        await methods.dispatch("echo integration")
      },
    })

    expect(runtime.getActiveDeckId()).toBe("main")
    await runtime.dispatchGesture("btn-0", "tap")
    expect(runtime.getActiveDeckId()).toBe("media")

    await runtime.dispatchGesture("btn-1", "tap")
    void runtime.getActiveDeckId()
  })

  it("rejects internal: true buttons in user config", () => {
    const path = writeConfig(`
decks:
  main:
    name: Home
    buttons:
      - position: 0
        type: internal-settings:brightness
        config: {}
`)
    const result = loadConfig({ configPath: path })
    const reg = registryWithBuiltins()
    const full = validateFull(result.config, reg)
    expect(full.issues.some((i) => i.message.includes("Internal button"))).toBe(
      true,
    )
  })

  it("internal-settings deck factory returns a settings deck", () => {
    const factory = internalSettingsAddon.decks!["internal-settings:settings"]!
    const deck = factory(0)
    expect(deck).toBeDefined()
    expect((deck.buttons ?? []).length).toBeGreaterThan(0)
  })
})
