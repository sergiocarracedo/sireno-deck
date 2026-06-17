import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { checkPasteAvailable, pasteText } from "./clipboard"

const { writeMock, writeSyncMock } = vi.hoisted(() => ({
  writeMock: vi.fn(),
  writeSyncMock: vi.fn(),
}))

vi.mock("clipboardy", () => ({
  default: {
    write: writeMock,
    read: vi.fn(),
    writeSync: writeSyncMock,
    readSync: vi.fn(),
  },
}))

describe("clipboard", () => {
  beforeEach(() => {
    writeMock.mockReset()
    writeSyncMock.mockReset()
    writeMock.mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("writes the supplied text to the host clipboard via clipboardy", async () => {
    await pasteText("🦄")

    expect(writeSyncMock).toHaveBeenCalledTimes(1)
    expect(writeSyncMock).toHaveBeenCalledWith("🦄")
  })

  it("surfaces clipboardy.writeSync errors instead of silently swallowing them", async () => {
    const clipboardError = new Error("clipboard not available")
    writeSyncMock.mockImplementation(() => {
      throw clipboardError
    })

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