import { describe, expect, it, vi, beforeEach } from "vitest"

const execaMock = vi.fn()
const confirmMock = vi.fn()
const isCancelMock = vi.fn(() => false)
const promptLog = { info: vi.fn(), success: vi.fn(), error: vi.fn() }

vi.mock("execa", () => ({ execa: execaMock }))
vi.mock("@/cli/prompt", () => ({
  confirm: confirmMock,
  isCancel: isCancelMock,
  intro: vi.fn(),
  note: vi.fn(),
  log: promptLog,
}))

const { installConfigSkill, skillsCommand } = await import("../skills")

describe("sirenodeck skills command", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    isCancelMock.mockReturnValue(false)
  })

  it("registers a skills command", () => {
    expect(skillsCommand.command).toBe("skills")
  })

  it("requires confirmation and lets the upstream tool select agents", async () => {
    confirmMock.mockResolvedValue(true)
    execaMock.mockResolvedValue({})

    await expect(installConfigSkill({ interactive: true })).resolves.toBe(true)
    expect(confirmMock).toHaveBeenCalledWith(
      expect.objectContaining({ initialValue: false }),
    )
    expect(execaMock).toHaveBeenCalledWith(
      "npx",
      [
        "--yes",
        "skills",
        "add",
        "https://github.com/sergiocarracedo/sireno-deck/tree/main/skills/sirenodeck-config",
        "--skill",
        "sirenodeck-config",
        "--global",
      ],
      { stdio: "inherit" },
    )
  })

  it("does not launch npx when the user declines", async () => {
    confirmMock.mockResolvedValue(false)

    await expect(installConfigSkill({ interactive: true })).resolves.toBe(false)
    expect(execaMock).not.toHaveBeenCalled()
  })

  it("does not prompt or launch without a TTY", async () => {
    await expect(installConfigSkill({ interactive: false })).resolves.toBe(
      false,
    )
    expect(confirmMock).not.toHaveBeenCalled()
    expect(execaMock).not.toHaveBeenCalled()
  })

  it("targets requested agents when supplied with yes", async () => {
    execaMock.mockResolvedValue({})

    await expect(
      installConfigSkill({ yes: true, agents: ["opencode", "claude-code"] }),
    ).resolves.toBe(true)
    expect(execaMock.mock.calls[0]?.[1]).toEqual([
      "--yes",
      "skills",
      "add",
      "https://github.com/sergiocarracedo/sireno-deck/tree/main/skills/sirenodeck-config",
      "--skill",
      "sirenodeck-config",
      "--global",
      "--agent",
      "opencode",
      "--agent",
      "claude-code",
      "--yes",
    ])
  })

  it("targets all supported agents for an unattended yes install", async () => {
    execaMock.mockResolvedValue({})

    await installConfigSkill({ yes: true })
    expect(execaMock.mock.calls[0]?.[1]).toContain("*")
    expect(execaMock.mock.calls[0]?.[1]).toContain("--yes")
  })

  it("surfaces spawn and nonzero exit failures without throwing", async () => {
    execaMock.mockRejectedValue(new Error("Command failed with exit code 1"))

    await expect(installConfigSkill({ yes: true })).resolves.toBe(false)
    expect(promptLog.error).toHaveBeenCalledWith(
      expect.stringContaining("Command failed with exit code 1"),
    )
  })
})
