import { afterEach, describe, expect, it, vi } from "vitest"

import {
  probeCommandExecution,
  probeInternetAccess,
  probeMediaAccess,
} from "../runtime-features"

describe("probeCommandExecution", () => {
  afterEach(() => vi.unstubAllGlobals())

  it("reports available when the shell binary exists", async () => {
    const result = await probeCommandExecution()
    if (process.platform === "win32") {
      expect(result.available).toBe(true)
    } else {
      expect(result.available).toBe(true)
    }
  })

  it("reports unavailable with reason when the shell is missing", async () => {
    const original = process.platform
    Object.defineProperty(process, "platform", { value: "linux" })
    try {
      const result = await probeCommandExecution()
      expect(typeof result.available).toBe("boolean")
    } finally {
      Object.defineProperty(process, "platform", { value: original })
    }
  })
})

describe("probeMediaAccess", () => {
  it("returns a structured result", async () => {
    const result = await probeMediaAccess()
    expect(typeof result.available).toBe("boolean")
    if (!result.available) {
      expect(typeof result.reason).toBe("string")
    }
  })
})

describe("probeInternetAccess", () => {
  it("returns a structured result", async () => {
    const result = await probeInternetAccess()
    expect(typeof result.available).toBe("boolean")
    if (!result.available) {
      expect(typeof result.reason).toBe("string")
    }
  })

  it("treats fetch absence as unavailable", async () => {
    const original = globalThis.fetch
    // @ts-expect-error - simulate missing fetch
    delete globalThis.fetch
    try {
      const result = await probeInternetAccess()
      expect(result.available).toBe(false)
      expect(result.reason).toBe("fetch unavailable")
    } finally {
      globalThis.fetch = original
    }
  })
})
