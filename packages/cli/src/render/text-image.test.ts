import { describe, expect, it } from "vitest"

import { renderBlankKeyImage, renderTextImage } from "./text-image.js"

describe("text-image", () => {
  it("renders a non-empty image buffer for a text visual", async () => {
    const buffer = await renderTextImage({ text: "Hello" })

    expect(buffer.length).toBeGreaterThan(0)
    expect(buffer.subarray(0, 8)).toEqual(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  })

  it("renders a stable blank image buffer", async () => {
    const first = await renderBlankKeyImage()
    const second = await renderBlankKeyImage()

    expect(first.equals(second)).toBe(true)
    expect(first.length).toBeGreaterThan(0)
  })
})
