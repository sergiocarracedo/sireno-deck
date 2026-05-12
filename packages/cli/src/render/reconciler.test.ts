import { describe, expect, it } from "vitest"

import {
  createDeckButtonElement,
  createDeckSurfaceElement,
  createDeckTextElement,
  renderDeck,
} from "./reconciler.js"

describe("render reconciler", () => {
  it("produces a render description for key 0", () => {
    const descriptions = renderDeck(createDeckTextElement({ keyIndex: 0, text: "Hello" }))

    expect(descriptions).toEqual([{ keyIndex: 0, label: "Hello" }])
  })

  it("does not emit writes for untouched keys", () => {
    const descriptions = renderDeck(createDeckTextElement({ keyIndex: 0, text: "Hello World" }))

    expect(descriptions.some((description) => description.keyIndex !== 0)).toBe(false)
  })

  it("can describe output for all 15 keys", () => {
    const descriptions = renderDeck(
      createDeckSurfaceElement({
        buttons: Array.from({ length: 15 }, (_, keyIndex) => ({ keyIndex, label: `Key ${keyIndex}` })),
      }),
    )

    expect(descriptions).toHaveLength(15)
    expect(descriptions[14]).toEqual({ keyIndex: 14, label: "Key 14", icon: undefined })
  })

  it("includes icon-backed button descriptions", () => {
    const descriptions = renderDeck(createDeckButtonElement({ keyIndex: 1, label: "Shell", icon: "./shell.svg" }))

    expect(descriptions).toEqual([{ keyIndex: 1, label: "Shell", icon: "./shell.svg" }])
  })

  it("preserves richer toggle button descriptions", () => {
    const descriptions = renderDeck(
      createDeckButtonElement({ keyIndex: 3, label: "Active", subtitle: "ON", variant: "toggle" }),
    )

    expect(descriptions).toEqual([{ keyIndex: 3, label: "Active", subtitle: "ON", variant: "toggle" }])
  })

  it("keeps generated back buttons in the render output", () => {
    const descriptions = renderDeck(
      createDeckSurfaceElement({
        buttons: [
          { keyIndex: 2, label: "Apps" },
          { keyIndex: 14, label: "Back" },
        ],
      }),
    )

    expect(descriptions).toContainEqual({ keyIndex: 14, label: "Back", icon: undefined })
  })
})
