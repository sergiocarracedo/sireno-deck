/** @vitest-environment node */
import { mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { afterEach, beforeEach, describe, expect, it } from "vitest"

import { buildDeckConfigMessage } from "../deck-config"

let tmpDir: string

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), "deck-config-test-"))
})

afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true })
})

describe("buildDeckConfigMessage — full flag", () => {
  it("forwards button.full onto the serialized payload", () => {
    const deck = {
      id: "test-deck",
      name: "Test Deck",
      buttons: [
        { id: "0", type: "internal-settings:app-info", config: {}, full: true },
      ],
    }
    const msg = buildDeckConfigMessage(
      deck,
      new Map(),
      {},
      { navStackDepth: 1, hasOverlayDeckAvailable: false },
      15,
      false,
      () => undefined,
    )
    const btn = msg.surfaces[deck.id].buttons[0]!
    expect(btn.full).toBe(true)
  })

  it("omits full when not set on the runtime button", () => {
    const deck = {
      id: "test-deck",
      name: "Test Deck",
      buttons: [{ id: "0", type: "core:action", config: {} }],
    }
    const msg = buildDeckConfigMessage(
      deck,
      new Map(),
      {},
      { navStackDepth: 1, hasOverlayDeckAvailable: false },
      15,
      false,
      () => undefined,
    )
    const btn = msg.surfaces[deck.id].buttons[0]!
    expect("full" in btn).toBe(false)
  })
})

describe("buildDeckConfigMessage — button color", () => {
  it("includes the deck button color on the surface", () => {
    const msg = buildDeckConfigMessage(
      { id: "overlay", name: "Overlay", buttons: [], buttonColor: "blue" },
      new Map(),
    )

    expect(msg.surfaces["overlay"]?.buttonColor).toBe("blue")
  })
})

describe("buildDeckConfigMessage — overlayDeckIcon resolution", () => {
  it("returns null when overlayDeckIcon is null", () => {
    const deck = { id: "d", name: "D", buttons: [] }
    const msg = buildDeckConfigMessage(
      deck,
      new Map(),
      {},
      undefined,
      undefined,
      false,
      () => undefined,
      null,
    )
    expect(msg.overlayDeckIcon).toBeNull()
  })

  it("leaves icon:// overlay icons unchanged", () => {
    const deck = { id: "d", name: "D", buttons: [] }
    const msg = buildDeckConfigMessage(
      deck,
      new Map(),
      {},
      undefined,
      undefined,
      false,
      () => undefined,
      "icon://chrome",
    )
    expect(msg.overlayDeckIcon).toBe("icon://chrome")
  })

  it("rewrites an addon:// overlay icon to asset:// when the asset is registered", () => {
    const iconPath = join(tmpDir, "icon.png")
    writeFileSync(iconPath, "png-bytes", "utf8")
    const assetId = "test-asset-id"
    const deck = { id: "d", name: "D", buttons: [] }
    const msg = buildDeckConfigMessage(
      deck,
      new Map(),
      { addonDirs: new Map([["demo", tmpDir]]) },
      undefined,
      undefined,
      false,
      (fullPath) => (fullPath === iconPath ? assetId : undefined),
      "addon://demo/icon.png",
    )
    expect(msg.overlayDeckIcon).toBe(`asset://${assetId}`)
  })

  it("falls back to the raw path when the asset is not in the registry", () => {
    const deck = { id: "d", name: "D", buttons: [] }
    const msg = buildDeckConfigMessage(
      deck,
      new Map(),
      { addonDirs: new Map([["demo", tmpDir]]) },
      undefined,
      undefined,
      false,
      () => undefined,
      "addon://demo/icon.png",
    )
    expect(msg.overlayDeckIcon).toBe("addon://demo/icon.png")
  })
})

describe("buildDeckConfigMessage — lockActive hides injected n-1 system button", () => {
  const deck = {
    id: "core:lock",
    name: "Lock",
    buttons: [
      { id: "5", type: "date-time:date-time", config: {} },
      { id: "13", type: "date-time:date-time", config: {} },
      { id: "14", type: "core:back", config: {} },
    ],
  }

  it("strips the n-1 system button when locked", () => {
    const msg = buildDeckConfigMessage(
      deck,
      new Map(),
      {},
      { navStackDepth: 1, hasOverlayDeckAvailable: false },
      15,
      false,
      () => undefined,
      null,
      null,
      { lockActive: true },
    )
    const ids = msg.surfaces[deck.id].buttons.map((b) => b.id)
    expect(ids).toEqual(["5", "13"])
  })

  it("keeps the n-1 system button when not locked", () => {
    const msg = buildDeckConfigMessage(
      deck,
      new Map(),
      {},
      { navStackDepth: 1, hasOverlayDeckAvailable: false },
      15,
      false,
      () => undefined,
      null,
      null,
      { lockActive: false },
    )
    const ids = msg.surfaces[deck.id].buttons.map((b) => b.id)
    expect(ids).toContain("14")
  })

  it("keeps a user button at n-1 when locked (only system buttons are stripped)", () => {
    const userDeck = {
      ...deck,
      buttons: [
        { id: "5", type: "date-time:date-time", config: {} },
        { id: "14", type: "weather:weather", config: {} },
      ],
    }
    const msg = buildDeckConfigMessage(
      userDeck,
      new Map(),
      {},
      { navStackDepth: 1, hasOverlayDeckAvailable: false },
      15,
      false,
      () => undefined,
      null,
      null,
      { lockActive: true },
    )
    const ids = msg.surfaces[userDeck.id].buttons.map((b) => b.id)
    expect(ids).toEqual(["5", "14"])
  })
})
