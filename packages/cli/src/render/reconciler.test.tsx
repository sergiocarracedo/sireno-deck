import { describe, expect, it } from "vitest"

import {
  createDeckButtonElement,
  createDisplayButtonModels,
  createDeckSurfaceElement,
  createDeckTextElement,
  renderDeck,
} from "./reconciler.js"
import {
  helperAddonButton,
  helperAddonSurface,
  helperAddonText,
  jsxAddonButton,
  jsxAddonSurface,
  jsxAddonText,
} from "../../fixtures/phase-9/jsx-addon-authoring-example.js"

const jsxButton = <deck-button keyIndex={7} label="JSX" fit="shrink" subtitle="typed" variant="toggle" wrapper="shared" />

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

  it("preserves emoji button descriptions", () => {
    const descriptions = renderDeck(
      createDeckButtonElement({ keyIndex: 6, label: "GRIN", subtitle: "Favorites", variant: "emoji" }),
    )

    expect(descriptions).toEqual([{ keyIndex: 6, label: "GRIN", subtitle: "Favorites", variant: "emoji" }])
  })

  it("preserves analog clock button descriptions without forcing wrapper props", () => {
    const descriptions = renderDeck(
      createDeckButtonElement({ keyIndex: 11, variant: "analog-clock" }),
    )

    expect(descriptions).toEqual([{ keyIndex: 11, variant: "analog-clock" }])
  })

  it("preserves calendar-sheet button descriptions without forcing wrapper props", () => {
    const descriptions = renderDeck(
      createDeckButtonElement({ keyIndex: 6, variant: "calendar-sheet" }),
    )

    expect(descriptions).toEqual([{ keyIndex: 6, variant: "calendar-sheet" }])
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

  it("threads explicit button backgrounds through render descriptions", () => {
    const descriptions = renderDeck(
      createDeckButtonElement({ background: "#224466", keyIndex: 2, label: "Clock" }),
    )

    expect(descriptions).toEqual([{ background: "#224466", keyIndex: 2, label: "Clock" }])
  })

  it("applies deck-surface background fallback only to buttons without overrides", () => {
    const descriptions = renderDeck(
      createDeckSurfaceElement({
        background: "#112233",
        buttons: [
          { keyIndex: 0, label: "Deck" },
          { background: "#445566", keyIndex: 1, label: "Button" },
        ],
      }),
    )

    expect(descriptions).toEqual([
      { background: "#112233", keyIndex: 0, label: "Deck" },
      { background: "#445566", keyIndex: 1, label: "Button" },
    ])
  })

  it("keeps addon-backed display model generation minimal", () => {
    expect(createDisplayButtonModels([
      { type: "display-text", position: 1, label: "CPU", config: { label: "CPU" }, definition: { configSchema: {} as never, createInstance: () => ({ render: () => null as never }), type: "display-text" } },
      {
        type: "display-text",
        position: 2,
        label: "Music",
        icon: "./music.svg",
        config: { icon: "./music.svg", label: "Music" },
        definition: { configSchema: {} as never, createInstance: () => ({ render: () => null as never }), type: "display-text" },
      },
    ])).toEqual([
      { keyIndex: 1, label: "CPU", variant: "default" },
      { keyIndex: 2, label: "Music", icon: "./music.svg", variant: "default" },
    ])
  })

  it("renders JSX-authored deck elements with the same descriptions as helper-authored ones", () => {
    const helperDescriptions = renderDeck(
      createDeckButtonElement({
        keyIndex: 7,
        fit: "shrink",
        label: "JSX",
        subtitle: "typed",
        variant: "toggle",
        wrapper: "shared",
      }),
    )

    expect(renderDeck(jsxButton)).toEqual(helperDescriptions)
  })

  it("preserves explicit shared wrapper props in render descriptions", () => {
    const descriptions = renderDeck(
      createDeckButtonElement({
        keyIndex: 8,
        fit: "shrink",
        label: "Clock",
        subtitle: "Local",
        wrapper: "shared",
      }),
    )

    expect(descriptions).toEqual([{ fit: "shrink", keyIndex: 8, label: "Clock", subtitle: "Local", wrapper: "shared" }])
  })

  it("keeps helper-authored and JSX-authored shared wrapper output in parity", () => {
    const helperDescriptions = renderDeck(
      createDeckButtonElement({
        detailLines: ["Tue", "09:41"],
        fit: "shrink",
        keyIndex: 9,
        label: "Clock",
        wrapper: "shared",
      }),
    )
    const jsxDescriptions = renderDeck(
      <deck-button detailLines={["Tue", "09:41"]} fit="shrink" keyIndex={9} label="Clock" wrapper="shared" />,
    )

    expect(jsxDescriptions).toEqual(helperDescriptions)
  })

  it("threads explicit wrap fit props through render descriptions", () => {
    const descriptions = renderDeck(
      createDeckButtonElement({ fit: "wrap", keyIndex: 4, label: "Long Label", wrapper: "shared" }),
    )

    expect(descriptions).toEqual([{ fit: "wrap", keyIndex: 4, label: "Long Label", wrapper: "shared" }])
  })

  it("keeps helper-authored and JSX-authored analog clock output in parity", () => {
    const helperDescriptions = renderDeck(
      createDeckButtonElement({ keyIndex: 12, variant: "analog-clock" }),
    )
    const jsxDescriptions = renderDeck(<deck-button keyIndex={12} variant="analog-clock" />)

    expect(jsxDescriptions).toEqual(helperDescriptions)
    expect(helperDescriptions).toEqual([{ keyIndex: 12, variant: "analog-clock" }])
  })

  it("threads analog clock variants through deck-surface button collections", () => {
    const descriptions = renderDeck(
      createDeckSurfaceElement({
        buttons: [
          { keyIndex: 1, label: "Digital" },
          { keyIndex: 13, variant: "analog-clock" },
        ],
      }),
    )

    expect(descriptions).toContainEqual({ keyIndex: 13, variant: "analog-clock" })
  })

  it("keeps helper-authored and JSX-authored calendar-sheet output in parity", () => {
    const helperDescriptions = renderDeck(
      createDeckButtonElement({ keyIndex: 2, variant: "calendar-sheet" }),
    )
    const jsxDescriptions = renderDeck(<deck-button keyIndex={2} variant="calendar-sheet" />)

    expect(jsxDescriptions).toEqual(helperDescriptions)
    expect(helperDescriptions).toEqual([{ keyIndex: 2, variant: "calendar-sheet" }])
  })

  it("threads calendar-sheet variants through deck-surface button collections", () => {
    const descriptions = renderDeck(
      createDeckSurfaceElement({
        buttons: [
          { keyIndex: 1, label: "Digital" },
          { keyIndex: 14, variant: "calendar-sheet" },
        ],
      }),
    )

    expect(descriptions).toContainEqual({ keyIndex: 14, variant: "calendar-sheet" })
  })

  it("lets bespoke button renders omit the shared wrapper props", () => {
    const descriptions = renderDeck(
      createDeckButtonElement({ keyIndex: 10, label: "Analog", subtitle: "Custom", variant: "toggle" }),
    )

    expect(descriptions).toEqual([{ keyIndex: 10, label: "Analog", subtitle: "Custom", variant: "toggle" }])
  })

  it("keeps the shipped Phase 9 addon authoring example in helper and JSX parity", () => {
    expect(renderDeck(jsxAddonButton)).toEqual(renderDeck(helperAddonButton))
    expect(renderDeck(jsxAddonSurface)).toEqual(renderDeck(helperAddonSurface))
    expect(renderDeck(jsxAddonText)).toEqual(renderDeck(helperAddonText))
  })
})
