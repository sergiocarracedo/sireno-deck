import { describe, expect, it } from "vitest"

import { resolveIconSource } from "../icon-source-resolver"

describe("resolveIconSource", () => {
  it("parses icon:// into generic", () => {
    expect(resolveIconSource("icon://alert-circle")).toEqual({
      kind: "generic",
      name: "alert-circle",
    })
  })

  it("joins addon://<name>/<path> against addonDirs", () => {
    expect(
      resolveIconSource("addon://demo/icon.svg", {
        addonDirs: new Map([["demo", "/abs/demo"]]),
      }),
    ).toEqual({ kind: "asset", fullPath: "/abs/demo/icon.svg" })
  })

  it("joins builtin://<path> against addonDirs[builtin]", () => {
    expect(
      resolveIconSource("builtin://core/foo.png", {
        addonDirs: new Map([["builtin", "/abs/builtin"]]),
      }),
    ).toEqual({ kind: "asset", fullPath: "/abs/builtin/core/foo.png" })
  })

  it("returns absolute paths as asset", () => {
    expect(resolveIconSource("/abs/foo.svg")).toEqual({
      kind: "asset",
      fullPath: "/abs/foo.svg",
    })
  })

  it("joins bare paths against the first baseDir", () => {
    expect(
      resolveIconSource("./icons/foo.svg", { baseDirs: ["/abs"] }),
    ).toEqual({ kind: "asset", fullPath: "/abs/icons/foo.svg" })
  })

  it("throws on addon:// with no addonDir registered", () => {
    expect(() =>
      resolveIconSource("addon://demo/x.svg", { addonDirs: new Map() }),
    ).toThrow(/unknown addon dir/)
  })

  it("throws on data: URLs", () => {
    expect(() => resolveIconSource("data:image/png;base64,AAAA")).toThrow(
      /must be pre-resolved/,
    )
  })

  it("throws on http:// URLs", () => {
    expect(() => resolveIconSource("https://example.com/foo.png")).toThrow(
      /must be pre-resolved/,
    )
  })

  it("throws on bare path with no baseDirs", () => {
    expect(() => resolveIconSource("./foo.svg", {})).toThrow(/no base dirs/)
  })
})
