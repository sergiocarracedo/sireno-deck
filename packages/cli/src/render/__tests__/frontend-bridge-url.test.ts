import { describe, expect, it } from "vitest"

import { frontendBridgeUrl } from "../frontend-bridge-url"

describe("frontendBridgeUrl", () => {
  it("uses the service bridge by default", () => {
    expect(frontendBridgeUrl({ SIRENO_WS_URL: "ws://service:52937" })).toBe(
      "ws://service:52937",
    )
  })

  it("routes frontend clients through an explicit proxy without changing the service bridge", () => {
    expect(
      frontendBridgeUrl({
        SIRENO_WS_URL: "ws://service:52937",
        SIRENO_WS_PROXY_URL: "ws://proxy:52939",
      }),
    ).toBe("ws://proxy:52939")
  })

  it("uses the normal local bridge fallback", () => {
    expect(frontendBridgeUrl({})).toBe("ws://127.0.0.1:52937")
  })
})
