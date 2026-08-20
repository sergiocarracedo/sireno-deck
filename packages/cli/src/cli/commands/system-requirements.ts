import { execFile } from "node:child_process"
import { existsSync, readFileSync } from "node:fs"
import { promisify } from "node:util"

import type { CommandModule } from "yargs"

import type pino from "pino"

import { formatInstallInstructions, UDEV_RULES } from "@/device/linux-udev"

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
  color,
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
} from "@/cli/prompt"

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
  // ponytail: pad labels to the longest one ("Stream Deck" → 11) plus ":" so
  // every row's value starts at the same column. The icon is green/red
  // depending on whether the row represents a "ready" state.
  const rows: Array<{ label: string; value: string; ok: boolean }> = []
  rows.push({
    label: "Platform",
    value: `${report.platform} · ${SESSION_LABEL[report.session] ?? "unknown"} session`,
    ok: true,
  })
  rows.push({
    label: "Packages",
    value: pmLabel(report.packageManager),
    ok: true,
  })
  if (report.platform === "linux") {
    rows.push({
      label: "udev",
      value: report.udev.rulesInstalled
        ? "installed"
        : `missing at ${report.udev.rulesPath}`,
      ok: report.udev.rulesInstalled,
    })
    rows.push({
      label: "Stream Deck",
      value: report.udev.streamDeckConnected
        ? `connected (${report.udev.matchedProductIds.join(", ")})`
        : "not detected",
      ok: report.udev.streamDeckConnected,
    })
  }
  rows.push({
    label: "Config",
    value: report.config.exists ? "present" : `missing — ${report.config.path}`,
    ok: report.config.exists,
  })

  const labelWidth = Math.max(...rows.map((r) => r.label.length))
  const lines = rows.map((r) => {
    const padded = `${r.label}:`.padEnd(labelWidth + 2)
    const icon = r.ok ? color.green("✓") : color.red("✗")
    return `${icon} ${color.dim(padded)} ${r.value}`
  })
  note(lines.join("\n"), "Detected")
}

const capabilityLine = (cap: {
  name: string
  available: boolean
  preferred: string
  reason: string
}): string => {
  // ponytail: ● for installed (green), ○ for missing (red). Different shapes
  // so the dot is greppable without color. The status text carries the
  // install hint — `cap.reason` was already built for that purpose.
  const mark = cap.available ? color.green("●") : color.red("○")
  const status = cap.available
    ? color.green("Installed")
    : color.red(`Not installed — ${cap.reason}`)
  return `${mark}  ${cap.preferred}: ${status} (used for ${cap.name})`
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
  // entirely — silently. The Capabilities panel already shows "Installed"
  // for this capability, so any spinner or result line here would duplicate
  // the same fact. The user explicitly asked for "only ask about the
  // missing ones" — installed ones are silent.
  const alreadyInstalled = await reProbeCapability(step, deps)
  if (alreadyInstalled) {
    return "installed"
  }

  const s = spinner()
  s.start(`Checking ${step.packages.join(", ")}`)
  s.stop(`${step.packages.join(", ")} not found — install needed`)

  if (!yesBatched) {
    const shouldRun = await confirm({
      message: `Install ${step.title}?`,
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
  // ponytail: write the rules via `sudo sh -c "cat > /path <<'EOF'..."` instead
  // of `sudo -- tee`. `execFile`'s `input` option writes stdin then closes the
  // pipe, so `tee` inherits a closed pipe and reads EOF (writes nothing). The
  // heredoc is embedded in the command string — the child doesn't need stdin.
  // `SIRENO_UDEV_EOF` is unique enough to not collide with UDEV_RULES content.
  const writeCmd = `cat > /etc/udev/rules.d/70-sireno-deck.rules <<'SIRENO_UDEV_EOF'\n${UDEV_RULES}SIRENO_UDEV_EOF`
  const w = await runWithSudo({
    command: "sh",
    args: ["-c", writeCmd],
    ...(password.length > 0 ? { stdinInput: password + "\n" } : {}),
    logger,
    timeoutMs: 30_000,
  })
  if (!w.succeeded) {
    write.stop(`udev write failed: ${formatFailure(w)}`)
    note(formatInstallInstructions(), "You can install udev rules manually:")
    return "failed"
  }
  // ponytail: still verify. A successful `cat` over `sudo` is the highest
  // confidence signal short of running `udevadm test`, but the verify step
  // below catches the rare case where sudo+cwd/permissions landed the file in
  // the wrong place (e.g. EPERM on the parent dir).
  const written = readFileSync("/etc/udev/rules.d/70-sireno-deck.rules", "utf8")
  if (!written.includes("ATTRS{idVendor}")) {
    write.stop("udev write failed: file is empty or incomplete")
    logger.warn(
      { writtenLen: written.length },
      "udev: write succeeded but rules file does not contain expected content",
    )
    note(formatInstallInstructions(), "You can install udev rules manually:")
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
    note(formatInstallInstructions(), "You can install udev rules manually:")
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
      process.stdout.write(`   ${line}\n`)
    }
    process.exitCode = 1
    return
  }

  const missingSteps = buildInstallPlan(report)
  if (missingSteps.length === 0 && !needsConfigSeed(report)) {
    outro("Everything looks good. Run `sirenodeck start` to begin.")
    return
  }

  // ponytail: no leading "  " here — `note()` already pads the content to the
  // title column. Adding more shifts the list right of "Capabilities" and the
  // rows wrap with the wrong indent on long lines.
  const capLines = Object.entries(report.capabilities)
    .map(([, cap]) => capabilityLine(cap))
    .join("\n")
  note(capLines, "Capabilities")

  const results: Record<string, InstallStepResult> = {}
  let anyInstalled = false
  for (const step of missingSteps) {
    const result =
      step.capability === "udev"
        ? await runUdevStep(step, options.yes === true, logger)
        : await runInstallStep(step, options.yes === true, logger, options)
    results[step.id] = result
    if (result === "installed") anyInstalled = true
    // ponytail: the Capabilities panel already shows "Installed" once the
    // install succeeds. Surface only failures/skipped/manual here — the
    // user does not need a duplicate ✓ line per step.
    if (result !== "installed") {
      if (result === "manual" || result === "failed") {
        log.warn(formatResultLine(step, result))
      } else {
        log.info(formatResultLine(step, result))
      }
    }
  }

  // ponytail: re-print the Capabilities panel after installs so the user can
  // see what changed without scrolling up. Skipped when nothing installed —
  // the original panel still reflects reality.
  if (anyInstalled) {
    const freshReport = await probeAll({
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
    const freshCaps = Object.values(freshReport.capabilities)
      .map((cap) => capabilityLine(cap))
      .join("\n")
    note(freshCaps, "Capabilities")
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
