import type {
  InstallStep,
  InstallStepResult,
  SystemReport,
  SystemReportSummary,
} from "./types"

const SESSION_LABEL: Readonly<Record<string, string>> = {
  wayland: "Wayland",
  x11: "X11",
  unknown: "unknown",
}

export const summarizeReport = (report: SystemReport): SystemReportSummary => {
  const missingCapabilities: Array<
    "keyMacro" | "clipboard" | "notification" | "activeApp"
  > = []
  for (const [name, cap] of Object.entries(report.capabilities)) {
    if (!cap.available) {
      missingCapabilities.push(
        name as "keyMacro" | "clipboard" | "notification" | "activeApp",
      )
    }
  }

  const lines: string[] = []
  const ok =
    missingCapabilities.length === 0 &&
    report.udev.rulesInstalled &&
    report.config.exists

  lines.push(
    `Platform: ${report.platform} (${SESSION_LABEL[report.session] ?? "unknown"} session)`,
  )
  lines.push(`Package manager: ${report.packageManager}`)
  lines.push(`Config target: ${report.config.path}`)

  if (missingCapabilities.length === 0) {
    lines.push("Capabilities: all present")
  } else {
    lines.push("Missing capabilities:")
    for (const name of missingCapabilities) {
      const cap = report.capabilities[name]
      lines.push(`  - ${name}: preferred ${cap.preferred} — ${cap.reason}`)
    }
  }

  if (report.platform === "linux") {
    lines.push(
      report.udev.rulesInstalled
        ? "udev rules: installed at " + report.udev.rulesPath
        : "udev rules: missing at " + report.udev.rulesPath,
    )
    lines.push(
      report.udev.streamDeckConnected
        ? "Stream Deck: connected (" +
            report.udev.matchedProductIds.join(", ") +
            ")"
        : "Stream Deck: not detected",
    )
  }

  lines.push(
    report.config.exists
      ? "Config: present"
      : "Config: missing (run `sirenodeck system-requirements` to seed)",
  )

  return {
    ok,
    session: report.session,
    packageManager: report.packageManager,
    missingCapabilities,
    udevMissing: !report.udev.rulesInstalled,
    configMissing: !report.config.exists,
    configPath: report.config.path,
    streamDeckConnected: report.udev.streamDeckConnected,
    lines,
  }
}

export const formatStepInstructions = (step: InstallStep): string => {
  if (step.manualInstructions.length > 0) return step.manualInstructions
  if (step.packageManager === "none") {
    return `No package manager detected. Install manually: ${step.packages.join(", ")}.`
  }
  const verb =
    step.packageManager === "brew"
      ? "brew install"
      : `sudo ${step.packageManager} install -y`
  return `${verb} ${step.packages.join(" ")}`
}

export const formatSummaryLine = (line: string): string => line

export const formatResultLine = (
  step: InstallStep,
  result: InstallStepResult,
): string => {
  switch (result) {
    case "installed":
      return `✓ ${step.title}`
    case "skipped":
      return `· ${step.title} (skipped)`
    case "failed":
      return `✗ ${step.title} (failed — see ${step.manualInstructions.length > 0 ? "instructions below" : "logs"})`
    case "manual":
      return `→ ${step.title} (manual — ${step.manualInstructions.slice(0, 60)}…)`
  }
}
