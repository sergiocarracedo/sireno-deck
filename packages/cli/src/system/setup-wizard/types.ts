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

/**
 * An OS permission a capability needs on top of its binary. `null` on
 * platforms where the capability needs no grant.
 *
 * ponytail: without this, a denied grant was squeezed into `missing` as a fake
 * command name, so the panel rendered "osascript: Not installed" for a binary
 * that ships with macOS and is very much installed. Installed-ness and
 * permission are two independent facts and the report now carries both.
 */
export interface CapabilityPermission {
  /** Human name of the grant, e.g. "Accessibility". */
  readonly label: string
  readonly granted: boolean
  /** One sentence telling the user how to grant it. */
  readonly hint: string
  /** Deep link we can hand to `open`, when the OS offers one. */
  readonly settingsUrl: string | null
}

export interface CapabilityProbe {
  readonly name: CapabilityName
  /** Binary present AND any required permission granted. */
  readonly available: boolean
  /** Binary present, regardless of permissions. */
  readonly toolInstalled: boolean
  readonly permission: CapabilityPermission | null
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
  // ponytail: the config the caller actually intends to run with. Without it
  // the probe only ever stats $XDG_CONFIG_HOME/sirenodeck/config.yml, so a
  // valid `--config ./my.yml` still reported "Config: missing" and the
  // first-run gate refused to start the daemon.
  readonly configPath?: string
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

/**
 * Deep link that opens System Settings straight at the Accessibility pane, so
 * the user does not have to hunt through Privacy & Security by hand. This URL
 * scheme is the documented way to target a settings pane and has survived the
 * System Preferences → System Settings rename.
 */
export const ACCESSIBILITY_SETTINGS_URL =
  "x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility"
