import { describe, expect, it } from "vitest"

import { DeckNavigationError, createDeckController } from "./controller.js"

describe("createDeckController", () => {
  const decks = {
    apps: { id: "apps", buttons: [] },
    main: { id: "main", buttons: [] },
    tools: { id: "tools", buttons: [] },
  }

  it("starts on the configured main deck", () => {
    const controller = createDeckController({ decks, mainDeckId: "main" })

    expect(controller.getActiveDeckId()).toBe("main")
    expect(controller.getActiveDeck()).toEqual(decks.main)
  })

  it("throws when the main deck is missing", () => {
    expect(() => createDeckController({ decks, mainDeckId: "missing" })).toThrow(DeckNavigationError)
  })

  it("navigates forward to a target deck", () => {
    const controller = createDeckController({ decks, mainDeckId: "main" })

    controller.navigateTo("apps")

    expect(controller.getActiveDeckId()).toBe("apps")
    expect(controller.canGoBack()).toBe(true)
  })

  it("returns to the previous deck", () => {
    const controller = createDeckController({ decks, mainDeckId: "main" })

    controller.navigateTo("apps")
    controller.navigateTo("tools")
    controller.goBack()

    expect(controller.getActiveDeckId()).toBe("apps")
    expect(controller.goBack()).toEqual(decks.main)
  })

  it("throws on unknown navigation targets", () => {
    const controller = createDeckController({ decks, mainDeckId: "main" })

    expect(() => controller.navigateTo("missing")).toThrow("Deck 'missing' is not defined")
  })
})
