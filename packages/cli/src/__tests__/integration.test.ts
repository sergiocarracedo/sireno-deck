import { mkdtempSync, writeFileSync, rmSync, mkdirSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import {
  describe,
  expect,
  it,
  afterAll,
  afterEach,
  beforeEach,
  vi,
} from "vitest"

import { AddonRegistry } from "@/addon/registry"
import { loadAddons } from "@/addon/loader"
import { SIRENO_ADDON_API_VERSION } from "@/addon/api-types"
import { internalSettingsAddon } from "@/builtin-addons/internal-settings/index"
import { coreAddon } from "@/builtin-addons/core/index"
import { sessionAddon } from "@/builtin-addons/session/index"
import { createDeckRuntime, type RuntimeDeck } from "@/deck/index"
import { materializeAddonDecks } from "@/cli/commands/addon-decks"
import { validateAndLoadConfig } from "@/cli/commands/run"
import { loadConfig } from "@/config/loader"
import { validateFull } from "@/config/validation"
import { createLogger } from "@/util/logger"
import type {
  ActiveAppProvider,
  ActiveAppSnapshot,
} from "@/system/providers/active-app"

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
          label: Media
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
        type: internal-settings:brightness-down
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
    const entry = internalSettingsAddon.decks![0]!
    const deck = entry.createDeck!({
      config: undefined,
      deck: { id: "internal-settings:settings" },
      keyCount: 15,
    })
    expect(deck).toBeDefined()
    expect((deck.buttons ?? []).length).toBeGreaterThan(0)
  })
})

interface FakeProvider extends Pick<ActiveAppProvider, "getActive" | "stop"> {
  snapshot: ActiveAppSnapshot | null
  calls: { getActive: number; stop: number }
}
const makeFakeProvider = (initial: ActiveAppSnapshot | null): FakeProvider => {
  const provider: FakeProvider = {
    snapshot: initial,
    calls: { getActive: 0, stop: 0 },
    async getActive() {
      provider.calls.getActive += 1
      return provider.snapshot
    },
    async stop() {
      provider.calls.stop += 1
    },
  }
  return provider
}
const flush = async (ms = 5): Promise<void> => {
  await vi.advanceTimersByTimeAsync(ms)
  await Promise.resolve()
}

const writeChromeOverlayAddon = (dir: string): string => {
  mkdirSync(dir, { recursive: true })
  writeFileSync(
    join(dir, "sirenodeck.json"),
    JSON.stringify({
      kind: "addon",
      apiVersion: 1,
      name: "chrome-overlay",
      entry: "./index.js",
    }),
    "utf8",
  )
  writeFileSync(
    join(dir, "index.js"),
    [
      "'use strict'",
      "module.exports = {",
      "  manifest: {",
      "    apiVersion: 1,",
      "    name: 'chrome-overlay',",
      "    buttonTypes: {},",
      "    decks: [{",
      "      id: 'chrome-overlay:shortcuts',",
      "      name: 'Chrome',",
      "      paginated: true,",
      "      autoShow: true,",
      "      isOverlay: true,",
      "      trigger: { process_name: ['chromium','chrome','chromium-browser','google-chrome','google-chrome-stable','Brave'] },",
      "      buttons: [",
      "        { type: 'core:action', config: { icon: 'icon://x', label: 'New tab' }, actions: { tap: 'macro://ctrl+t' } },",
      "        { type: 'core:action', config: { icon: 'icon://x', label: 'Close tab' }, actions: { tap: 'macro://ctrl+w' } },",
      "      ],",
      "    }],",
      "  },",
      "}",
    ].join("\n"),
    "utf8",
  )
  // CJS-to-ESM interop: dynamic import() of a CJS module wraps the entire
  // exports object as `default`. After unwrapping `.default`, the chrome-
  // overlay addon exposes `{ manifest: {...} }`. The loader must unwrap that
  // too.
  return dir
}

describe("integration: chrome-overlay overlay wiring", () => {
  beforeEach(() => {
    vi.useFakeTimers({
      toFake: [
        "setTimeout",
        "clearTimeout",
        "setInterval",
        "clearInterval",
        "Date",
      ],
    })
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it("diagnostic: loadAddons → registry → materializeAddonDecks → runtime picks chrome-overlay when active-app returns Google Chrome", async () => {
    const addonDir = writeChromeOverlayAddon(
      join(tmpDir, "chrome-overlay-diagnostic"),
    )
    const loadResult = await loadAddons({
      entries: [addonDir],
      configDir: tmpDir,
      homeDir: tmpDir,
      currentApiVersion: SIRENO_ADDON_API_VERSION,
    })
    expect(loadResult.issues).toEqual([])
    expect(loadResult.addons).toHaveLength(1)

    const reg = registryWithBuiltins()
    reg.load(loadResult.addons[0]!.manifest)
    expect(reg.hasDeckType("chrome-overlay:shortcuts")).toBe(true)

    const userDecks: RuntimeDeck[] = [
      { id: "main", name: "Main", buttons: [], isMain: true },
    ]
    const runtimeDecks = materializeAddonDecks(
      reg,
      userDecks,
      silentLogger(),
      15,
    )
    const overlayPages = runtimeDecks.filter((d) =>
      d.id.startsWith("chrome-overlay:shortcuts"),
    )
    expect(overlayPages.length).toBeGreaterThan(0)
    expect(overlayPages[0]!.processNames).toContain("chrome")
    expect(overlayPages[0]!.autoShow).toBe(true)
    expect(
      overlayPages[0]!.processNames !== undefined &&
        overlayPages[0]!.processNames!.length > 0,
    ).toBe(true)

    const { runtime } = createDeckRuntime({
      decks: runtimeDecks,
      logger: silentLogger(),
    })
    runtime.setActiveAppProvider(
      makeFakeProvider({
        name: "Google Chrome",
        windowTitle: "New Tab",
        processId: 1234,
      }),
    )

    expect(runtime.hasOverlayDeckAvailable()).toBe(false)
    await flush(1_000)
    await flush(250)
    expect(runtime.hasOverlayDeckAvailable()).toBe(true)

    await runtime.stopActiveAppPolling()
  })

  it("production path: validateAndLoadConfig wires addons[] → registry → runtime picks chrome-overlay", async () => {
    const addonDir = writeChromeOverlayAddon(
      join(tmpDir, "chrome-overlay-prod"),
    )
    const configPath = writeConfig(`
addons:
  - ${addonDir}
decks:
  main:
    name: Home
    buttons:
      - position: 0
        type: core:action
        actions:
          tap: 'echo integration'
        config:
          label: Integration
`)

    const loaded = await validateAndLoadConfig({
      config: configPath,
      logger: silentLogger(),
      homeDir: tmpDir,
    })
    expect(loaded.registry.hasDeckType("chrome-overlay:shortcuts")).toBe(true)

    const userDecks: RuntimeDeck[] = Object.entries(loaded.config.decks).map(
      ([id, deck]) => ({
        id,
        name: deck.name ?? id,
        buttons: [],
        isMain: id === "main",
      }),
    )
    const runtimeDecks = materializeAddonDecks(
      loaded.registry,
      userDecks,
      silentLogger(),
      15,
    )
    const { runtime } = createDeckRuntime({
      decks: runtimeDecks,
      logger: silentLogger(),
    })
    runtime.setActiveAppProvider(
      makeFakeProvider({
        name: "Google Chrome",
        windowTitle: "New Tab",
        processId: 1234,
      }),
    )

    await flush(1_000)
    await flush(250)
    expect(runtime.hasOverlayDeckAvailable()).toBe(true)

    await runtime.stopActiveAppPolling()
  })
})
