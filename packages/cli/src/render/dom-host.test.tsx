import { createElement } from "react"
import { describe, expect, it } from "vitest"

import { ButtonSurface } from "../addon/api.js"
import { resolveTheme } from "../config/theme.js"
import { createHostedButtonElement, renderDomDeck, renderReactNodeToHtml } from "./dom-host.js"

describe("dom host", () => {
  it("applies buttonFrame by default", () => {
    const html = renderReactNodeToHtml(createHostedButtonElement({
      content: createElement("span", null, "Action"),
      keyIndex: 0,
    }))

    expect(html).toContain("data-sireno-button-frame=\"true\"")
    expect(html).toContain("Action")
  })

  it("skips buttonFrame when full_surface is explicit", () => {
    const html = renderReactNodeToHtml(createHostedButtonElement({
      content: createElement("div", { "data-surface": "full" }, "Surface"),
      full_surface: true,
      keyIndex: 1,
    }))

    expect(html).not.toContain("data-sireno-button-frame=\"true\"")
    expect(html).toContain("data-surface=\"full\"")
  })

  it("renders a full deck document with stable key slots", () => {
    const html = renderDomDeck([
      {
        content: createElement("span", null, "Action"),
        keyIndex: 0,
        sample_interval_ms: 250,
      },
      {
        content: createElement("div", { "data-surface": "full" }, "Surface"),
        full_surface: true,
        keyIndex: 2,
      },
    ], {
      keyCount: 3,
    })

    expect(html).toContain('id="deck-root"')
    expect(html).toContain('data-sireno-key="0"')
    expect(html).toContain('data-sireno-key="1"')
    expect(html).toContain('data-sireno-key="2"')
    expect(html).toContain('data-sireno-media-sample-interval-ms="250"')
  })

  it("exports theme CSS vars and the browser utility stylesheet on the deck root", () => {
    const html = renderDomDeck([], {
      keyCount: 1,
      theme: resolveTheme("dark"),
    })

    expect(html).toContain('data-sireno-theme-utilities="true"')
    expect(html).toContain('--sireno-color-primary:#7dd3fc;')
    expect(html).toContain('--sireno-color-background:#10161f;')
    expect(html).toContain('--sireno-font-main-family:')
    expect(html).toContain('.text-primary{color:var(--sireno-color-primary);}')
    expect(html).toContain('.font-main{font-family:var(--sireno-font-main-family);')
  })

  it("renders React TSX metadata wrappers through react-dom static markup", () => {
    const html = renderReactNodeToHtml(createElement(ButtonSurface, {
      full_surface: true,
      sample_interval_ms: 400,
    }, createElement("span", null, "TSX")))

    expect(html).toContain('data-sireno-button-surface="true"')
    expect(html).toContain('data-sireno-full-surface="true"')
    expect(html).toContain('data-sireno-media-sample-interval-ms="400"')
    expect(html).toContain('display:contents')
  })

  it("preserves addon-authored ButtonSurface sampling metadata without nesting a duplicate host wrapper", () => {
    const html = renderReactNodeToHtml(createHostedButtonElement({
      content: createElement(ButtonSurface, {
        full_surface: true,
        sample_interval_ms: 600,
      }, createElement("span", null, "Media")),
      full_surface: true,
      keyIndex: 0,
      sample_interval_ms: 600,
    }))

    expect(html).toContain('data-sireno-media-sample-interval-ms="600"')
    expect(html.match(/data-sireno-button-surface="true"/g)).toHaveLength(1)
  })
})
