import { execFile } from "node:child_process"
import { existsSync, readFileSync } from "node:fs"
import { promisify } from "node:util"

import { confirm } from "@inquirer/prompts"
import type { CommandModule } from "yargs"

import type pino from "pino"

import {
  type InstallStep,
  type InstallStepResult,
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

const execFileAsync = promisify(execFile)

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

const HEADING = (s: string): string => `\n${s}`
const LABEL = (s: string): string => `  ${s}`

const printReportLines = (report: SystemReport): void => {
  const summary = summarizeReport(report)
  for (const line of summary.lines) {
    process.stdout.write(`${line}\n`)
  }
}

const runInstallStep = async (
  step: InstallStep,
  yesBatched: boolean,
  logger: pino.Logger,
): Promise<InstallStepResult> => {
  if (step.manualOnly) return "manual"
  if (step.packages.length === 0 || step.packageManager === "none") {
    return "manual"
  }
  if (!yesBatched) {
    const shouldRun = await confirm({
      message: `Run: ${formatStepInstructions(step)}?`,
      default: !step.sudo,
    })
    if (!shouldRun) return "skipped"
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

  if (!step.sudo) {
    const result = await execFileAsync(command, [...args], {
      timeout: 120_000,
    })
    if (result === undefined) return "failed"
    return "installed"
  }

  const nopasswd = await isSudoNopasswd()
  let password = ""
  if (!nopasswd) {
    if (!process.stdin.isTTY) {
      logger.warn(
        { step: step.id },
        "sudo requires a password but no TTY; skipping",
      )
      return "skipped"
    }
    try {
      password = await capturePassword("[sudo] password: ")
    } catch (err) {
      logger.warn({ err, step: step.id }, "password prompt cancelled")
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
  if (result.succeeded) return "installed"
  if (result.neededPassword) {
    logger.warn(
      { step: step.id, stderr: result.stderr.slice(0, 200) },
      "sudo rejected password",
    )
  }
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
      default: false,
    })
    if (!shouldRun) return "skipped"
  }
  const nopasswd = await isSudoNopasswd()
  let password = ""
  if (!nopasswd) {
    if (!process.stdin.isTTY) {
      logger.warn("sudo requires a password but no TTY; skipping udev")
      return "skipped"
    }
    try {
      password = await capturePassword("[sudo] password: ")
    } catch {
      return "skipped"
    }
  }
  const write = await runWithSudo({
    command: "tee",
    args: ["/etc/udev/rules.d/70-sireno-deck.rules"],
    ...(password.length > 0 ? { stdinInput: password + "\n" } : {}),
    logger,
    timeoutMs: 30_000,
  })
  if (!write.succeeded) return "failed"
  const reload = await runWithSudo({
    command: "sh",
    args: ["-c", "udevadm control --reload-rules && udevadm trigger"],
    ...(password.length > 0 ? { stdinInput: password + "\n" } : {}),
    logger,
    timeoutMs: 30_000,
  })
  if (!reload.succeeded) return "failed"
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
    default: true,
  })
  if (!shouldSeed) return false
  try {
    const result = seedDefaultConfig(report.config.path)
    logger.info({ path: result.targetPath }, "config seeded")
    return true
  } catch (err) {
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

  const summary = summarizeReport(report)
  printReportLines(report)

  if (nonInteractive) {
    if (summary.ok) {
      logger.info("system-requirements: all present")
      return
    }
    logger.warn("system-requirements: missing pieces (non-interactive)")
    process.exitCode = 1
    return
  }

  const missingSteps = buildInstallPlan(report)
  if (missingSteps.length === 0 && !needsConfigSeed(report)) {
    logger.info("system-requirements: nothing to install")
    return
  }

  process.stdout.write(HEADING("Install steps:"))
  for (const step of missingSteps) {
    process.stdout.write(LABEL(`[${step.id}] ${step.title}`))
    if (step.manualOnly) {
      process.stdout.write(
        LABEL(`  manual: ${step.manualInstructions.slice(0, 80)}...`),
      )
    } else if (step.packages.length > 0) {
      const verb =
        step.packageManager === "brew"
          ? "brew install"
          : `sudo ${step.packageManager} install -y`
      process.stdout.write(LABEL(`  ${verb} ${step.packages.join(" ")}`))
    }
  }
  if (needsConfigSeed(report)) {
    process.stdout.write(LABEL(`[config] seed ${report.config.path}`))
  }

  const results: Record<string, InstallStepResult> = {}
  for (const step of missingSteps) {
    process.stdout.write(HEADING(`Step: ${step.title}`))
    const result =
      step.capability === "udev"
        ? await runUdevStep(step, options.yes === true, logger)
        : await runInstallStep(step, options.yes === true, logger)
    results[step.id] = result
    process.stdout.write(LABEL(formatResultLine(step, result)))
  }

  if (needsConfigSeed(report)) {
    const seeded = await runConfigSeed(report, options, logger)
    if (seeded) {
      process.stdout.write(LABEL("✓ default config seeded"))
    }
  }

  const anyFailed = Object.values(results).some((r) => r === "failed")
  const anyManual = Object.values(results).some((r) => r === "manual")
  if (anyFailed || anyManual) {
    process.stdout.write(HEADING("Manual steps remaining:"))
    for (const step of missingSteps) {
      if (results[step.id] === "manual" || results[step.id] === "failed") {
        process.stdout.write(LABEL(`[${step.id}] ${step.title}`))
        process.stdout.write(LABEL(formatStepInstructions(step)))
      }
    }
    process.exitCode = 1
  }
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
