import { strict as assert } from "node:assert"
import { describe, it } from "node:test"

import { DOLPHIN_LOOP_SECONDS, dolphinPath } from "../dolphin-path"

describe("dolphin swimming path", () => {
  it("returns to the same position and direction without a jump", () => {
    const before = dolphinPath(DOLPHIN_LOOP_SECONDS - 0.0001, 1)
    const after = dolphinPath(0, 1)
    for (const key of ["x", "y", "z", "dx", "dy", "dz"] as const) {
      assert.ok(Math.abs(before[key] - after[key]) < 0.001, key)
    }
  })

  it("points its nose along the direction of travel throughout the loop", () => {
    for (const scale of [1, 0.38]) {
      for (let t = 0; t < DOLPHIN_LOOP_SECONDS; t += 0.1) {
        const a = dolphinPath(t, scale)
        const b = dolphinPath(t + 0.0001, scale)
        const dot = (b.x - a.x) * a.dx + (b.y - a.y) * a.dy + (b.z - a.z) * a.dz
        assert.ok(dot > 0, `moving forward at ${t}s, scale ${scale}`)
      }
    }
  })

  it("rises and falls as part of the same continuous path", () => {
    const points = Array.from({ length: 100 }, (_, i) =>
      dolphinPath((i * DOLPHIN_LOOP_SECONDS) / 100, 1),
    )
    assert.ok(
      Math.max(...points.map((p) => p.y)) -
        Math.min(...points.map((p) => p.y)) >
        1,
    )
    assert.ok(points.some((p) => p.dy > 0.1))
    assert.ok(points.some((p) => p.dy < -0.1))
  })
})
