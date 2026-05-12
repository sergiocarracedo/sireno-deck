import { describe, expect, it } from "vitest"

import { createDeckSurfaceElement, createDeckTextElement, renderDeck } from "./reconciler.js"

describe("render reconciler", () => {
  it("produces a render description for key 0", () => {
    const descriptions = renderDeck(createDeckTextElement({ keyIndex: 0, text: "Hello" }))

    expect(descriptions).toEqual([{ keyIndex: 0, text: "Hello" }])
  })

  it("does not emit writes for untouched keys", () => {
    const descriptions = renderDeck(createDeckTextElement({ keyIndex: 0, text: "Hello World" }))

    expect(descriptions.some((description) => description.keyIndex !== 0)).toBe(false)
  })

  it("can describe output for all 15 keys", () => {
    const descriptions = renderDeck(
      createDeckSurfaceElement({ labels: Array.from({ length: 15 }, (_, keyIndex) => `Key ${keyIndex}`) }),
    )

    expect(descriptions).toHaveLength(15)
    expect(descriptions[14]).toEqual({ keyIndex: 14, text: "Key 14" })
  })
})
