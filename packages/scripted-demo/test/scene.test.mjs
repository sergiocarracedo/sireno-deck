import assert from "node:assert/strict"
import test from "node:test"

import { parseScene } from "../src/scene.mjs"

const scene = {
  version: 1,
  mode: "standalone",
  frontend: { root: "../frontend", configFile: "../frontend/vite.config.ts" },
  timeline: [{ atMs: 0, kind: "snapshot", path: "capture.png" }],
}

test("accepts a standalone scene with a named snapshot", () => {
  assert.deepEqual(parseScene(scene), scene)
})

test("requires an upstream URL for passthrough scenes", () => {
  assert.throws(
    () => parseScene({ ...scene, mode: "passthrough" }),
    /upstreamUrl/,
  )
})

test("requires an explicit gesture target", () => {
  assert.throws(
    () =>
      parseScene({
        ...scene,
        timeline: [{ atMs: 0, kind: "gesture", message: {} }],
      }),
    /target/,
  )
})
