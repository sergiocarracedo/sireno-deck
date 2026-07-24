import { describe, expect, it } from "vitest"

import {
  computeSystemButtonForSlotN1,
  injectSystemButtons,
} from "../system-back-injection"

const deck = (
  overrides: Partial<Parameters<typeof computeSystemButtonForSlotN1>[0]> = {},
) => ({
  id: "d1",
  name: "Deck 1",
  buttons: [],
  ...overrides,
})

const state = (
  overrides: Partial<Parameters<typeof computeSystemButtonForSlotN1>[1]> = {},
) => ({
  navStackDepth: 1,
  hasOverlayDeckAvailable: false,
  ...overrides,
})

describe("computeSystemButtonForSlotN1", () => {
  it("main deck returns settings-entry", () => {
    expect(computeSystemButtonForSlotN1(deck({ isMain: true }), state())).toBe(
      "core:settings-entry",
    )
  })

  it("overlay deck returns overlay-toggle (n-1 becomes the toggle button)", () => {
    expect(
      computeSystemButtonForSlotN1(deck({ isOverlay: true }), state()),
    ).toBe("core:overlay-toggle")
  })

  it("regular deck with navStackDepth=1 returns back", () => {
    expect(
      computeSystemButtonForSlotN1(deck(), state({ navStackDepth: 1 })),
    ).toBe("core:back")
  })

  it("regular deck with navStackDepth=2 returns back", () => {
    expect(
      computeSystemButtonForSlotN1(deck(), state({ navStackDepth: 2 })),
    ).toBe("core:back")
  })

  it("main deck with overlay available still returns settings-entry", () => {
    expect(
      computeSystemButtonForSlotN1(
        deck({ isMain: true }),
        state({ hasOverlayDeckAvailable: true }),
      ),
    ).toBe("core:settings-entry")
  })

  it("overlay deck with navStackDepth=3 returns overlay-toggle", () => {
    expect(
      computeSystemButtonForSlotN1(
        deck({ isOverlay: true }),
        state({ navStackDepth: 3 }),
      ),
    ).toBe("core:overlay-toggle")
  })
})

describe("injectSystemButtons", () => {
  it("injects core:settings-entry at n-1 on main deck", () => {
    const main = {
      ...deck({ isMain: true }),
      buttons: [{ id: "0", type: "x" }],
    }
    const [result] = injectSystemButtons([main], 15)
    const n1 = result.buttons.find((b) => b.id === "14")
    expect(n1?.type).toBe("core:settings-entry")
  })

  it("injects core:back at n-1 on non-main deck", () => {
    const sub = {
      ...deck({ id: "sub", name: "Sub" }),
      buttons: [{ id: "0", type: "x" }],
    }
    const [result] = injectSystemButtons([sub], 15)
    const n1 = result.buttons.find((b) => b.id === "14")
    expect(n1?.type).toBe("core:back")
  })

  it("injects core:overlay-toggle at n-1 on overlay deck", () => {
    const overlay = {
      ...deck({ id: "overlay", name: "Overlay", isOverlay: true }),
      buttons: [{ id: "0", type: "x" }],
    }
    const [result] = injectSystemButtons([overlay], 15)
    const n1 = result.buttons.find((b) => b.id === "14")
    expect(n1?.type).toBe("core:overlay-toggle")
  })

  it("overwrites existing user button at n-1", () => {
    const withN1 = {
      ...deck({ id: "sub" }),
      buttons: [{ id: "14", type: "user:custom" }],
    }
    const [result] = injectSystemButtons([withN1], 15)
    expect(result.buttons).toHaveLength(1)
    expect(result.buttons[0]?.type).toBe("core:back")
  })

  it("uses keyCount to determine n-1 position", () => {
    const main = { ...deck({ isMain: true }), buttons: [] }
    const [result] = injectSystemButtons([main], 6)
    const n1 = result.buttons.find((b) => b.id === "5")
    expect(n1?.type).toBe("core:settings-entry")
  })

  it("injects core:back at id '31' on XL (keyCount=32)", () => {
    const sub = { ...deck({ id: "sub" }), buttons: [] }
    const [result] = injectSystemButtons([sub], 32)
    const n1 = result.buttons.find((b) => b.id === "31")
    expect(n1?.type).toBe("core:back")
    expect(result.buttons).toHaveLength(1)
  })

  it("is idempotent when n-1 is already a system button", () => {
    const alreadyInjected = {
      ...deck({ isMain: true }),
      buttons: [{ id: "14", type: "core:settings-entry" }],
    }
    const [result] = injectSystemButtons([alreadyInjected], 15)
    const n1Count = result.buttons.filter((b) => b.id === "14").length
    expect(n1Count).toBe(1)
  })

  it("preserves other deck properties", () => {
    const sub = {
      ...deck({ id: "media", name: "Media", isOverlay: false }),
      buttons: [{ id: "0", type: "media:player" }],
    }
    const [result] = injectSystemButtons([sub], 15)
    expect(result.id).toBe("media")
    expect(result.name).toBe("Media")
    expect(result.buttons).toHaveLength(2)
  })

  it("re-injection with new keyCount moves core:back to the new n-1 slot", () => {
    const sub = { ...deck({ id: "sub" }), buttons: [] }
    const [withMk2] = injectSystemButtons([sub], 15)
    const [withXl] = injectSystemButtons([sub], 32)
    expect(withMk2.buttons.find((b) => b.id === "14")?.type).toBe("core:back")
    expect(withXl.buttons.find((b) => b.id === "31")?.type).toBe("core:back")
    expect(withXl.buttons.find((b) => b.id === "14")).toBeUndefined()
  })
})
