import { strict as assert } from "node:assert"
import { describe, it } from "node:test"

import { oceanTileRadius } from "../ocean-layout"

describe("ocean tile coverage", () => {
  for (const viewWidth of [16, (10 * 1920) / 392, (10 * 2560) / 300]) {
    it(`covers a view ${viewWidth.toFixed(2)} units wide with overlapping tiles`, () => {
      const tileWidth = 11.76
      const radius = oceanTileRadius(viewWidth, tileWidth)
      assert.ok((radius + 0.5) * tileWidth > viewWidth / 2)
    })
  }

  it("increases coverage when the viewport becomes wider", () => {
    assert.ok(oceanTileRadius(80, 11.76) > oceanTileRadius(16, 11.76))
  })
})
