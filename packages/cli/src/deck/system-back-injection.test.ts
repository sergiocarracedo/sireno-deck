import { describe, expect, it } from "vitest"

import type { DeckConfig, SirenoConfig } from "../core/schemas.js"
import {
  shouldInjectSystemBack,
  SYSTEM_BACK_TYPE,
} from "./system-back-injection.js"

function makeDeck(overrides: Partial<DeckConfig> = {}): DeckConfig {
  return {
    buttons: [],
    id: "sub",
    keyCount: 15,
    ...overrides,
  }
}

function makeConfig(overrides: Partial<SirenoConfig> = {}): SirenoConfig {
  return {
    addons: [],
    decks: { sub: makeDeck(), main: makeDeck({ id: "main" }) },
    logging: {},
    main_deck: "main",
    theme: "dark",
    ...overrides,
  }
}

describe("shouldInjectSystemBack", () => {
  it("returns true for a normal subdeck without override", () => {
    const config = makeConfig()
    const deck = config.decks.sub!
    expect(shouldInjectSystemBack(deck, config)).toBe(true)
  })

  it("returns false when root allow_reserved_slot_override is true", () => {
    const config = makeConfig({ allow_reserved_slot_override: true })
    const deck = config.decks.sub!
    expect(shouldInjectSystemBack(deck, config)).toBe(false)
  })

  it("returns false when deck-level allow_reserved_slot_override is true", () => {
    const deck = makeDeck({ allow_reserved_slot_override: true })
    const mainDeck = makeDeck({ id: "main" })
    const config = makeConfig({ decks: { sub: deck, main: mainDeck } })
    expect(shouldInjectSystemBack(deck, config)).toBe(false)
  })

  it("returns false for the lock-session deck", () => {
    const lockedDeck = makeDeck({ id: "locked" })
    const mainDeck = makeDeck({ id: "main" })
    const config = makeConfig({
      decks: { locked: lockedDeck, main: mainDeck },
      session: { capability: "supported", locked_deck: "locked", state: "locked" },
    })
    expect(shouldInjectSystemBack(lockedDeck, config)).toBe(false)
  })

  it("returns false when a user button already claims the reserved slot", () => {
    const deck = makeDeck({
      buttons: [
        { id: "user-btn", position: 14, type: "change-deck" } as never,
      ],
    })
    const mainDeck = makeDeck({ id: "main" })
    const config = makeConfig({ decks: { sub: deck, main: mainDeck } })
    expect(shouldInjectSystemBack(deck, config)).toBe(false)
  })

  it("returns true for the main deck (so the home indicator renders)", () => {
    const config = makeConfig()
    const mainDeck = config.decks.main!
    expect(shouldInjectSystemBack(mainDeck, config)).toBe(true)
  })
})

describe("SYSTEM_BACK_TYPE", () => {
  it("is a constant string", () => {
    expect(SYSTEM_BACK_TYPE).toBe("system-back")
  })
})
