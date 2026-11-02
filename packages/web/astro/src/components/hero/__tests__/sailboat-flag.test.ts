import { strict as assert } from "node:assert"
import { it } from "node:test"
import { sailboatFlagVertex } from "../sailboat-flag"

it("keeps the flag attached and fluttering behind the boat", () => {
  assert.deepEqual(sailboatFlagVertex(1, 0, 1, 0), { x: 1, z: 0 })
  const a = sailboatFlagVertex(20, 0, 1, 0)
  const b = sailboatFlagVertex(20, 0, 1, 1)
  assert.ok(a.x < 1)
  assert.notEqual(a.z, b.z)
})
