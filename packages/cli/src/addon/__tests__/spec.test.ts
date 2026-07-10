import { describe, expect, it } from "vitest"

import { isLocalAddonSpec, isNpmAddonSpec } from "../spec"

describe("isLocalAddonSpec", () => {
  it("accepts ./relative paths", () => {
    expect(isLocalAddonSpec("./my-addon")).toBe(true)
    expect(isLocalAddonSpec("../shared/my-addon")).toBe(true)
  })

  it("accepts absolute paths", () => {
    expect(isLocalAddonSpec("/abs/my-addon")).toBe(true)
  })

  it("accepts ~/ paths", () => {
    expect(isLocalAddonSpec("~/addons/x")).toBe(true)
  })

  it("accepts relative paths with / or \\", () => {
    expect(isLocalAddonSpec("addons/local")).toBe(true)
    expect(isLocalAddonSpec("foo\\bar")).toBe(true)
  })

  it("rejects bare names", () => {
    expect(isLocalAddonSpec("core")).toBe(false)
  })

  it("rejects scoped npm packages", () => {
    expect(isLocalAddonSpec("@me/my-addon")).toBe(false)
    expect(isLocalAddonSpec("@me/my-addon@1.2.3")).toBe(false)
  })
})

describe("isNpmAddonSpec", () => {
  it("accepts bare names", () => {
    expect(isNpmAddonSpec("lodash")).toBe(true)
    expect(isNpmAddonSpec("core")).toBe(true)
    expect(isNpmAddonSpec("my-addon@1.2.3")).toBe(true)
    expect(isNpmAddonSpec("my-addon@^1.0.0")).toBe(true)
  })

  it("accepts scoped packages", () => {
    expect(isNpmAddonSpec("@types/node")).toBe(true)
    expect(isNpmAddonSpec("@scope/my-addon")).toBe(true)
    expect(isNpmAddonSpec("@scope/my-addon@^2.0.0")).toBe(true)
  })

  it("rejects local paths", () => {
    expect(isNpmAddonSpec("./local")).toBe(false)
    expect(isNpmAddonSpec("../shared")).toBe(false)
    expect(isNpmAddonSpec("/abs/path")).toBe(false)
    expect(isNpmAddonSpec("~/addons")).toBe(false)
    expect(isNpmAddonSpec("addons/local")).toBe(false)
  })

  it("rejects sireno aliases (@/, @\\\\)", () => {
    expect(isNpmAddonSpec("@/components/Foo")).toBe(false)
  })
})
