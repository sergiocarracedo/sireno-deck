import { describe, expect, it } from "vitest"

import {
  formatLinuxUdevAccessError,
  getLinuxUdevRuleHints,
  isLikelyLinuxUdevAccessError,
} from "./linux-udev"

describe("linux udev diagnostics", () => {
  it("detects Linux permission failures by errno code", () => {
    expect(
      isLikelyLinuxUdevAccessError({ code: "EACCES", message: "Permission denied" }, { platform: "linux" }),
    ).toBe(true)
  })

  it("does not report udev diagnostics outside Linux", () => {
    expect(
      formatLinuxUdevAccessError(new Error("Permission denied opening HID device"), {
        platform: "darwin",
      }),
    ).toBeNull()
  })

  it("formats rules path hints and package asset reference", () => {
    const message = formatLinuxUdevAccessError(new Error("LIBUSB_ERROR_ACCESS"), {
      platform: "linux",
      pathExists: (path) => path === "/usr/lib/udev/rules.d/50-elgato-stream-deck.rules",
      resolvePackageAsset: () => "/workspace/node_modules/@elgato-stream-deck/node/udev-generator-rules.json",
    })

    expect(message).toContain("Package reference: /workspace/node_modules/@elgato-stream-deck/node/udev-generator-rules.json")
    expect(message).toContain("/etc/udev/rules.d/50-elgato-stream-deck.rules")
    expect(message).toContain("/lib/udev/rules.d/50-elgato-stream-deck.rules")
    expect(message).not.toContain("/usr/lib/udev/rules.d/50-elgato-stream-deck.rules")
  })

  it("returns the remaining suggested rules paths", () => {
    const hints = getLinuxUdevRuleHints({
      pathExists: () => false,
      resolvePackageAsset: () => undefined,
    })

    expect(hints.packageAssetPath).toBeUndefined()
    expect(hints.suggestedRulePaths).toHaveLength(3)
  })
})
