import { describe, expect, it } from "vitest"

import { makeAssetId } from "../asset-id"

describe("makeAssetId", () => {
  it("is deterministic for the same inputs", () => {
    const a = makeAssetId("/abs/foo.png", 1024, 1700000000000)
    const b = makeAssetId("/abs/foo.png", 1024, 1700000000000)
    expect(a).toBe(b)
  })

  it("derives the basename prefix from the path", () => {
    const id = makeAssetId("/abs/icons/foo.png", 1024, 1700000000000)
    expect(id.startsWith("foo.png-")).toBe(true)
  })

  it("changes when the path changes", () => {
    const a = makeAssetId("/abs/foo.png", 1024, 1700000000000)
    const b = makeAssetId("/abs/bar.png", 1024, 1700000000000)
    expect(a).not.toBe(b)
  })

  it("changes when filesize changes", () => {
    const a = makeAssetId("/abs/foo.png", 1024, 1700000000000)
    const b = makeAssetId("/abs/foo.png", 2048, 1700000000000)
    expect(a).not.toBe(b)
  })

  it("changes when mtime changes", () => {
    const a = makeAssetId("/abs/foo.png", 1024, 1700000000000)
    const b = makeAssetId("/abs/foo.png", 1024, 1700000000001)
    expect(a).not.toBe(b)
  })

  it("returns a 16-hex-char hash suffix", () => {
    const id = makeAssetId("/abs/foo.png", 1024, 1700000000000)
    const suffix = id.slice("foo.png-".length)
    expect(suffix).toMatch(/^[0-9a-f]{16}$/)
  })
})
