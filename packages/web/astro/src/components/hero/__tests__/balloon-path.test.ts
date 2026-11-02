import { strict as assert } from "node:assert"
import { describe, it } from "node:test"

import { balloonPath, balloonTravelSeconds } from "../balloon-path"

describe("balloon flight", () => {
  for (const width of [6, 20, 90]) {
    it(`travels completely across a ${width}-unit viewport`, () => {
      const duration = balloonTravelSeconds(width)
      const start = balloonPath(0, width)
      const end = balloonPath(duration - 0.001, width)
      assert.ok(start.x < -width / 2 - 0.9)
      assert.ok(end.x > width / 2 + 0.9)
      const offscreen = balloonPath(duration, width).x
      assert.ok(offscreen > width / 2 + 0.9)
      assert.ok(
        Math.abs(balloonPath(duration + 0.5, width).x - offscreen) < 0.0001,
      )
      assert.ok(Math.abs(balloonPath(duration + 1, width).x - start.x) < 0.0001)
      assert.ok(duration > width / 0.5)
    })
  }

  it("varies the height between crossings", () => {
    const cycle = balloonTravelSeconds(20) + 1
    const heights = Array.from(
      { length: 4 },
      (_, i) => balloonPath(cycle * i + 5, 20).y,
    )
    assert.equal(new Set(heights).size, 4)
  })

  it("gently bobs and rocks within five degrees", () => {
    const points = Array.from({ length: 300 }, (_, i) => balloonPath(i / 3, 20))
    const heights = points.map((point) => point.y)
    assert.ok(Math.max(...heights) - Math.min(...heights) > 0.1)
    assert.ok(Math.max(...heights) - Math.min(...heights) < 0.4)
    assert.ok(
      points.every((point) => Math.abs(point.rotationZ) <= Math.PI / 36),
    )
  })
})
