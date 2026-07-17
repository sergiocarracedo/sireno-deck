import { describe, expect, it } from "vitest"

import { sessionAddon } from "../index"

describe("session addon", () => {
  it("manifest declares apiVersion 1 and the expected name", () => {
    expect(sessionAddon.apiVersion).toBe(1)
    expect(sessionAddon.name).toBe("session")
  })

  })
