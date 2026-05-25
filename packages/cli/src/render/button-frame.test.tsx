import { createElement } from "react"
import { describe, expect, it } from "vitest"

import { renderReactNodeToHtml } from "./dom-host.js"
import { buttonFrame } from "./button-frame.js"

describe("buttonFrame", () => {
  it("renders as a real React component with frame chrome", () => {
    const html = renderReactNodeToHtml(createElement(buttonFrame, { state: "idle" }, createElement("span", null, "Clock")))

    expect(html).toContain("data-sireno-button-frame=\"true\"")
    expect(html).toContain("Clock")
    expect(html).toContain('class="bg-background border-accent"')
    expect(html).toContain('var(--sireno-color-primary)')
  })

  it("surfaces non-idle interaction state in the frame markup", () => {
    const html = renderReactNodeToHtml(createElement(buttonFrame, { state: "hold" }, createElement("span", null, "Clock")))

    expect(html).toContain('data-sireno-button-frame-state="hold"')
    expect(html).toContain("translateY(1px) scale(0.985)")
  })
})
