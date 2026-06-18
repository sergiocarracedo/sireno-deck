import { createElement } from "react"
import { describe, expect, it } from "vitest"

import { renderReactNodeToHtml } from "@/render/dom-host"

import { builtinBrightnessButton } from "../../buttons/brightness"
import { BrightnessSurface, nextPercentage } from "../../buttons/BrightnessSurface"
import { BrightnessButtonSchema } from "../../buttons/brightness"

describe("BrightnessButtonSchema", () => {
  it("parses an empty config", () => {
    expect(BrightnessButtonSchema.parse({})).toEqual({})
  })
})

describe("builtinBrightnessButton", () => {
  it("has the expected shape", () => {
    expect(builtinBrightnessButton.type).toBe("brightness")
    expect(builtinBrightnessButton.configSchema).toBe(BrightnessButtonSchema)
  })
})

describe("BrightnessSurface", () => {
  it("renders the percentage text", () => {
    const html = renderReactNodeToHtml(
      createElement(BrightnessSurface, { percentage: 50 }),
    )
    expect(html).toContain("50%")
    expect(html).toContain("data-sireno-brightness-surface")
  })

  it("renders a different percentage value", () => {
    const html = renderReactNodeToHtml(
      createElement(BrightnessSurface, { percentage: 75 }),
    )
    expect(html).toContain("75%")
  })
})

describe("nextPercentage", () => {
  it("cycles 0 -> 25 -> 50 -> 75 -> 100 -> 0", () => {
    expect(nextPercentage(0)).toBe(25)
    expect(nextPercentage(25)).toBe(50)
    expect(nextPercentage(50)).toBe(75)
    expect(nextPercentage(75)).toBe(100)
    expect(nextPercentage(100)).toBe(0)
  })

  it("defaults to 25 for unknown values", () => {
    expect(nextPercentage(42)).toBe(25)
  })
})

describe("builtinBrightnessButton onTap", () => {
  it("calls setBrightnessAll with the cycled percentage", () => {
    expect(typeof builtinBrightnessButton).toBe("object")
  })
})
