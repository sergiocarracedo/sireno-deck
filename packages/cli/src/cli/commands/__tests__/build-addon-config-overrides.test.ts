import { describe, expect, it } from "vitest"

import { buildAddonConfigOverrides } from "../run"
import { createLogger } from "@/util/logger"

const silentLogger = () => createLogger({ level: "silent" })

describe("buildAddonConfigOverrides", () => {
  it("keys overrides by manifest name, not by user-written src", () => {
    // ponytail: this is the bug — run.ts previously keyed by `src:` (path),
    // so `materializeAddonDecks.get(addon.name)` returned undefined and the
    // override silently never reached the addon-deck materialize step.
    const entries = [
      {
        src: "/works/opensource/sireno-deck-addons/vscode-overlay",
        config: {
          decks: { shortcuts: { autoShow: false, config: { extra: true } } },
        },
      },
    ]
    const addonSpecToName = new Map([
      ["/works/opensource/sireno-deck-addons/vscode-overlay", "vscode-overlay"],
    ])
    const overrides = buildAddonConfigOverrides(
      entries,
      addonSpecToName,
      silentLogger(),
    )
    expect(overrides.has("vscode-overlay")).toBe(true)
    expect(overrides.has("/works/opensource/sireno-deck-addons/vscode-overlay")).toBe(
      false,
    )
    const vscode = overrides.get("vscode-overlay")!
    expect(vscode.perDeck.get("shortcuts")?.autoShow).toBe(false)
    expect(vscode.perDeck.get("shortcuts")?.config).toEqual({ extra: true })
    expect(vscode.addonWideConfig).toEqual({})
  })

  it("does not collide across addons when they share a deck suffix", () => {
    // chrome-overlay and vscode-overlay both declare a `shortcuts` deck; the
    // suffix lookup in materializeAddonDecks handles that, but the override
    // map must be keyed by manifest name so each addon gets its own entry.
    const entries = [
      {
        src: "/p/vscode-overlay",
        config: { decks: { shortcuts: { autoShow: false } } },
      },
      {
        src: "/p/chrome-overlay",
        config: { decks: { shortcuts: { name: "My Chrome" } } },
      },
    ]
    const addonSpecToName = new Map([
      ["/p/vscode-overlay", "vscode-overlay"],
      ["/p/chrome-overlay", "chrome-overlay"],
    ])
    const overrides = buildAddonConfigOverrides(
      entries,
      addonSpecToName,
      silentLogger(),
    )
    expect(overrides.get("vscode-overlay")?.perDeck.get("shortcuts")?.autoShow).toBe(
      false,
    )
    expect(overrides.get("chrome-overlay")?.perDeck.get("shortcuts")?.name).toBe(
      "My Chrome",
    )
  })

  it("warns and drops the override when the addon failed to load", () => {
    const entries = [
      {
        src: "/p/missing-addon",
        config: { decks: { shortcuts: { autoShow: false } } },
      },
    ]
    const addonSpecToName = new Map<string, string>() // empty — addon never loaded
    const overrides = buildAddonConfigOverrides(
      entries,
      addonSpecToName,
      silentLogger(),
    )
    expect(overrides.size).toBe(0)
  })

  it("passes addonWideConfig (config keys outside `decks`) through unchanged", () => {
    const entries = [
      {
        src: "/p/test-addon",
        config: {
          customFlag: true,
          decks: { shortcuts: { autoShow: false } },
        },
      },
    ]
    const addonSpecToName = new Map([["/p/test-addon", "test-addon"]])
    const overrides = buildAddonConfigOverrides(
      entries,
      addonSpecToName,
      silentLogger(),
    )
    expect(overrides.get("test-addon")?.addonWideConfig).toEqual({
      customFlag: true,
    })
  })

  it("ignores string-form addon entries (no per-entry config)", () => {
    const entries = ["/p/some-addon"]
    const addonSpecToName = new Map([
      ["/p/some-addon", "some-addon"],
    ])
    const overrides = buildAddonConfigOverrides(
      entries,
      addonSpecToName,
      silentLogger(),
    )
    expect(overrides.has("some-addon")).toBe(false)
  })
})