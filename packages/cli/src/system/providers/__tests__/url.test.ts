import { describe, expect, it, vi } from "vitest"

import { createUrlProvider, validateOpenUrl } from "../url"

describe("validateOpenUrl", () => {
  it.each([
    "https://example.com",
    "http://localhost:52938/?token=secret#/config",
    "mailto:support@example.com",
    "tel:+34900000000",
  ])("allows %s", (value) => {
    expect(validateOpenUrl(value)).toBe(value)
  })

  it.each([
    "",
    "javascript:alert(1)",
    "file:///etc/passwd",
    "ftp://example.com",
  ])("rejects %s", (value) => {
    expect(() => validateOpenUrl(value)).toThrow()
  })
})

describe("createUrlProvider", () => {
  it.each([
    ["linux", "xdg-open"],
    ["darwin", "open"],
    ["win32", "rundll32.exe"],
  ] as const)(
    "uses the default URL handler on %s",
    async (platform, command) => {
      const run = vi.fn(async () => ({ exitCode: 0, stdout: "", stderr: "" }))
      const provider = createUrlProvider(platform, { run })

      await provider.open("https://example.com/?a=1&b=two")

      expect(run).toHaveBeenCalledWith(
        command,
        platform === "win32"
          ? ["url.dll,FileProtocolHandler", "https://example.com/?a=1&b=two"]
          : ["https://example.com/?a=1&b=two"],
      )
    },
  )

  it("does not invoke the OS for a disallowed protocol", async () => {
    const run = vi.fn()
    const provider = createUrlProvider("linux", { run })
    await expect(provider.open("javascript:alert(1)")).rejects.toThrow()
    expect(run).not.toHaveBeenCalled()
  })
})
