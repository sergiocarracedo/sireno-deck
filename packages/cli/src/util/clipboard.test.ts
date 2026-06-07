import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { execa } from "execa"

import { checkPasteAvailable, pasteText } from "./clipboard"

const { writeMock, execaMock } = vi.hoisted(() => ({
  writeMock: vi.fn(),
  execaMock: vi.fn(),
}))

vi.mock("clipboardy", () => ({
  default: {
    write: writeMock,
    read: vi.fn(),
    writeSync: vi.fn(),
    readSync: vi.fn(),
  },
}))

vi.mock("execa", () => ({
  execa: execaMock,
}))

const execaTyped = vi.mocked(execa)

describe("clipboard", () => {
  beforeEach(() => {
    writeMock.mockReset()
    writeMock.mockResolvedValue(undefined)
    execaMock.mockReset()
    execaMock.mockResolvedValue({ stdout: "", stderr: "", exitCode: 0 } as never)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("writes the supplied text to the host clipboard via clipboardy", async () => {
    await pasteText("🦄")

    expect(writeMock).toHaveBeenCalledTimes(1)
    expect(writeMock).toHaveBeenCalledWith("🦄")
  })

  it("writes the clipboard before simulating the paste keystroke", async () => {
    let clipboardyInvokedAt = 0
    let execaInvokedAt = 0
    let order = 0

    writeMock.mockImplementation(async () => {
      order += 1
      clipboardyInvokedAt = order
    })
    execaTyped.mockImplementation(async () => {
      order += 1
      execaInvokedAt = order
      return { stdout: "", stderr: "", exitCode: 0 } as never
    })

    await pasteText("hello")

    expect(clipboardyInvokedAt).toBeGreaterThan(0)
    expect(execaInvokedAt).toBeGreaterThan(0)
    expect(clipboardyInvokedAt).toBeLessThan(execaInvokedAt)
  })

  it("surfaces clipboardy.write errors instead of silently swallowing them", async () => {
    const clipboardError = new Error("clipboard not available")
    writeMock.mockRejectedValue(clipboardError)

    await expect(pasteText("text")).rejects.toBe(clipboardError)
  })

  it("surfaces paste-keystroke errors when the host tool is missing", async () => {
    const pasteError = new Error("xdotool not found")
    execaTyped.mockRejectedValue(pasteError)

    await expect(pasteText("text")).rejects.toBe(pasteError)
  })

  it("checkPasteAvailable reports true when the host paste tool is present", async () => {
    const available = await checkPasteAvailable()

    expect(available).toBe(true)
  })
})
