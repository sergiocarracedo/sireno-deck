import { describe, expect, it } from "vitest"

import type { RuntimeDeck } from "@/deck/runtime"

import {
  buildDeckConfigMessage,
  type AddonFrontendRef,
} from "@/deck/deck-config"
import { injectSystemButtons } from "@/deck/system-back-injection"

const deck: RuntimeDeck = {
  id: "main",
  name: "Main",
  isMain: true,
  buttons: [
    {
      id: "2-main-0",
      type: "date-time:time",
      config: { variant: "big" },
      position: 2,
    },
    { id: "3-main-0", type: "date-time:date", position: 3 },
    { id: "unknown", type: "custom-addon:custom" },
  ],
}

describe("buildDeckConfigMessage", () => {
  it("includes addonName and frontendEntry when the type is registered", () => {
    const addonByType: Map<string, AddonFrontendRef> = new Map([
      [
        "date-time:time",
        { name: "date-time", frontendEntry: "/abs/date-time/frontend" },
      ],
      [
        "date-time:date",
        { name: "date-time", frontendEntry: "/abs/date-time/frontend" },
      ],
    ])
    const msg = buildDeckConfigMessage(deck, addonByType)
    const buttons = msg.surfaces["main"]!.buttons
    expect(buttons[0]).toMatchObject({
      id: "2-main-0",
      type: "date-time:time",
      addonName: "date-time",
      frontendEntry: "/abs/date-time/frontend",
    })
    expect(buttons[1]).toMatchObject({
      id: "3-main-0",
      type: "date-time:date",
      addonName: "date-time",
      frontendEntry: "/abs/date-time/frontend",
    })
    expect(msg.hasOverlayDeckAvailable).toBe(false)
  })

  it("omits addon metadata when the type is unknown", () => {
    const msg = buildDeckConfigMessage(deck, new Map())
    const buttons = msg.surfaces["main"]!.buttons
    expect(buttons[2]).not.toHaveProperty("addonName")
    expect(buttons[2]).not.toHaveProperty("frontendEntry")
  })

  it("omits frontendEntry when the addon has no frontend", () => {
    const addonByType: Map<string, AddonFrontendRef> = new Map([
      ["custom-addon:custom", { name: "custom-addon", frontendEntry: null }],
    ])
    const msg = buildDeckConfigMessage(deck, addonByType)
    const buttons = msg.surfaces["main"]!.buttons
    expect(buttons[2]).toMatchObject({ addonName: "custom-addon" })
    expect(buttons[2]).not.toHaveProperty("frontendEntry")
  })

  it("preserves the position field", () => {
    const msg = buildDeckConfigMessage(deck, new Map())
    const buttons = msg.surfaces["main"]!.buttons
    expect(buttons[0]?.position).toBe(2)
    expect(buttons[1]?.position).toBe(3)
    expect(buttons[2]).not.toHaveProperty("position")
  })

  it("preserves injected n-1 system button without modifying it", () => {
    const injected = injectSystemButtons([deck], 15)[0]!
    const msg = buildDeckConfigMessage(
      injected,
      new Map(),
      {},
      { navStackDepth: 1, hasOverlayDeckAvailable: false },
      15,
    )
    const buttons = msg.surfaces["main"]!.buttons
    const n1Button = buttons.find(
      (b) => b.id === "14-main-0" || b.position === 14,
    )
    expect(n1Button).toBeDefined()
    expect(n1Button?.type).toBe("core:settings-entry")
    expect(msg.hasOverlayDeckAvailable).toBe(false)
  })

  it("preserves injected n-1 back button on non-main deck", () => {
    const subDeck: RuntimeDeck = {
      id: "media",
      name: "Media",
      buttons: [{ id: "0-media-0", position: 0, type: "media:player" }],
    }
    const injected = injectSystemButtons([subDeck], 15)[0]!
    const msg = buildDeckConfigMessage(
      injected,
      new Map(),
      {},
      { navStackDepth: 2, hasOverlayDeckAvailable: false },
      15,
    )
    const buttons = msg.surfaces["media"]!.buttons
    const n1Button = buttons.find(
      (b) => b.id === "14-main-0" || b.position === 14,
    )
    expect(n1Button).toBeDefined()
    expect(n1Button?.type).toBe("core:back")
  })

  it("preserves injected n-1 overlay-toggle button on overlay deck with overlayDeckIcon", () => {
    const overlayDeck: RuntimeDeck = {
      id: "emoji-overlay",
      name: "Emoji",
      isOverlay: true,
      buttons: [],
    }
    const injected = injectSystemButtons([overlayDeck], 15)[0]!
    const msg = buildDeckConfigMessage(
      injected,
      new Map(),
      {},
      { navStackDepth: 3, hasOverlayDeckAvailable: true },
      15,
      false,
      () => undefined,
      "icon://emoji",
    )
    const buttons = msg.surfaces["emoji-overlay"]!.buttons
    const n1Button = buttons.find(
      (b) => b.id === "14-main-0" || b.position === 14,
    )
    expect(n1Button).toBeDefined()
    expect(n1Button?.type).toBe("core:overlay-toggle")
    expect(msg.hasOverlayDeckAvailable).toBe(true)
    expect(msg.overlayDeckIcon).toBe("icon://emoji")
  })
})

describe("injectSystemButtons", () => {
  it("injects core:settings-entry at n-1 on main deck", () => {
    const result = injectSystemButtons([deck], 15)
    const buttons = result[0]!.buttons
    const n1 = buttons.find((b) => b.id === "14-main-0")
    expect(n1).toBeDefined()
    expect(n1?.type).toBe("core:settings-entry")
  })

  it("injects core:back at n-1 on non-main deck", () => {
    const subDeck: RuntimeDeck = {
      id: "media",
      name: "Media",
      buttons: [{ id: "0-media-0", type: "media:player", position: 0 }],
    }
    const result = injectSystemButtons([subDeck], 15)
    const buttons = result[0]!.buttons
    const n1 = buttons.find((b) => b.id === "14-media-0")
    expect(n1).toBeDefined()
    expect(n1?.type).toBe("core:back")
  })

  it("overwrites an existing user button at n-1", () => {
    const deckWithN1: RuntimeDeck = {
      id: "main",
      name: "Main",
      isMain: true,
      buttons: [{ id: "14-main-0", position: 14, type: "user:custom" }],
    }
    const result = injectSystemButtons([deckWithN1], 15)
    const buttons = result[0]!.buttons
    const n1 = buttons.find((b) => b.id === "14-main-0" && b.position === 14)
    expect(n1?.type).toBe("core:settings-entry")
  })

  it("uses keyCount to determine n-1 position", () => {
    const result = injectSystemButtons([deck], 6)
    const buttons = result[0]!.buttons
    const n1 = buttons.find((b) => b.id === "5-main-0")
    expect(n1).toBeDefined()
    expect(n1?.type).toBe("core:settings-entry")
  })

  it("does not duplicate n-1 if it already exists as a system button", () => {
    const alreadyInjected: RuntimeDeck = {
      id: "main",
      name: "Main",
      isMain: true,
      buttons: [
        { id: "2-main-0", type: "date-time:time", position: 2 },
        { id: "14-main-0", type: "core:settings-entry", position: 14 },
      ],
    }
    const result = injectSystemButtons([alreadyInjected], 15)
    const buttons = result[0]!.buttons
    const n1Buttons = buttons.filter((b) => b.position === 14)
    expect(n1Buttons).toHaveLength(1)
  })
})
