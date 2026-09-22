import type {
  CapabilityName,
  CapabilityProbe,
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

// ponytail: ANSI helpers, no dep. `colorette` would pull in transitive types
// for a single use site — terminal escape sequences are stable. Returns the
// input untouched when stdout is not a TTY so piped output stays clean.
const useColor = (): boolean =>
  Boolean(process.stdout.isTTY) && process.env["NO_COLOR"] === undefined

const ESC = "\u001b["
export const color = {
  green: (s: string): string => (useColor() ? `${ESC}32m${s}${ESC}0m` : s),
  red: (s: string): string => (useColor() ? `${ESC}31m${s}${ESC}0m` : s),
  yellow: (s: string): string => (useColor() ? `${ESC}33m${s}${ESC}0m` : s),
  dim: (s: string): string => (useColor() ? `${ESC}2m${s}${ESC}0m` : s),
}

export const stripAnsi = (s: string): string =>
  s.replace(/\u001b\[[0-9;]*m/g, "")

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
    // ponytail: same two problems the interactive panel had — internal keys
    // ("keyMacro") instead of names a user recognises, and the full remedy
    // repeated once per capability that happens to need the same grant. Lead
    // with the capability and print each distinct remedy once.
    lines.push("Missing capabilities:")
    const remedies: string[] = []
    for (const name of missingCapabilities) {
      const cap = report.capabilities[name]
      const label = CAPABILITY_LABEL[name]
      const permission = cap.permission
      const blocked =
        cap.toolInstalled && permission !== null && !permission.granted
      const state = blocked
        ? `${cap.preferred} installed, ${permission.label} permission not granted`
        : `${cap.preferred} not installed`
      const remedy = blocked
        ? `${permission.label}: ${permission.hint}`
        : cap.reason
      if (!remedies.includes(remedy)) remedies.push(remedy)
      lines.push(`  - ${label}: ${state} [${remedies.indexOf(remedy) + 1}]`)
    }
    remedies.forEach((remedy, index) => {
      lines.push(`  [${index + 1}] ${remedy}`)
    })
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

// ponytail: the panel used to lead with the tool name, so macOS printed
// "osascript" three times — once per capability that happens to be driven by
// AppleScript — and repeated the same 200-character Accessibility hint twice.
// The capability is what the user cares about and the tool is an
// implementation detail, so capability now leads and the long hints collapse
// into numbered footnotes shared by every row that needs them.
const CAPABILITY_LABEL: Readonly<Record<CapabilityName, string>> = {
  keyMacro: "Key macros",
  clipboard: "Clipboard",
  notification: "Notifications",
  activeApp: "Active app",
}

const CAPABILITY_ORDER: ReadonlyArray<CapabilityName> = [
  "keyMacro",
  "clipboard",
  "notification",
  "activeApp",
]

const FOOTNOTE_WIDTH = 64

const wrapText = (text: string, width: number): string[] => {
  const words = text.split(/\s+/).filter((w) => w.length > 0)
  const lines: string[] = []
  let current = ""
  for (const word of words) {
    if (current.length === 0) {
      current = word
    } else if (current.length + 1 + word.length <= width) {
      current = `${current} ${word}`
    } else {
      lines.push(current)
      current = word
    }
  }
  if (current.length > 0) lines.push(current)
  return lines.length > 0 ? lines : [""]
}

interface CapabilityRow {
  readonly mark: string
  readonly label: string
  readonly tool: string
  readonly status: string
  readonly note: number | null
}

/**
 * Splits a capability into the two independent facts the old renderer
 * conflated: whether the tool is installed, and whether it has the permission
 * it needs. A denied grant is not "Not installed".
 */
const describeCapability = (
  cap: CapabilityProbe,
): { status: string; detail: string | null } => {
  if (!cap.toolInstalled) {
    return { status: color.red("not installed"), detail: cap.reason }
  }
  const permission = cap.permission
  if (permission === null) {
    return { status: color.green("installed"), detail: null }
  }
  if (permission.granted) {
    return {
      status: `${color.green("installed")}${color.dim(" · ")}${color.green(`${permission.label} granted`)}`,
      detail: null,
    }
  }
  return {
    status: `${color.green("installed")}${color.dim(" · ")}${color.red(`${permission.label} not granted`)}`,
    detail: `${permission.label} permission — ${permission.hint}.`,
  }
}

export const formatCapabilityPanel = (
  capabilities: Readonly<Record<CapabilityName, CapabilityProbe>>,
): string => {
  const footnotes: string[] = []
  const footnoteFor = (detail: string): number => {
    const existing = footnotes.indexOf(detail)
    if (existing !== -1) return existing + 1
    footnotes.push(detail)
    return footnotes.length
  }

  const rows: CapabilityRow[] = []
  for (const name of CAPABILITY_ORDER) {
    const cap = capabilities[name]
    if (cap === undefined) continue
    const { status, detail } = describeCapability(cap)
    rows.push({
      mark: cap.available ? color.green("●") : color.red("○"),
      label: CAPABILITY_LABEL[name],
      tool: cap.preferred,
      status,
      note: detail === null ? null : footnoteFor(detail),
    })
  }

  const labelWidth = Math.max(...rows.map((r) => r.label.length))
  const toolWidth = Math.max(...rows.map((r) => r.tool.length))

  const lines = rows.map((r) => {
    const label = `${r.label}:`.padEnd(labelWidth + 2)
    const tool = color.dim(r.tool.padEnd(toolWidth))
    const marker = r.note === null ? "" : color.dim(` [${r.note}]`)
    return `${r.mark} ${label} ${tool}  ${r.status}${marker}`
  })

  if (footnotes.length > 0) {
    lines.push("")
    footnotes.forEach((detail, index) => {
      const wrapped = wrapText(detail, FOOTNOTE_WIDTH)
      wrapped.forEach((line, lineIndex) => {
        lines.push(
          lineIndex === 0
            ? `${color.dim(`[${index + 1}]`)} ${line}`
            : `    ${line}`,
        )
      })
    })
  }

  return lines.join("\n")
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
      return `${color.green("✓")} ${step.title}`
    case "skipped":
      return `${color.dim("·")} ${step.title} ${color.dim("(skipped)")}`
    case "failed":
      return `${color.red("✗")} ${step.title} ${color.red(`(failed — see ${step.manualInstructions.length > 0 ? "instructions below" : "logs"})`)}`
    case "manual":
      return `${color.dim("→")} ${step.title} ${color.dim(`(manual — ${step.manualInstructions.slice(0, 60)}…)`)}`
  }
}
