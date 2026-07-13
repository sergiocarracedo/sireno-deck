/** @vitest-environment node */
import { describe, expect, it } from "vitest"

import { buildDeckConfigMessage } from "../deck-config"

describe("buildDeckConfigMessage — back button injection", () => {
  it("injects core:back at n-1 when sub-deck with navStackDepth=2", () => {
    const deck = {
      id: "test-deck",
      name: "Test Deck",
      buttons: [
        { id: "0", type: "core:change-deck", config: {} },
        { id: "1", type: "core:action", config: {} },
      ],
    }
    const msg = buildDeckConfigMessage(
      deck,
      new Map(),
      {},
      { navStackDepth: 2, hasOverlayDeckAvailable: false },
      15,
      false,
      () => undefined,
    )
    const buttons = msg.surfaces[deck.id].buttons
    expect(buttons.length).toBe(3) // 2 original + 1 back
    const n1 = buttons.find((b) => Number.parseInt(b.id, 10) === 14)
    expect(n1?.type).toBe("core:back")
  })

  it("does NOT inject back on main deck (settings-entry instead)", () => {
    const deck = {
      id: "main",
      name: "Main",
      isMain: true,
      buttons: [
        { id: "0", type: "core:action", config: {} },
      ],
    }
    const msg = buildDeckConfigMessage(
      deck,
      new Map(),
      {},
      { navStackDepth: 2, hasOverlayDeckAvailable: false },
      15,
      false,
      () => undefined,
    )
    const buttons = msg.surfaces[deck.id].buttons
    const n1 = buttons.find((b) => Number.parseInt(b.id, 10) === 14)
    expect(n1?.type).toBe("core:settings-entry")
  })

  it("does NOT inject when sub-deck with navStackDepth=1 (root context)", () => {
    const deck = {
      id: "sub",
      name: "Sub",
      buttons: [
        { id: "0", type: "core:action", config: {} },
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
    const buttons = msg.surfaces[deck.id].buttons
    const n1 = buttons.find((b) => Number.parseInt(b.id, 10) === 14)
    expect(n1).toBeUndefined()
  })

  it("overwrites user button at n-1 with system button", () => {
    const deck = {
      id: "sub",
      name: "Sub",
      buttons: [
        { id: "14", type: "core:action", config: {} },
      ],
    }
    const msg = buildDeckConfigMessage(
      deck,
      new Map(),
      {},
      { navStackDepth: 2, hasOverlayDeckAvailable: false },
      15,
      false,
      () => undefined,
    )
    const buttons = msg.surfaces[deck.id].buttons
    expect(buttons.length).toBe(1)
    expect(buttons[0].id).toBe("14")
    expect(buttons[0].type).toBe("core:back")
  })
})