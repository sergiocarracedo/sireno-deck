import type { CommandExecutor } from "./providers/shared"
import {
  ACCESSIBILITY_HINT,
  hasDarwinAccessibility,
} from "./setup-wizard/probe"

export type SystemCapability = "keyMacro" | "clipboard" | "notification"

/**
 * Stand-in used in `missingCommands` when the capability is blocked by an OS
 * permission rather than a missing binary — there is nothing to install.
 */
export const PERMISSION_SENTINEL = "accessibility-permission"

export interface CapabilityRequirement {
  readonly name: SystemCapability
  readonly commands: ReadonlyArray<string>
  readonly reason: string
}

export interface CapabilityStatus {
  readonly available: boolean
  readonly commands: ReadonlyArray<string>
  readonly missingCommands: ReadonlyArray<string>
  readonly reason: string
  readonly preferred: string
}

export type RequirementsCheckResult = Readonly<
  Record<SystemCapability, CapabilityStatus>
>

export interface RequirementsCheckDeps {
  readonly platform: string
  readonly executor: CommandExecutor
  readonly env?: NodeJS.ProcessEnv
  // ponytail: fallback probe for stripped-PATH environments
  // (systemd/launchd/IDE). `which` may return nothing even when the binary
  // exists on disk at a non-default bin dir. The caller wires this with a
  // statSync-based probe over `/usr/local/bin`, `~/.local/bin`, etc.
  readonly extraFsProbe?: (command: string) => boolean
}

const capabilityConfig: Readonly<
  Record<
    SystemCapability,
    {
      readonly commands: ReadonlyArray<string>
      readonly reason: string
      readonly preferred: (platform: string, env: NodeJS.ProcessEnv) => string
    }
  >
> = {
  keyMacro: {
    commands: [
      "ydotool",
      "wtype",
      "xdotool",
      "dotool",
      "osascript",
      "powershell",
    ],
    reason:
      "type:// keystrokes need a key input tool. Install ydotool (works on most compositors via uinput) or wtype (wlroots compositors only). macOS uses osascript; Windows uses PowerShell with Win32 SendInput.",
    preferred: (platform) => {
      if (platform === "darwin") return "osascript"
      if (platform === "win32") return "powershell"
      return "ydotool"
    },
  },
  clipboard: {
    commands: ["wl-copy", "xclip", "xsel", "pbcopy"],
    reason:
      "non-ASCII literal text (emoji, accented letters, CJK) needs a clipboard tool because ydotool's `type` does not handle non-BMP characters. Install the wl-clipboard package (provides wl-copy) on Wayland; xclip / xsel work on X11; macOS ships pbcopy.",
    preferred: (platform, env) => {
      if (platform === "darwin") return "pbcopy"
      return env["WAYLAND_DISPLAY"] === undefined &&
        env["DISPLAY"] !== undefined
        ? "xclip"
        : "wl-copy"
    },
  },
  notification: {
    commands: ["notify-send", "osascript", "powershell"],
    reason:
      "OS-level notifications (toast/notification-center) need a host tool. Linux uses notify-send (libnotify); macOS uses osascript; Windows uses PowerShell with System.Windows.Forms.NotifyIcon.",
    preferred: (platform) => {
      if (platform === "darwin") return "osascript"
      if (platform === "win32") return "powershell"
      return "notify-send"
    },
  },
}

// ponytail: `command` is a POSIX shell builtin, not a binary — execFile can't
// spawn it, so the old `executor.run("command", ["-v", x])` failed for EVERY
// candidate and the probe silently degraded to the `--version` fallback (which
// osascript, pbcopy and clip don't even support). Wrap in `sh -c`, matching
// setup-wizard/probe.ts, and shell-quote so the argument stays one token.
const probeCommandV = async (
  executor: CommandExecutor,
  command: string,
): Promise<boolean> => {
  const quoted = `'${command.replaceAll(`'`, `'\\''`)}'`
  const result = await executor.run("sh", ["-c", `command -v ${quoted}`])
  return result.exitCode === 0 && result.stdout.trim().length > 0
}

const probeVersion = async (
  executor: CommandExecutor,
  command: string,
): Promise<boolean> => {
  try {
    const result = await executor.run(command, ["--version"], {
      timeoutMs: 1_000,
    })
    return result.exitCode === 0
  } catch {
    return false
  }
}

const probeCommand = async (
  executor: CommandExecutor,
  command: string,
  extraFsProbe?: (command: string) => boolean,
): Promise<boolean> => {
  if (await probeCommandV(executor, command)) return true
  if (extraFsProbe?.(command) === true) return true
  return await probeVersion(executor, command)
}

// ponytail: the clipboard candidate list is session-dependent on Linux, so it
// can't just be `config.commands`. The old ternary keyed off `preferred ===
// "xclip"` and sent every other platform down the `["wl-copy"]` branch — so on
// macOS the probe looked for a Wayland tool, never for pbcopy, and every run
// logged "clipboard: none of wl-copy found" on a machine that ships pbcopy.
const clipboardCandidates = (
  platform: string,
  preferred: string,
): ReadonlyArray<string> => {
  if (platform === "darwin") return ["pbcopy"]
  if (platform === "win32") return ["clip"]
  return preferred === "xclip" ? ["xclip", "xsel"] : ["wl-copy"]
}

export const checkRequirements = async ({
  platform,
  executor,
  env = process.env,
  extraFsProbe,
}: RequirementsCheckDeps): Promise<RequirementsCheckResult> => {
  const result: Partial<Record<SystemCapability, CapabilityStatus>> = {}

  for (const [name, config] of Object.entries(capabilityConfig)) {
    const commands =
      name === "clipboard"
        ? clipboardCandidates(platform, config.preferred(platform, env))
        : config.commands
    const availability = await Promise.all(
      commands.map((command) => probeCommand(executor, command, extraFsProbe)),
    )
    const found = commands.filter((_, index) => availability[index])
    const missing = commands.filter((_, index) => !availability[index])
    result[name as SystemCapability] = {
      available: found.length > 0,
      commands: found,
      missingCommands: missing,
      reason: config.reason,
      preferred: config.preferred(platform, env),
    }
  }

  // ponytail: darwin-only. `osascript` ships with macOS, so probing for the
  // binary always succeeds and the daemon started reporting keyMacro as
  // available while every keystroke failed with -1719/1002. The setup wizard
  // already checks the Accessibility grant; without the same check here the
  // runtime never warned at boot, and a tapped macro button showed a generic
  // "action-failed" tile instead of being pre-empted with the real reason.
  // Linux and Windows are untouched — they return before this block.
  if (platform === "darwin") {
    const keyMacro = result.keyMacro
    if (
      keyMacro?.available === true &&
      !(await hasDarwinAccessibility(executor))
    ) {
      result.keyMacro = {
        ...keyMacro,
        available: false,
        missingCommands: [PERMISSION_SENTINEL],
        reason: `osascript is present but has no Accessibility permission — ${ACCESSIBILITY_HINT}`,
      }
    }
  }

  return result as RequirementsCheckResult
}

export const formatCapabilityWarning = (
  name: SystemCapability,
  status: CapabilityStatus,
): string => {
  if (status.available) {
    const missingPreferred =
      status.preferred.length > 0 &&
      !status.commands.includes(status.preferred) &&
      status.missingCommands.length > 0
    if (missingPreferred) {
      return `${name}: using ${status.commands.join(", ")} as fallback; preferred ${status.preferred} is missing — ${status.reason}`
    }
    return ""
  }
  // ponytail: "none of accessibility-permission found" reads like a missing
  // binary. A denied OS permission is not something the user can install, so
  // state it as a permission and let the reason carry the remedy.
  if (status.missingCommands.includes(PERMISSION_SENTINEL)) {
    return `${name}: ${status.reason}`
  }
  return `${name}: none of ${status.missingCommands.join(", ")} found — ${status.reason}`
}

export const getRequiredCapability = (
  action: string,
): SystemCapability | null => {
  if (action.startsWith("type://")) return "keyMacro"
  if (action.startsWith("macro://")) return "keyMacro"
  return null
}
