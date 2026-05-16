import { describe, expect, it } from "vitest"

import { validateAddonApiVersion, validateAddonManifest } from "./manifest.js"

describe("validateAddonManifest", () => {
  it("accepts addon package metadata with sireno entrypoint information", () => {
    const manifest = validateAddonManifest({
      name: "test-addon",
      sirenoAddon: {
        apiVersion: 1,
        main: "./src/index.js",
      },
    })

    expect(manifest).toEqual({
      apiVersion: 1,
      main: "./src/index.js",
      name: "test-addon",
    })
  })

  it("rejects apiVersion mismatches explicitly", () => {
    const manifest = validateAddonManifest({
      name: "test-addon",
      sirenoAddon: {
        apiVersion: 99,
        main: "./src/index.js",
      },
    })

    expect(() => validateAddonApiVersion(manifest)).toThrow(
      "Addon 'test-addon' declares apiVersion 99, expected 1",
    )
  })
})
