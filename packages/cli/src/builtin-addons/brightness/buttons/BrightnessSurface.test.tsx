import { createElement } from "react"
import { describe, expect, it } from "vitest"

import { renderReactNodeToHtml } from "@/render/dom-host"
import { Text } from "@/ui/index"
import { BrightnessSurface } from "./BrightnessSurface"

describe("BrightnessSurface", () => {
  it("renders the current percentage as a text element", () => {
    const html = renderReactNodeToHtml(createElement(BrightnessSurface, { percentage: 50 }))
    expect(html).toContain("50%")
  })

  it("renders 0% correctly", () => {
    const html = renderReactNodeToHtml(createElement(BrightnessSurface, { percentage: 0 }))
    expect(html).toContain("0%")
  })

  it("renders 100% correctly", () => {
    const html = renderReactNodeToHtml(createElement(BrightnessSurface, { percentage: 100 }))
    expect(html).toContain("100%")
  })

  it("renders a tap hint chip", () => {
    const html = renderReactNodeToHtml(createElement(BrightnessSurface, { percentage: 50 }))
    expect(html).toContain("sireno-brightness-tap-hint")
  })
})

describe("Text used by BrightnessSurface (regression guard)", () => {
  it("exports a Text element with a `tone` prop", () => {
    const html = renderReactNodeToHtml(
      createElement(Text, { tone: "primary", size: "xl" }, "marker"),
    )
    expect(html).toContain("marker")
  })
})
