import { mkdtempSync, readFileSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const confirmMock = vi.fn()
const isCancelMock = vi.fn(() => false)
const installMock = vi.fn()
vi.mock("@/cli/prompt", () => ({
  confirm: confirmMock,
  isCancel: isCancelMock,
  note: vi.fn(),
}))
vi.mock("../commands/skills", () => ({ installConfigSkill: installMock }))

const { offerConfigSkillOnFirstRun } = await import("../skills-first-run")

describe("first-run skill offer", () => {
  let xdg: string
  let previousXdg: string | undefined
  let previousTty: boolean | undefined

  beforeEach(() => {
    xdg = mkdtempSync(join(tmpdir(), "sirenodeck-skill-offer-"))
    previousXdg = process.env["XDG_CONFIG_HOME"]
    previousTty = process.stdin.isTTY
    process.env["XDG_CONFIG_HOME"] = xdg
    Object.defineProperty(process.stdin, "isTTY", {
      configurable: true,
      value: true,
    })
    vi.clearAllMocks()
    isCancelMock.mockReturnValue(false)
  })

  afterEach(() => {
    if (previousXdg === undefined) delete process.env["XDG_CONFIG_HOME"]
    else process.env["XDG_CONFIG_HOME"] = previousXdg
    Object.defineProperty(process.stdin, "isTTY", {
      configurable: true,
      value: previousTty,
    })
    rmSync(xdg, { recursive: true, force: true })
  })

  const marker = (): string => join(xdg, "sirenodeck", "skills-offer-v1.json")

  it("records a declined offer and does not ask again", async () => {
    confirmMock.mockResolvedValue(false)

    await offerConfigSkillOnFirstRun()
    await offerConfigSkillOnFirstRun()

    expect(confirmMock).toHaveBeenCalledTimes(1)
    expect(JSON.parse(readFileSync(marker(), "utf8"))).toEqual({
      version: 1,
      choice: "declined",
    })
    expect(installMock).not.toHaveBeenCalled()
  })

  it("installs after confirmation and records success", async () => {
    confirmMock.mockResolvedValue(true)
    installMock.mockResolvedValue(true)

    await offerConfigSkillOnFirstRun()

    expect(installMock).toHaveBeenCalledWith({ confirmed: true })
    expect(JSON.parse(readFileSync(marker(), "utf8")).choice).toBe("accepted")
  })

  it("leaves failed installations retryable", async () => {
    confirmMock.mockResolvedValue(true)
    installMock.mockResolvedValue(false)

    await offerConfigSkillOnFirstRun()

    expect(() => readFileSync(marker(), "utf8")).toThrow()
  })

  it("does not prompt in noninteractive runs", async () => {
    Object.defineProperty(process.stdin, "isTTY", {
      configurable: true,
      value: false,
    })

    await offerConfigSkillOnFirstRun()

    expect(confirmMock).not.toHaveBeenCalled()
    expect(installMock).not.toHaveBeenCalled()
  })
})
