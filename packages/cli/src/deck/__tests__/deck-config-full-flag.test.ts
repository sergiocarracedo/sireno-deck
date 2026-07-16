/** @vitest-environment node */
import { describe, expect, it } from "vitest"

import { buildDeckConfigMessage } from "../deck-config"

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
