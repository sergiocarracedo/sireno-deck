import { createElement } from "react"
import { describe, expect, it } from "vitest"

import { createDomButtonRender } from "../addon/api.js"
import { createHostedButtonElement, renderDomDeck, renderReactNodeToHtml } from "./dom-host.js"

describe("dom host", () => {
  it("applies buttonFrame by default", () => {
    const html = renderReactNodeToHtml(createHostedButtonElement(createDomButtonRender({
      content: createElement("span", null, "Action"),
      keyIndex: 0,
    })))

    expect(html).toContain("data-sireno-button-frame=\"true\"")
    expect(html).toContain("Action")
  })

  it("skips buttonFrame when full_surface is explicit", () => {
    const html = renderReactNodeToHtml(createHostedButtonElement(createDomButtonRender({
      content: createElement("div", { "data-surface": "full" }, "Surface"),
      full_surface: true,
      keyIndex: 1,
    })))

    expect(html).not.toContain("data-sireno-button-frame=\"true\"")
    expect(html).toContain("data-surface=\"full\"")
  })

  it("renders a full deck document with stable key slots", () => {
    const html = renderDomDeck([
      createDomButtonRender({
        content: createElement("span", null, "Action"),
        keyIndex: 0,
      }),
      createDomButtonRender({
        content: createElement("div", { "data-surface": "full" }, "Surface"),
        full_surface: true,
        keyIndex: 2,
      }),
    ], {
      keyCount: 3,
    })

    expect(html).toContain('id="deck-root"')
    expect(html).toContain('data-sireno-key="0"')
    expect(html).toContain('data-sireno-key="1"')
    expect(html).toContain('data-sireno-key="2"')
  })
})
