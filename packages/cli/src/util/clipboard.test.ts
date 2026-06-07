import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { checkPasteAvailable, pasteText } from "./clipboard"

const { writeMock } = vi.hoisted(() => ({
  writeMock: vi.fn(),
}))

vi.mock("clipboardy", () => ({
  default: {
    write: writeMock,
    read: vi.fn(),
    writeSync: vi.fn(),
    readSync: vi.fn(),
  },
}))

describe("clipboard", () => {
  beforeEach(() => {
    writeMock.mockReset()
    writeMock.mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("writes the supplied text to the host clipboard via clipboardy", async () => {
    await pasteText("🦄")

    expect(writeMock).toHaveBeenCalledTimes(1)
    expect(writeMock).toHaveBeenCalledWith("🦄")
  })

  it("surfaces clipboardy.write errors instead of silently swallowing them", async () => {
    const clipboardError = new Error("clipboard not available")
    writeMock.mockRejectedValue(clipboardError)

    await expect(pasteText("text")).rejects.toBe(clipboardError)
  })

  it("checkPasteAvailable reports true when clipboardy is available", async () => {
    writeMock.mockResolvedValue(undefined)

    const available = await checkPasteAvailable()

    expect(available).toBe(true)
  })

  it("checkPasteAvailable reports false when clipboardy throws", async () => {
    writeMock.mockRejectedValue(new Error("clipboard unavailable"))

    const available = await checkPasteAvailable()

    expect(available).toBe(false)
  })
})