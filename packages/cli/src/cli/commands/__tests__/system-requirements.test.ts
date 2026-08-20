import { mkdtempSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest"

const probeAllMock = vi.fn()
const summarizeReportMock = vi.fn()
const buildInstallPlanMock = vi.fn(() => [])
const needsConfigSeedMock = vi.fn(() => false)
const seedDefaultConfigMock = vi.fn(() => ({
  seeded: true,
  targetPath: "/cfg.yml",
  sourcePath: "/src.yml",
}))

vi.mock("@/system/setup-wizard", () => ({
  probeAll: probeAllMock,
  summarizeReport: summarizeReportMock,
  buildInstallPlan: buildInstallPlanMock,
  needsConfigSeed: needsConfigSeedMock,
  seedDefaultConfig: seedDefaultConfigMock,
}))

const logMock = {
  info: vi.fn(),
  success: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}
const spinnerMock = vi.fn(() => ({
  start: vi.fn(),
  stop: vi.fn(),
  message: vi.fn(),
}))
vi.mock("@/cli/prompt", () => ({
  intro: vi.fn(),
  outro: vi.fn(),
  note: vi.fn(),
  log: logMock,
  spinner: spinnerMock,
  select: vi.fn(),
  confirm: vi.fn(),
  text: vi.fn(),
  password: vi.fn(),
  isCancel: (v: unknown) => typeof v === "symbol",
  cancel: vi.fn(),
  tasks: vi.fn(),
}))

const { createLogger } = await import("@/util/logger")
const { systemRequirements, systemRequirementsCommand } =
  await import("../system-requirements")
const { buildCli } = await import("@/cli")

const silentLogger = () => createLogger({ level: "silent" })

interface FakeSummary {
  ok: boolean
  session: "wayland" | "x11" | "unknown"
  packageManager: "apt" | "dnf" | "pacman" | "zypper" | "brew" | "none"
  missingCapabilities: ReadonlyArray<string>
  udevMissing: boolean
  configMissing: boolean
  configPath: string
  streamDeckConnected: boolean
  lines: ReadonlyArray<string>
}

const okSummary = (): FakeSummary => ({
  ok: true,
  session: "x11",
  packageManager: "apt",
  missingCapabilities: [],
  udevMissing: false,
  configMissing: false,
  configPath: "/home/x/.config/sireno-deck/config.yml",
  streamDeckConnected: false,
  lines: [
    "Platform: linux (X11)",
    "Capabilities: all present",
    "Config: present",
  ],
})

const configMissingSummary = (): FakeSummary => ({
  ...okSummary(),
  ok: false,
  configMissing: true,
  lines: [
    "Platform: linux (X11)",
    "Capabilities: all present",
    "Config: missing",
  ],
})

const capabilityMissingSummary = (): FakeSummary => ({
  ...okSummary(),
  ok: false,
  missingCapabilities: ["keyMacro"],
  lines: ["Platform: linux (X11)", "Missing capabilities:", "  - keyMacro"],
})

const setReport = (summary: FakeSummary): void => {
  const capabilities = {
    keyMacro: {
      available: !summary.missingCapabilities.includes("keyMacro"),
      name: "keyMacro" as const,
      missing: summary.missingCapabilities.includes("keyMacro")
        ? ["ydotool"]
        : [],
      preferred: "ydotool",
      reason: "",
    },
    clipboard: {
      available: !summary.missingCapabilities.includes("clipboard"),
      name: "clipboard" as const,
      missing: [],
      preferred: "wl-copy",
      reason: "",
    },
    notification: {
      available: !summary.missingCapabilities.includes("notification"),
      name: "notification" as const,
      missing: [],
      preferred: "notify-send",
      reason: "",
    },
    activeApp: {
      available: !summary.missingCapabilities.includes("activeApp"),
      name: "activeApp" as const,
      missing: [],
      preferred: "xdotool",
      reason: "",
    },
  }
  const report = {
    platform: "linux",
    homeDir: "/home/test",
    xdgConfigHome: "/home/test/.config",
    session: summary.session,
    packageManager: summary.packageManager,
    capabilities,
    udev: {
      rulesInstalled: !summary.udevMissing,
      rulesPath: "/etc/udev/rules.d/70-sireno-deck.rules",
      streamDeckConnected: summary.streamDeckConnected,
      matchedProductIds: [],
    },
    config: {
      exists: !summary.configMissing,
      path: summary.configPath,
    },
  }
  probeAllMock.mockResolvedValue(report as never)
  summarizeReportMock.mockReturnValue(summary)
}

describe("system-requirements yargs registration", () => {
  it("is registered in buildCli() with the strict-mode-safe flags", async () => {
    const cli = await buildCli()
    const cmd = cli.commands.find(
      (c) => c.command === "system-requirements",
    ) as { command: string; describe: string; builder?: unknown } | undefined
    expect(cmd).toBeDefined()
    expect(cmd?.describe).toContain("Detect system capabilities")
    expect(typeof systemRequirementsCommand.command).toBe("string")
  })
})

describe("systemRequirements", () => {
  let savedExitCode: number | undefined
  let savedIsTTY: boolean | undefined
  let savedHome: string | undefined
  let savedXdg: string | undefined

  beforeAll(() => {
    const dir = mkdtempSync(join(tmpdir(), "sysreq-test-"))
    process.env["SYSREQ_TEST_HOME"] = dir
    writeFileSync(join(dir, "ok.yml"), "decks: {}\n")
  })

  beforeEach(() => {
    vi.clearAllMocks()
    savedExitCode = process.exitCode
    savedIsTTY = process.stdin.isTTY
    savedHome = process.env["HOME"]
    savedXdg = process.env["XDG_CONFIG_HOME"]
    process.env["HOME"] = "/home/test"
    process.env["XDG_CONFIG_HOME"] = "/home/test/.config"
    process.exitCode = 0
    Object.defineProperty(process.stdin, "isTTY", {
      value: false,
      configurable: true,
      writable: true,
    })
  })

  afterEach(() => {
    process.exitCode = savedExitCode
    if (savedHome === undefined) delete process.env["HOME"]
    else process.env["HOME"] = savedHome
    if (savedXdg === undefined) delete process.env["XDG_CONFIG_HOME"]
    else process.env["XDG_CONFIG_HOME"] = savedXdg
    Object.defineProperty(process.stdin, "isTTY", {
      value: savedIsTTY,
      configurable: true,
      writable: true,
    })
  })

  it("exits 0 in non-interactive mode when everything is present", async () => {
    setReport(okSummary())
    await systemRequirements({
      logger: silentLogger(),
      nonInteractive: true,
    })
    expect(process.exitCode).toBe(0)
    expect(buildInstallPlanMock).not.toHaveBeenCalled()
  })

  it("exits 1 in non-interactive mode when config is missing", async () => {
    setReport(configMissingSummary())
    await systemRequirements({
      logger: silentLogger(),
      nonInteractive: true,
    })
    expect(process.exitCode).toBe(1)
  })

  it("exits 1 in non-interactive mode when a capability is missing", async () => {
    setReport(capabilityMissingSummary())
    await systemRequirements({
      logger: silentLogger(),
      nonInteractive: true,
    })
    expect(process.exitCode).toBe(1)
  })

  it("treats lack of TTY as non-interactive even without the flag", async () => {
    setReport(capabilityMissingSummary())
    Object.defineProperty(process.stdin, "isTTY", {
      value: false,
      configurable: true,
      writable: true,
    })
    await systemRequirements({ logger: silentLogger() })
    expect(process.exitCode).toBe(1)
  })

  it("with --yes and non-tty, runs the summary path and exits 1 when missing", async () => {
    setReport(configMissingSummary())
    await systemRequirements({
      logger: silentLogger(),
      yes: true,
      nonInteractive: true,
    })
    expect(process.exitCode).toBe(1)
  })
})
