import { describe, expect, it } from "vitest"
import { browserBridgeUrl, browserFrontendUrl } from "../browser-bridge-url"

describe("browserBridgeUrl", () => {
  it("uses the authenticated same-origin gateway for secure remote pages", () => {
    expect(
      browserBridgeUrl(
        "ws://127.0.0.1:52937",
        true,
        "https://192.0.2.10:45123/config",
      ),
    ).toBe("wss://192.0.2.10:45123/bridge")
  })

  it("keeps the local bridge for local pages and disabled gateway mode", () => {
    expect(
      browserBridgeUrl("ws://127.0.0.1:52937", true, "http://127.0.0.1:5180/"),
    ).toBe("ws://127.0.0.1:52937")
    expect(
      browserBridgeUrl("ws://127.0.0.1:52937", false, "https://example.test/"),
    ).toBe("ws://127.0.0.1:52937")
  })

  it("uses the secure frontend gateway only for secure remote pages", () => {
    expect(
      browserFrontendUrl(
        "http://127.0.0.1:5180/",
        true,
        "https://192.0.2.10:45123/",
        45124,
      ),
    ).toBe("https://192.0.2.10:45124/")
    expect(
      browserFrontendUrl(
        "http://127.0.0.1:5180/",
        true,
        "http://127.0.0.1:52938/",
        45124,
      ),
    ).toBe("http://127.0.0.1:5180/")
  })
})
