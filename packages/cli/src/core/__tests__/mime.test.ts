import { describe, expect, it } from "vitest"

import { inferMimeFromPath } from "../mime"

describe("inferMimeFromPath", () => {
  it("returns image/svg+xml for .svg", () => {
    expect(inferMimeFromPath("/abs/foo.svg")).toBe("image/svg+xml")
  })

  it("returns image/png for .png", () => {
    expect(inferMimeFromPath("/abs/foo.png")).toBe("image/png")
  })

  it("returns image/jpeg for both .jpg and .jpeg", () => {
    expect(inferMimeFromPath("/abs/foo.jpg")).toBe("image/jpeg")
    expect(inferMimeFromPath("/abs/foo.jpeg")).toBe("image/jpeg")
  })

  it("returns image/webp for .webp", () => {
    expect(inferMimeFromPath("/abs/foo.webp")).toBe("image/webp")
  })

  it("returns image/gif for .gif", () => {
    expect(inferMimeFromPath("/abs/foo.gif")).toBe("image/gif")
  })

  it("is case-insensitive on the extension", () => {
    expect(inferMimeFromPath("/abs/foo.PNG")).toBe("image/png")
    expect(inferMimeFromPath("/abs/foo.SVG")).toBe("image/svg+xml")
  })

  it("falls back to application/octet-stream for unknown extensions", () => {
    expect(inferMimeFromPath("/abs/foo.xyz")).toBe("application/octet-stream")
  })

  it("falls back for paths without extensions", () => {
    expect(inferMimeFromPath("/abs/foo")).toBe("application/octet-stream")
  })

  it("falls back for paths ending in a dot", () => {
    expect(inferMimeFromPath("/abs/foo.")).toBe("application/octet-stream")
  })
})
