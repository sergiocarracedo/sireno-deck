import { strict as assert } from "node:assert"
import { describe, it } from "node:test"
import { sailboatPath, SAILBOAT_LOOP_SECONDS } from "../sailboat-path"

describe("sailboat route", () => {
  it("crosses itself at the center and clears the scenery", () => {
    const obstacles = [
      { x: -6.4, z: -3.7, clearance: 3 },
      { x: -8.1, z: 2.2, clearance: 1.5 },
      { x: 8.4, z: -2.6, clearance: 1.7 },
      { x: 4.2, z: 2.5, clearance: 1.8 },
    ]
    const points = Array.from({ length: 5000 }, (_, i) =>
      sailboatPath((i * SAILBOAT_LOOP_SECONDS) / 5000, 1),
    )
    const halfway = sailboatPath(SAILBOAT_LOOP_SECONDS / 2, 1)
    assert.ok(
      Math.hypot(points[0]!.x - halfway.x, points[0]!.z - halfway.z) < 1e-8,
    )
    for (const obstacle of obstacles) {
      const closest = Math.min(
        ...points.map((p) => Math.hypot(p.x - obstacle.x, p.z - obstacle.z)),
      )
      assert.ok(
        closest > obstacle.clearance,
        `clearance at ${obstacle.x},${obstacle.z}: ${closest}`,
      )
    }
  })
  it("closes smoothly and points along its direction of travel", () => {
    for (const scale of [1, 0.38]) {
      const start = sailboatPath(0, scale)
      const end = sailboatPath(SAILBOAT_LOOP_SECONDS, scale)
      assert.ok(Math.hypot(start.x - end.x, start.z - end.z) < 1e-10)
      for (let t = 0; t < SAILBOAT_LOOP_SECONDS; t += 0.1) {
        const a = sailboatPath(t, scale)
        const b = sailboatPath(t + 0.001, scale)
        assert.ok(
          (b.x - a.x) * Math.cos(a.yaw) - (b.z - a.z) * Math.sin(a.yaw) > 0,
        )
      }
    }
  })
})
