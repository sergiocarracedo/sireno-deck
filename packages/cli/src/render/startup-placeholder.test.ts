import { describe, expect, it } from "vitest"

import { createStartupPlaceholderBuffers } from "./startup-placeholder"

describe("startup placeholder", () => {
  it("creates one raw key buffer per requested key", async () => {
    const buffers = await createStartupPlaceholderBuffers(2)

    expect(buffers.size).toBe(2)
    expect(buffers.get(0)?.length).toBe(72 * 72 * 3)
    expect(buffers.get(1)?.length).toBe(72 * 72 * 3)
  })

  it("uses a deck-wide logo treatment instead of repeating the same tile on every key", async () => {
    const buffers = await createStartupPlaceholderBuffers(15)
    const uniqueBuffers = new Set(
      [...buffers.values()].map((buffer) => buffer.toString("base64")),
    )

    expect(uniqueBuffers.size).toBeGreaterThan(1)
  })
})
