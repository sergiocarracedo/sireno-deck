import { describe, expect, it } from "vitest"

import {
  createDeckButtonElement,
  createDisplayButtonModels,
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

  it("preserves richer metric button descriptions", () => {
    const descriptions = renderDeck(
      createDeckButtonElement({ keyIndex: 4, label: "CPU", displayValue: "48%", progress: 48, variant: "metric" }),
    )

    expect(descriptions).toEqual([{ keyIndex: 4, label: "CPU", displayValue: "48%", progress: 48, variant: "metric" }])
  })

  it("preserves rich media button descriptions with detail lines", () => {
    const descriptions = renderDeck(
      createDeckButtonElement({
        keyIndex: 5,
        detailLines: ["Track Title", "Artist Name"],
        label: "Music",
        subtitle: "PLAYING",
        variant: "media",
      }),
    )

    expect(descriptions).toEqual([
      { keyIndex: 5, detailLines: ["Track Title", "Artist Name"], label: "Music", subtitle: "PLAYING", variant: "media" },
    ])
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

  it("keeps addon-backed display model generation minimal", () => {
    expect(createDisplayButtonModels([
      { type: "builtin-display-text", position: 1, label: "CPU", config: { label: "CPU" }, definition: { configSchema: {} as never, createInstance: () => ({ render: () => null as never }), type: "builtin-display-text" } },
      {
        type: "builtin-display-text",
        position: 2,
        label: "Music",
        icon: "./music.svg",
        config: { icon: "./music.svg", label: "Music" },
        definition: { configSchema: {} as never, createInstance: () => ({ render: () => null as never }), type: "builtin-display-text" },
      },
    ])).toEqual([
      { keyIndex: 1, label: "CPU", variant: "default" },
      { keyIndex: 2, label: "Music", icon: "./music.svg", variant: "default" },
    ])
  })
})
