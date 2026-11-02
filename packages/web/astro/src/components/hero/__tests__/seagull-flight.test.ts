import { strict as assert } from "node:assert"
import { describe, it } from "node:test"
import { flapWing, seagullFlight } from "../seagull-flight"

describe("seagull animation", () => {
  it("moves five birds through different positions", () => {
    const points = Array.from({ length: 5 }, (_, index) =>
      seagullFlight(4, index, 1),
    )
    assert.equal(new Set(points.map(({ x, z }) => `${x},${z}`)).size, 5)
    assert.notDeepEqual(seagullFlight(0, 0, 1), seagullFlight(1, 0, 1))
  })

  it("flaps both wings together without moving the body", () => {
    assert.deepEqual(flapWing(3, 8, 0.4), { y: 3, z: 8 })
    const left = flapWing(20, -35, 0.4)
    const right = flapWing(20, 35, 0.4)
    assert.ok(left.y > 20)
    assert.equal(left.y, right.y)
    assert.equal(left.z, -right.z)
  })

  it("glides for four seconds and resumes flapping smoothly", () => {
    for (let t = 2; t <= 6; t += 0.1) {
      assert.ok(Math.abs(seagullFlight(t, 0, 1).flap) < 1e-12)
    }
    assert.notEqual(seagullFlight(8, 0, 1).flap, 0)
    assert.ok(Math.abs(seagullFlight(6.001, 0, 1).flap) < 0.001)
    assert.ok(Math.abs(seagullFlight(3, 2, 1).flap) > 0.01)
  })

  it("uses pronounced wingbeats at different speeds", () => {
    const crossings = Array.from({ length: 5 }, (_, index) => {
      const samples = Array.from(
        { length: 3000 },
        (_, i) => seagullFlight(i / 100, index, 1).flap,
      )
      assert.ok(Math.max(...samples) > 0.6)
      assert.ok(Math.min(...samples) < -0.6)
      return samples.slice(1).filter((value, i) => value * samples[i]! < 0)
        .length
    })
    assert.ok(new Set(crossings).size >= 4)
  })

  it("gives birds different orbit sizes and speeds", () => {
    const first = seagullFlight(0, 0, 1)
    const later = seagullFlight(10, 0, 1)
    const other = seagullFlight(0, 1, 1)
    const otherLater = seagullFlight(10, 1, 1)
    assert.notEqual(
      Math.hypot(first.x, first.z + 2.4),
      Math.hypot(other.x, other.z + 2.4),
    )
    assert.notEqual(later.yaw - first.yaw, otherLater.yaw - other.yaw)
  })
})
