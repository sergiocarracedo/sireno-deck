import { describe, expect, it, vi } from "vitest"

import { AddonRegistry } from "@/addon/registry"
import type { AddonManifestV1 } from "@/addon/api"
import type { RuntimeDeck } from "@/deck/runtime"
import { materializeAddonDecks } from "../addon-decks"
import { createLogger } from "@/util/logger"

const silentLogger = () => createLogger({ level: "silent" })

const makeFakeAddon = (manifest: Partial<AddonManifestV1>): AddonManifestV1 =>
  manifest as AddonManifestV1

const fakeManifestWithDecks = (
  name: string,
  deckEntries: Record<
    string,
    (ctx: { config: unknown; deck: { id: string } }) => Record<string, unknown>
  >,
  defaultButton?: string,
) => {
  // ponytail: each helper entry maps to a multi-dynamic AddonDeckEntry
  // (createDecks). The test factories return a record keyed by the
  // generated deck id — multi-dynamic preserves that key as the runtime
  // deck id.
  const createDecks = (ctx: { config: unknown; deck: { id: string } }) => {
    const out: Record<string, unknown> = {}
    for (const factory of Object.values(deckEntries)) {
      const generated = factory(ctx) as Record<string, unknown>
      Object.assign(out, generated)
    }
    return out
  }
  const decks = [{ createDecks }]
  const buttonTypes: Record<string, unknown> = {}
  if (defaultButton !== undefined) {
    buttonTypes[defaultButton] = { type: "launcher" }
  }
  return makeFakeAddon({
    apiVersion: 1,
    name,
    buttonTypes,
    ...(defaultButton !== undefined ? { defaultButton } : {}),
    decks,
  })
}

const mockRegistry = (addons: AddonManifestV1[]): AddonRegistry => {
  const reg = new AddonRegistry()
  for (const addon of addons) {
    reg.load(addon)
  }
  return reg
}

describe("materializeAddonDecks", () => {
  it("merges addon-generated decks alongside user decks", () => {
    const addon = fakeManifestWithDecks("test-addon", {
      "test-addon:deck-a": () => ({
        "generated-deck-a": { name: "Gen Deck A", buttons: [] },
      }),
    })
    const reg = mockRegistry([addon])
    const userDecks: RuntimeDeck[] = [{ id: "main", name: "Main", buttons: [] }]

    const result = materializeAddonDecks(reg, userDecks, silentLogger(), 15)

    expect(result.length).toBe(2)
    const genDeck = result.find((d) => d.id === "generated-deck-a")
    expect(genDeck?.name).toBe("Gen Deck A")
    expect(result[0].id).toBe("main")
    expect(result[1].id).toBe("generated-deck-a")
  })

  it("skips addon decks whose id collides with a user deck", () => {
    const addon = fakeManifestWithDecks("test-addon", {
      "test-addon:deck-a": () => ({
        main: { name: "Addon Main", buttons: [] },
      }),
    })
    const reg = mockRegistry([addon])
    const userDecks: RuntimeDeck[] = [
      { id: "main", name: "User Main", buttons: [] },
    ]
    const warn = vi.fn()
    const logger = { warn } as ReturnType<typeof silentLogger>

    const result = materializeAddonDecks(reg, userDecks, logger, 15)

    expect(result.length).toBe(1)
    expect(result[0].id).toBe("main")
    expect(result[0].name).toBe("User Main")
    expect(warn).toHaveBeenCalledWith(
      expect.objectContaining({ addon: "test-addon", deckId: "main" }),
      expect.stringContaining("collides"),
    )
  })

  it("maps addon-generated deck buttons to RuntimeDeck button shape", () => {
    const addon = fakeManifestWithDecks("test-addon", {
      "test-addon:deck-a": () => ({
        "gen-deck": {
          name: "Gen",
          buttons: [
            { type: "test-addon:btn", position: 3, config: { label: "hi" } },
            { type: "test-addon:btn2" },
          ],
        },
      }),
    })
    const reg = mockRegistry([addon])
    const userDecks: RuntimeDeck[] = [{ id: "main", name: "Main", buttons: [] }]

    const result = materializeAddonDecks(reg, userDecks, silentLogger(), 15)
    const genDeck = result.find((d) => d.id === "gen-deck")!

    expect(genDeck.buttons).toEqual([
      { id: "3", type: "test-addon:btn", position: 3, config: { label: "hi" } },
      { id: "1", type: "test-addon:btn2" },
    ])
  })

  it("spreads top-level button fields into config", () => {
    const addon = fakeManifestWithDecks("emoji-selector", {
      "emoji-selector:emoji-selector": () => ({
        "emoji-selector": {
          name: "Emoji Selector",
          buttons: [
            {
              emoji: "😀",
              label: "😀",
              position: 0,
              type: "emoji-selector:emoji",
            },
            {
              icon: "⭐",
              label: "Favs",
              position: 1,
              target_deck: "emoji-selector-favorites",
              type: "emoji-selector:category",
            },
          ],
        },
      }),
    })
    const reg = mockRegistry([addon])
    const userDecks: RuntimeDeck[] = []

    const result = materializeAddonDecks(reg, userDecks, silentLogger(), 15)
    const deck = result.find((d) => d.id === "emoji-selector")!

    expect(deck.buttons).toEqual([
      {
        id: "0",
        type: "emoji-selector:emoji",
        position: 0,
        config: { emoji: "😀", label: "😀" },
      },
      {
        id: "1",
        type: "emoji-selector:category",
        position: 1,
        config: {
          icon: "⭐",
          label: "Favs",
          target_deck: "emoji-selector-favorites",
        },
      },
    ])
  })

  it("propagates processNames from trigger.process_name", () => {
    const addon = fakeManifestWithDecks("test-addon", {
      "test-addon:deck-a": () => ({
        "gen-deck": {
          name: "Gen",
          buttons: [],
          trigger: { process_name: "my-app" },
        },
      }),
    })
    const reg = mockRegistry([addon])
    const userDecks: RuntimeDeck[] = [{ id: "main", name: "Main", buttons: [] }]

    const result = materializeAddonDecks(reg, userDecks, silentLogger(), 15)
    const genDeck = result.find((d) => d.id === "gen-deck")!

    expect(genDeck.processNames).toEqual(["my-app"])
  })

  it("propagates windowNames from trigger.window_name", () => {
    const addon = fakeManifestWithDecks("test-addon", {
      "test-addon:deck-a": () => ({
        "gen-deck": {
          name: "Gen",
          buttons: [],
          trigger: { window_name: "*opencode*" },
        },
      }),
    })
    const reg = mockRegistry([addon])
    const userDecks: RuntimeDeck[] = [{ id: "main", name: "Main", buttons: [] }]

    const result = materializeAddonDecks(reg, userDecks, silentLogger(), 15)
    const genDeck = result.find((d) => d.id === "gen-deck")!

    expect(genDeck.windowNames).toEqual(["*opencode*"])
  })

  it("propagates icon and background from generated deck", () => {
    const addon = fakeManifestWithDecks("test-addon", {
      "test-addon:deck-a": () => ({
        "gen-deck": {
          name: "Gen",
          buttons: [],
          icon: "addon://test-addon/assets/icon.png",
          background: "#000",
        },
      }),
    })
    const reg = mockRegistry([addon])
    const userDecks: RuntimeDeck[] = [{ id: "main", name: "Main", buttons: [] }]

    const result = materializeAddonDecks(reg, userDecks, silentLogger(), 15)
    const genDeck = result.find((d) => d.id === "gen-deck")!

    expect(genDeck.icon).toBe("addon://test-addon/assets/icon.png")
    expect(genDeck.background).toBe("#000")
  })

  it("propagates autoShow and isOverlay when set", () => {
    const addon = fakeManifestWithDecks("test-addon", {
      "test-addon:deck-a": () => ({
        "gen-deck": {
          name: "Gen",
          buttons: [],
          autoShow: true,
          isOverlay: true,
        },
      }),
    })
    const reg = mockRegistry([addon])
    const userDecks: RuntimeDeck[] = [{ id: "main", name: "Main", buttons: [] }]

    const result = materializeAddonDecks(reg, userDecks, silentLogger(), 15)
    const genDeck = result.find((d) => d.id === "gen-deck")!

    expect(genDeck.autoShow).toBe(true)
    expect(genDeck.isOverlay).toBe(true)
  })

  it("passes launcher button config as deck-level createDecks config", () => {
    const addon = fakeManifestWithDecks(
      "emoji-selector",
      {
        "emoji-selector:emoji-selector": (ctx) => ({
          "emoji-selector": {
            name: "Emoji Selector",
            buttons: [],
            ...(ctx.config &&
            typeof ctx.config === "object" &&
            "favorites" in ctx.config
              ? {
                  name: `Emoji Selector (favs: ${(ctx.config as { favorites: string[] }).favorites.length})`,
                }
              : {}),
          },
        }),
      },
      "emoji-selector:launcher",
    )
    const reg = mockRegistry([addon])
    const userDecks: RuntimeDeck[] = [
      {
        id: "main",
        name: "Main",
        buttons: [
          {
            id: "b0",
            type: "emoji-selector:launcher",
            config: { favorites: ["🦄", "🌈"] },
          },
        ],
      },
    ]

    const result = materializeAddonDecks(reg, userDecks, silentLogger(), 15)
    const deck = result.find((d) => d.id === "emoji-selector")!

    expect(deck.name).toContain("favs: 2")
  })

  it("uses shorthand type (addon name) as launcher button type", () => {
    const addon = fakeManifestWithDecks(
      "emoji-selector",
      {
        "emoji-selector:emoji-selector": (ctx) => ({
          "emoji-selector": {
            name: "Emoji Selector",
            buttons: [],
            ...(ctx.config &&
            typeof ctx.config === "object" &&
            "favorites" in ctx.config
              ? {
                  name: `Emoji Selector (favs: ${(ctx.config as { favorites: string[] }).favorites.length})`,
                }
              : {}),
          },
        }),
      },
      "emoji-selector:launcher",
    )
    const reg = mockRegistry([addon])
    const userDecks: RuntimeDeck[] = [
      {
        id: "main",
        name: "Main",
        buttons: [
          {
            id: "b0",
            type: "emoji-selector",
            config: { favorites: ["🦄"] },
          },
        ],
      },
    ]

    const result = materializeAddonDecks(reg, userDecks, silentLogger(), 15)
    const deck = result.find((d) => d.id === "emoji-selector")!

    expect(deck.name).toContain("favs: 1")
  })

  it("first launcher button wins when multiple match, warns", () => {
    const addon = fakeManifestWithDecks(
      "emoji-selector",
      {
        "emoji-selector:emoji-selector": (ctx) => ({
          "emoji-selector": {
            name: "Emoji Selector",
            buttons: [],
            ...(ctx.config &&
            typeof ctx.config === "object" &&
            "favorites" in ctx.config
              ? {
                  name: `favs: ${(ctx.config as { favorites: string[] }).favorites.length}`,
                }
              : {}),
          },
        }),
      },
      "emoji-selector:launcher",
    )
    const reg = mockRegistry([addon])
    const userDecks: RuntimeDeck[] = [
      {
        id: "main",
        name: "Main",
        buttons: [
          {
            id: "b0",
            type: "emoji-selector:launcher",
            config: { favorites: ["🦄"] },
          },
          {
            id: "b1",
            type: "emoji-selector:launcher",
            config: { favorites: ["🌈", "⭐"] },
          },
        ],
      },
    ]
    const warn = vi.fn()
    const logger = { warn } as ReturnType<typeof silentLogger>

    const result = materializeAddonDecks(reg, userDecks, logger, 15)
    const deck = result.find((d) => d.id === "emoji-selector")!

    expect(deck.name).toContain("favs: 1")
    expect(warn).toHaveBeenCalledWith(
      expect.objectContaining({
        addon: "emoji-selector",
        defaultButton: "emoji-selector:launcher",
        deckId: "main",
      }),
      expect.stringContaining("multiple"),
    )
  })

  it("passes empty config when no launcher button found", () => {
    const addon = fakeManifestWithDecks(
      "emoji-selector",
      {
        "emoji-selector:emoji-selector": (ctx) => ({
          "emoji-selector": {
            name:
              ctx.config &&
              typeof ctx.config === "object" &&
              "favorites" in ctx.config
                ? `has-config`
                : `no-config`,
            buttons: [],
          },
        }),
      },
      "emoji-selector:launcher",
    )
    const reg = mockRegistry([addon])
    const userDecks: RuntimeDeck[] = [
      {
        id: "main",
        name: "Main",
        buttons: [{ id: "b0", type: "other-addon:btn" }],
      },
    ]

    const result = materializeAddonDecks(reg, userDecks, silentLogger(), 15)
    const deck = result.find((d) => d.id === "emoji-selector")!

    expect(deck.name).toBe("no-config")
  })

  it("paginated:true splits a large deck into multiple decks with core:page-nav buttons", () => {
    const addon = fakeManifestWithDecks("test-addon", {
      "test-addon:deck-a": () => ({
        "emoji-deck": {
          name: "Emoji Deck",
          paginated: true,
          buttons: Array.from({ length: 14 }, (_, i) => ({
            type: "test-addon:emoji",
            emoji: `e${i}`,
            label: `e${i}`,
            position: i,
          })),
        },
      }),
    })
    const reg = mockRegistry([addon])
    const userDecks: RuntimeDeck[] = []

    const result = materializeAddonDecks(reg, userDecks, silentLogger(), 15)
    expect(result.length).toBe(2)
  })

  it("paginated:true with <= 13 items returns 1 deck, no page-nav", () => {
    const addon = fakeManifestWithDecks("test-addon", {
      "test-addon:deck-a": () => ({
        "small-deck": {
          name: "Small",
          paginated: true,
          buttons: Array.from({ length: 5 }, (_, i) => ({
            type: "test-addon:btn",
            position: i,
          })),
        },
      }),
    })
    const reg = mockRegistry([addon])
    const userDecks: RuntimeDeck[] = []

    const result = materializeAddonDecks(reg, userDecks, silentLogger(), 15)

    expect(result.length).toBe(1)
    const deck = result[0]!
    expect(deck.id).toBe("small-deck")
    expect(deck.buttons.find((b) => b.type === "core:page-nav")).toBeUndefined()
  })

  it("paginated:true with keyCount=32 produces 1 page for 20 items (no page-nav needed)", () => {
    const addon = fakeManifestWithDecks("test-addon", {
      "test-addon:deck-a": () => ({
        "large-deck": {
          name: "Large",
          paginated: true,
          buttons: Array.from({ length: 20 }, (_, i) => ({
            type: "test-addon:btn",
            position: i,
          })),
        },
      }),
    })
    const reg = mockRegistry([addon])
    const userDecks: RuntimeDeck[] = []

    const result = materializeAddonDecks(reg, userDecks, silentLogger(), 32)

    expect(result.length).toBe(1)
    const deck = result[0]!
    expect(deck.buttons.length).toBe(20)
    expect(deck.buttons.find((b) => b.type === "core:page-nav")).toBeUndefined()
  })

  it("skips addons without defaultButton decks when no user button matches", () => {
    const addon = fakeManifestWithDecks("test-addon", {
      "test-addon:deck-a": (ctx) => ({
        "gen-deck": {
          name:
            ctx.config &&
            typeof ctx.config === "object" &&
            Object.keys(ctx.config).length > 0
              ? `has-config`
              : `no-config`,
          buttons: [],
        },
      }),
    })
    const reg = mockRegistry([addon])
    const userDecks: RuntimeDeck[] = [
      {
        id: "main",
        name: "Main",
        buttons: [
          { id: "b0", type: "test-addon:launcher", config: { foo: "bar" } },
        ],
      },
    ]

    const result = materializeAddonDecks(reg, userDecks, silentLogger(), 15)
    const deck = result.find((d) => d.id === "gen-deck")

    expect(deck).toBeDefined()
    expect(deck!.name).toBe("no-config")
  })

  it("propagates service.full onto runtime buttons when true", () => {
    const addon = makeFakeAddon({
      apiVersion: 1,
      name: "test-addon",
      buttonTypes: {
        "test-addon:full-btn": {
          frontend: () => null,
          service: { full: true },
        },
        "test-addon:plain-btn": {
          frontend: () => null,
          service: {},
        },
      },
      decks: [{ id: "test-addon:deck-a", createDecks: () => ({
            "gen-deck": {
              name: "Gen",
              buttons: [
                { type: "test-addon:full-btn", position: 0 },
                { type: "test-addon:plain-btn", position: 1 },
              ],
            },
          }) }],
    })
    const reg = mockRegistry([addon])
    const userDecks: RuntimeDeck[] = []

    const result = materializeAddonDecks(reg, userDecks, silentLogger(), 15)
    const deck = result.find((d) => d.id === "gen-deck")!

    expect(deck.buttons[0]!.full).toBe(true)
    expect(deck.buttons[1]!.full).toBeUndefined()
  })

  it("propagates service.full onto paginated runtime buttons", () => {
    const addon = makeFakeAddon({
      apiVersion: 1,
      name: "test-addon",
      buttonTypes: {
        "test-addon:full-btn": {
          frontend: () => null,
          service: { full: true },
        },
      },
      decks: [{ id: "test-addon:deck-a", createDecks: () => ({
            "gen-deck": {
              name: "Gen",
              paginated: true,
              buttons: Array.from({ length: 14 }, (_, i) => ({
                type: "test-addon:full-btn",
                position: i,
              })),
            },
          }) }],
    })
    const reg = mockRegistry([addon])
    const userDecks: RuntimeDeck[] = []

    const result = materializeAddonDecks(reg, userDecks, silentLogger(), 15)

    for (const deck of result) {
      for (const btn of deck.buttons) {
        if (btn.type === "test-addon:full-btn") {
          expect(btn.full).toBe(true)
        }
      }
    }
  })

  it("propagates instance-level full onto runtime button when service.full is not set", () => {
    const addon = makeFakeAddon({
      apiVersion: 1,
      name: "test-addon",
      buttonTypes: {
        "test-addon:plain-btn": {
          frontend: () => null,
          service: {},
        },
      },
      decks: [{ id: "test-addon:deck-a", createDecks: () => ({
            "gen-deck": {
              name: "Gen",
              buttons: [
                { type: "test-addon:plain-btn", position: 0, full: true },
                { type: "test-addon:plain-btn", position: 1 },
              ],
            },
          }) }],
    })
    const reg = mockRegistry([addon])
    const userDecks: RuntimeDeck[] = []

    const result = materializeAddonDecks(reg, userDecks, silentLogger(), 15)
    const deck = result.find((d) => d.id === "gen-deck")!

    expect(deck.buttons[0]!.full).toBe(true)
    expect(deck.buttons[1]!.full).toBeUndefined()
  })

  it("does not propagate instance-level full=false onto runtime button", () => {
    const addon = makeFakeAddon({
      apiVersion: 1,
      name: "test-addon",
      buttonTypes: {
        "test-addon:plain-btn": {
          frontend: () => null,
          service: {},
        },
      },
      decks: [{ id: "test-addon:deck-a", createDecks: () => ({
            "gen-deck": {
              name: "Gen",
              buttons: [{ type: "test-addon:plain-btn", position: 0, full: false }],
            },
          }) }],
    })
    const reg = mockRegistry([addon])
    const userDecks: RuntimeDeck[] = []

    const result = materializeAddonDecks(reg, userDecks, silentLogger(), 15)
    const deck = result.find((d) => d.id === "gen-deck")!

    expect(deck.buttons[0]!.full).toBeUndefined()
  })
})

describe("materializeAddonDecks with addons[i].config overrides", () => {
  it("applies per-deck autoShow override from addonWideConfig", () => {
    const addon = fakeManifestWithDecks("test-addon", {
      "test-addon:deck-a": () => ({
        "gen-deck": { name: "Gen", autoShow: true, isOverlay: true, buttons: [] },
      }),
    })
    const reg = mockRegistry([addon])
    const overrides = new Map([
      ["test-addon", {
        addonWideConfig: {},
        perDeck: new Map([["gen-deck", { autoShow: false }]]),
      }],
    ])
    const result = materializeAddonDecks(reg, [], silentLogger(), 15, undefined, overrides)
    const gen = result.find((d) => d.id === "gen-deck")!
    expect(gen.autoShow).toBe(false)
  })

  it("per-deck key matches suffix (no addon prefix)", () => {
    const addon = fakeManifestWithDecks("test-addon", {
      "test-addon:deck-a": () => ({
        "test-addon:gen-deck": { name: "Gen", autoShow: true, buttons: [] },
      }),
    })
    const reg = mockRegistry([addon])
    const overrides = new Map([
      ["test-addon", {
        addonWideConfig: {},
        perDeck: new Map([["gen-deck", { autoShow: false }]]),
      }],
    ])
    const result = materializeAddonDecks(reg, [], silentLogger(), 15, undefined, overrides)
    const gen = result.find((d) => d.id === "test-addon:gen-deck")!
    expect(gen.autoShow).toBe(false)
  })

  it("addonWideConfig reaches createDecks({config}) merged with default config", () => {
    let receivedConfig: unknown = null
    const addon: AddonManifestV1 = makeFakeAddon({
      apiVersion: 1,
      name: "test-addon",
      buttonTypes: {},
      decks: [{
        id: "test-addon:deck-a",
        createDecks: (ctx) => {
          receivedConfig = ctx.config
          return { "gen-deck": { name: "Gen", buttons: [] } }
        },
      }],
    })
    const reg = mockRegistry([addon])
    const overrides = new Map([
      ["test-addon", {
        addonWideConfig: { customFlag: true },
        perDeck: new Map(),
      }],
    ])
    materializeAddonDecks(
      reg,
      [{ id: "main", name: "Main", buttons: [], config: { launcherFlag: "x" } }],
      silentLogger(),
      15,
      undefined,
      overrides,
    )
    expect(receivedConfig).toMatchObject({ customFlag: true })
  })

  it("per-deck trigger override forces isOverlay: true", () => {
    const addon = fakeManifestWithDecks("test-addon", {
      "test-addon:deck-a": () => ({
        "gen-deck": { name: "Gen", isOverlay: false, buttons: [] },
      }),
    })
    const reg = mockRegistry([addon])
    const overrides = new Map([
      ["test-addon", {
        addonWideConfig: {},
        perDeck: new Map([["gen-deck", {
          trigger: { process_name: "chrome" },
        }]]),
      }],
    ])
    const result = materializeAddonDecks(reg, [], silentLogger(), 15, undefined, overrides)
    const gen = result.find((d) => d.id === "gen-deck")!
    expect(gen.isOverlay).toBe(true)
    expect(gen.processNames).toEqual(["chrome"])
  })
})
