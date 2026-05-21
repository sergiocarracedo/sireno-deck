import { createElement } from "react"
import { describe, expect, it } from "vitest"

import { buttonFrame } from "./button-frame.js"
import { renderReactNodeToHtml } from "./dom-host.js"

describe("buttonFrame", () => {
  it("renders as a real React component with frame chrome", () => {
    const html = renderReactNodeToHtml(createElement(buttonFrame, null, createElement("span", null, "Clock")))

    expect(html).toContain("data-sireno-button-frame=\"true\"")
    expect(html).toContain("Clock")
  })
})
