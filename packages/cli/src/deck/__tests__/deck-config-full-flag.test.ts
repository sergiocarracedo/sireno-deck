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
