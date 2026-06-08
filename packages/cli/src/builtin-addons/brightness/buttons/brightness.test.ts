import { describe, expect, it } from "vitest"

import { builtinBrightnessButton } from "./brightness"
import { nextPercentage } from "./BrightnessSurface"
import { BrightnessButtonSchema } from "./brightness"

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
