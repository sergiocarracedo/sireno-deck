import { execFile } from "node:child_process"
import { existsSync, readFileSync } from "node:fs"
import { promisify } from "node:util"

import type { CommandModule } from "yargs"

import type pino from "pino"

import { UDEV_RULES } from "@/device/linux-udev"

import {
  type InstallStep,
  type InstallStepResult,
  type SudoRunResult,
  type SystemReport,
  buildInstallPlan,
  capturePassword,
  isSudoNopasswd,
  needsConfigSeed,
  probeAll,
  runWithSudo,
  seedDefaultConfig,
  summarizeReport,
} from "@/system/setup-wizard"
import {
  formatResultLine,
  formatStepInstructions,
} from "@/system/setup-wizard/format"
import {
  cancel,
  confirm,
  intro,
  isCancel,
  log,
  note,
  outro,
  spinner,
} from "@/ui/console"

const execFileAsync = promisify(execFile)

// ponytail: failed sudo runs return stderr in the result. The spinners
// used to swallow it ("udev write failed" with no hint why). Surface the
// last line of stderr so the user sees the real reason
// (Permission denied, command not found, "udevadm: not found", etc.).
const formatFailure = (result: SudoRunResult): string => {
  const tail = (s: string): string => {
    const line = s
      .split("\n")
      .map((l) => l.trimEnd())
      .filter((l) => l.length > 0)
      .at(-1)
    return line ?? ""
  }
  const pieces = [
    `exit ${result.exitCode}`,
    result.neededPassword ? "sudo rejected password" : null,
    tail(result.stderr) || null,
    tail(result.stdout) || null,
  ].filter((p): p is string => p !== null && p.length > 0)
  return pieces.join(" — ")
}

const realExecutor = {
  async run(command: string, args: ReadonlyArray<string>) {
    try {
      const result = await execFileAsync(command, [...args], {
        timeout: 5_000,
        stdio: ["ignore", "pipe", "pipe"],
      })
      return {
        exitCode: 0,
        stdout: result.stdout ?? "",
        stderr: result.stderr ?? "",
      }
    } catch (err) {
      const e = err as {
        code?: number | string
        stdout?: string
        stderr?: string
      }
      return {
        exitCode: typeof e.code === "number" ? e.code : 1,
        stdout: e.stdout ?? "",
        stderr: e.stderr ?? "",
      }
    }
  },
}

const resolveXdgConfigHome = (options: SystemRequirementsOptions): string => {
  const home = options.homeDir ?? process.env["HOME"] ?? ""
  return (
    options.xdgConfigHome ?? process.env["XDG_CONFIG_HOME"] ?? `${home}/.config`
  )
}

const resolveHome = (options: SystemRequirementsOptions): string =>
  options.homeDir ?? process.env["HOME"] ?? ""

export interface SystemRequirementsOptions {
  readonly yes?: boolean
  readonly nonInteractive?: boolean
  readonly homeDir?: string
  readonly xdgConfigHome?: string
  readonly logger: pino.Logger
}

const SESSION_LABEL: Readonly<Record<string, string>> = {
  wayland: "Wayland",
  x11: "X11",
  unknown: "unknown",
}

const pmLabel = (pm: string): string => {
  switch (pm) {
    case "apt":
      return "apt"
    case "dnf":
      return "dnf"
    case "pacman":
      return "pacman (Arch)"
    case "zypper":
      return "zypper (openSUSE)"
    case "brew":
      return "Homebrew"
    case "none":
      return "none detected"
    default:
      return pm
  }
}

const printProbeSummary = (report: SystemReport): void => {
  const lines: string[] = []
  lines.push(
    `Platform  ${report.platform} · ${SESSION_LABEL[report.session] ?? "unknown"} session`,
  )
  lines.push(`Packages  ${pmLabel(report.packageManager)}`)
  if (report.platform === "linux") {
    lines.push(
      `udev      ${report.udev.rulesInstalled ? "installed" : "missing at " + report.udev.rulesPath}`,
    )
    lines.push(
      `Stream Deck  ${report.udev.streamDeckConnected ? `connected (${report.udev.matchedProductIds.join(", ")})` : "not detected"}`,
    )
  }
  lines.push(
    `Config    ${report.config.exists ? "present" : "missing — " + report.config.path}`,
  )
  note(lines.join("\n"), "Detected")
}

const capabilityLine = (cap: {
  available: boolean
  preferred: string
  reason: string
}): string => {
  const mark = cap.available ? "●" : "○"
  return `${mark}  ${cap.preferred}  ${cap.reason}`
}

const reProbeCapability = async (
  step: InstallStep,
  deps: SystemRequirementsOptions,
): Promise<boolean> => {
  if (step.capability === "udev" || step.capability === "config") {
    return false
  }
  const home = resolveHome(deps)
  const xdg = resolveXdgConfigHome(deps)
  const fresh = await probeAll({
    platform: process.platform,
    homeDir: home,
    xdgConfigHome: xdg,
    env: process.env,
    executor: realExecutor,
    fileExists: (p) => existsSync(p),
    readFile: (p) => {
      try {
        return readFileSync(p, "utf8")
      } catch {
        return null
      }
    },
  })
  return fresh.capabilities[step.capability].available
}

const runInstallStep = async (
  step: InstallStep,
  yesBatched: boolean,
  logger: pino.Logger,
  deps: SystemRequirementsOptions,
): Promise<InstallStepResult> => {
  if (step.manualOnly) return "manual"
  if (step.packages.length === 0 || step.packageManager === "none") {
    return "manual"
  }

  // ponytail: re-probe before shell-out. If the binary is already on PATH
  // (e.g. user installed manually between runs), skip the install step
  // entirely. The user explicitly asked for this — false-positive installs
  // when the tool is already present are the bug.
  const s = spinner()
  s.start(`Checking ${step.packages.join(", ")}`)
  const alreadyInstalled = await reProbeCapability(step, deps)
  if (alreadyInstalled) {
    s.stop(`${step.packages.join(", ")} already installed`)
    return "installed"
  }
  s.stop(`${step.packages.join(", ")} not found — install needed`)

  if (!yesBatched) {
    const shouldRun = await confirm({
      message: `Run: ${formatStepInstructions(step)}?`,
      initialValue: !step.sudo,
    })
    if (isCancel(shouldRun) || !shouldRun) return "skipped"
  }

  let command: string
  let args: ReadonlyArray<string>
  switch (step.packageManager) {
    case "apt":
      command = "apt-get"
      args = ["install", "-y", ...step.packages]
      break
    case "dnf":
      command = "dnf"
      args = ["install", "-y", ...step.packages]
      break
    case "pacman":
      command = "pacman"
      args = ["-S", "--noconfirm", ...step.packages]
      break
    case "zypper":
      command = "zypper"
      args = ["install", "-y", ...step.packages]
      break
    case "brew":
      command = "brew"
      args = ["install", ...step.packages]
      break
    default:
      return "manual"
  }

  const install = spinner()
  install.start(`Installing ${step.packages.join(", ")}`)

  if (!step.sudo) {
    try {
      await execFileAsync(command, [...args], { timeout: 120_000 })
      install.stop(`${step.packages.join(", ")} installed`)
      return "installed"
    } catch (err) {
      install.stop(`Install failed: ${(err as Error).message ?? "unknown"}`)
      logger.warn({ err, step: step.id }, "non-sudo install failed")
      return "failed"
    }
  }

  const nopasswd = await isSudoNopasswd()
  let password = ""
  if (!nopasswd) {
    if (!process.stdin.isTTY) {
      install.stop("sudo password required but no TTY — skipping")
      return "skipped"
    }
    try {
      password = await capturePassword("[sudo] password: ")
    } catch {
      install.stop("password prompt cancelled")
      return "skipped"
    }
  }
  const result = await runWithSudo({
    command,
    args,
    ...(password.length > 0 ? { stdinInput: password + "\n" } : {}),
    timeoutMs: 120_000,
    logger,
  })
  if (result.succeeded) {
    install.stop(`${step.packages.join(", ")} installed`)
    return "installed"
  }
  install.stop(`Install failed: ${formatFailure(result)}`)
  return "failed"
}

const runUdevStep = async (
  step: InstallStep,
  yesBatched: boolean,
  logger: pino.Logger,
): Promise<InstallStepResult> => {
  if (!yesBatched) {
    const shouldRun = await confirm({
      message: `Install udev rules to ${process.platform === "linux" ? "/etc/udev/rules.d/70-sireno-deck.rules" : "system location"}?`,
      initialValue: false,
    })
    if (isCancel(shouldRun) || !shouldRun) return "skipped"
  }
  const nopasswd = await isSudoNopasswd()
  let password = ""
  if (!nopasswd) {
    if (!process.stdin.isTTY) {
      log.warn("sudo requires a password but no TTY — skipping udev")
      return "skipped"
    }
    try {
      password = await capturePassword("[sudo] password: ")
    } catch {
      return "skipped"
    }
  }
  const write = spinner()
  write.start("Installing udev rules")
  // ponytail: `sudo -S` reads the password + newline, then forwards the rest
  // of stdin to the child (`tee`). The pipe MUST include the udev rules —
  // otherwise tee writes the password to the rules file and nothing else.
  // Use the canonical `UDEV_RULES` constant rather than reverse-parsing the
  // display-formatted `manualInstructions` string.
  const writeStdin =
    password.length > 0 ? `${password}\n${UDEV_RULES}\n` : `${UDEV_RULES}\n`
  const w = await runWithSudo({
    command: "tee",
    args: ["/etc/udev/rules.d/70-sireno-deck.rules"],
    stdinInput: writeStdin,
    logger,
    timeoutMs: 30_000,
  })
  if (!w.succeeded) {
    write.stop(`udev write failed: ${formatFailure(w)}`)
    return "failed"
  }
  // ponytail: verify the file actually got the rules. sudo + tee can
  // return exit 0 while writing nothing (e.g. if the password was
  // followed only by EOF without the rules content — happens on shells
  // that strip trailing data after sudo's read).
  const written = readFileSync("/etc/udev/rules.d/70-sireno-deck.rules", "utf8")
  if (!written.includes("ATTRS{idVendor}")) {
    write.stop("udev write failed: tee exited 0 but file is empty or incomplete")
    logger.warn(
      { writtenLen: written.length },
      "udev: tee succeeded but rules file does not contain expected content",
    )
    return "failed"
  }
  const reload = spinner()
  reload.start("Reloading udev rules")
  const reloadResult = await runWithSudo({
    command: "sh",
    args: ["-c", "udevadm control --reload-rules && udevadm trigger"],
    ...(password.length > 0 ? { stdinInput: password + "\n" } : {}),
    logger,
    timeoutMs: 30_000,
  })
  if (!reloadResult.succeeded) {
    reload.stop(`udev reload failed: ${formatFailure(reloadResult)}`)
    return "failed"
  }
  reload.stop("udev rules installed")
  return "installed"
}

const runConfigSeed = async (
  report: SystemReport,
  options: SystemRequirementsOptions,
  logger: pino.Logger,
): Promise<boolean> => {
  if (report.config.exists) return false
  if (options.nonInteractive) {
    logger.warn(
      { path: report.config.path },
      "config missing and non-interactive mode — skipping seed",
    )
    return false
  }
  const shouldSeed = await confirm({
    message: `Seed default config to ${report.config.path}?`,
    initialValue: true,
  })
  if (isCancel(shouldSeed) || !shouldSeed) return false
  const s = spinner()
  s.start(`Seeding ${report.config.path}`)
  try {
    const result = seedDefaultConfig(report.config.path)
    s.stop(`Seeded default config to ${result.targetPath}`)
    logger.info({ path: result.targetPath }, "config seeded")
    return true
  } catch (err) {
    s.stop(`Seed failed: ${(err as Error).message ?? "unknown"}`)
    logger.warn({ err, path: report.config.path }, "config seed failed")
    return false
  }
}

export const systemRequirements = async (
  options: SystemRequirementsOptions,
): Promise<void> => {
  const { logger } = options
  const tty = process.stdin.isTTY
  const nonInteractive = options.nonInteractive || options.yes || !tty

  const homeDir = resolveHome(options)
  const xdgConfigHome = resolveXdgConfigHome(options)
  const platform = process.platform

  const probe = spinner()
  probe.start("Probing system")

  const report = await probeAll({
    platform,
    homeDir,
    xdgConfigHome,
    env: process.env,
    executor: realExecutor,
    fileExists: (p) => existsSync(p),
    readFile: (p) => {
      try {
        return readFileSync(p, "utf8")
      } catch {
        return null
      }
    },
  })

  probe.stop("Probe complete")
  intro("sireno-deck — system requirements")
  printProbeSummary(report)

  const summary = summarizeReport(report)
  if (nonInteractive) {
    if (summary.ok) {
      log.success("All requirements present.")
      return
    }
    log.warn("Missing pieces detected (non-interactive mode — exiting).")
    log.warn(`Run \`sirenodeck system-requirements\` interactively to fix.`)
    for (const line of summary.lines) {
      process.stdout.write(`  ${line}\n`)
    }
    process.exitCode = 1
    return
  }

  const missingSteps = buildInstallPlan(report)
  if (missingSteps.length === 0 && !needsConfigSeed(report)) {
    outro("Everything looks good. Run `sirenodeck start` to begin.")
    return
  }

  const capLines = Object.entries(report.capabilities)
    .map(([name, cap]) => `  ${capabilityLine(cap)}  (${name})`)
    .join("\n")
  note(capLines, "Capabilities")

  const results: Record<string, InstallStepResult> = {}
  for (const step of missingSteps) {
    const result =
      step.capability === "udev"
        ? await runUdevStep(step, options.yes === true, logger)
        : await runInstallStep(step, options.yes === true, logger, options)
    results[step.id] = result
    if (result === "manual" || result === "failed") {
      log.warn(formatResultLine(step, result))
    } else {
      log.info(formatResultLine(step, result))
    }
  }

  if (needsConfigSeed(report)) {
    await runConfigSeed(report, options, logger)
  }

  const anyFailed = Object.values(results).some((r) => r === "failed")
  const anyManual = Object.values(results).some((r) => r === "manual")
  if (anyFailed || anyManual) {
    const lines: string[] = []
    for (const step of missingSteps) {
      if (results[step.id] === "manual" || results[step.id] === "failed") {
        lines.push(`[${step.id}] ${step.title}`)
        lines.push(`  ${formatStepInstructions(step)}`)
      }
    }
    if (lines.length > 0) note(lines.join("\n"), "Manual steps remaining")
    cancel(
      "Setup incomplete. Run `sirenodeck system-requirements` again after manual steps.",
    )
    process.exitCode = 1
    return
  }

  outro("Setup complete. Run `sirenodeck start` to begin.")
}

interface SystemRequirementsArgs {
  yes?: boolean
  nonInteractive?: boolean
  config?: string
  homeDir?: string
  xdgConfigHome?: string
}

export const systemRequirementsCommand: CommandModule<
  object,
  SystemRequirementsArgs
> = {
  command: "system-requirements",
  describe:
    "Detect system capabilities (key macro, clipboard, notification, active-app) and optionally install missing pieces",
  builder: (yargs) =>
    yargs
      .option("yes", {
        alias: "y",
        type: "boolean",
        default: false,
        description: "Accept all install prompts without confirmation",
      })
      .option("non-interactive", {
        type: "boolean",
        default: false,
        description:
          "Print a summary and exit non-zero if anything is missing (no prompts)",
      }),
  handler: async (argv) => {
    const { createLogger } = await import("@/util/logger")
    const logger = createLogger({ verbose: false })
    const options: SystemRequirementsOptions = {
      logger,
      ...(argv.yes === true ? { yes: true } : {}),
      ...(argv.nonInteractive === true ? { nonInteractive: true } : {}),
    }
    try {
      await systemRequirements(options)
    } catch (err) {
      const e = err as { message?: string }
      logger.error(
        { err },
        e && typeof e.message === "string"
          ? e.message
          : "system-requirements failed",
      )
      process.exitCode = 1
    }
  },
}

export default systemRequirements
