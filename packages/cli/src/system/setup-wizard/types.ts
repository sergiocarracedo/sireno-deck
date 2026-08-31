import type { CommandExecutor } from "../providers/shared"

export type CapabilityName =
  | "keyMacro"
  | "clipboard"
  | "notification"
  | "activeApp"

export type PackageManager =
  | "apt"
  | "dnf"
  | "pacman"
  | "zypper"
  | "brew"
  | "none"

export type DesktopSession = "wayland" | "x11" | "unknown"

export interface CapabilityProbe {
  readonly name: CapabilityName
  readonly available: boolean
  readonly missing: ReadonlyArray<string>
  readonly preferred: string
  readonly reason: string
}

export interface UdevProbe {
  readonly rulesInstalled: boolean
  readonly rulesPath: string
  readonly streamDeckConnected: boolean
  readonly matchedProductIds: ReadonlyArray<string>
}

export interface ConfigProbe {
  readonly exists: boolean
  readonly path: string
}

export interface SystemReport {
  readonly platform: string
  readonly homeDir: string
  readonly xdgConfigHome: string
  readonly session: DesktopSession
  readonly packageManager: PackageManager
  readonly capabilities: Readonly<Record<CapabilityName, CapabilityProbe>>
  readonly udev: UdevProbe
  readonly config: ConfigProbe
}

export interface InstallStep {
  readonly id: string
  readonly capability: CapabilityName | "udev" | "config"
  readonly title: string
  readonly description: string
  readonly packageManager: PackageManager
  readonly packages: ReadonlyArray<string>
  readonly sudo: boolean
  readonly manualOnly: boolean
  readonly manualInstructions: string
  readonly verifyCommand?: string
}

export type InstallStepResult = "installed" | "skipped" | "failed" | "manual"

export interface WizardOutcome {
  readonly report: SystemReport
  readonly steps: ReadonlyArray<InstallStep>
  readonly results: Readonly<Record<string, InstallStepResult>>
  readonly configSeeded: boolean
  readonly configPath: string
}

export interface ProbeDeps {
  readonly platform: string
  readonly homeDir: string
  readonly xdgConfigHome: string
  readonly env: NodeJS.ProcessEnv
  readonly executor: CommandExecutor
  readonly extraFsProbe?: (command: string) => boolean
  readonly fileExists: (path: string) => boolean
  readonly readFile: (path: string) => string | null
}

export interface SystemReportSummary {
  readonly ok: boolean
  readonly session: DesktopSession
  readonly packageManager: PackageManager
  readonly missingCapabilities: ReadonlyArray<CapabilityName>
  readonly udevMissing: boolean
  readonly configMissing: boolean
  readonly configPath: string
  readonly streamDeckConnected: boolean
  readonly lines: ReadonlyArray<string>
}

export const UDEV_RULES_PATH = "/etc/udev/rules.d/70-sirenodeck.rules"
