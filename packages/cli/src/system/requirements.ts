import type { CommandExecutor } from "./providers/shared"

export type SystemCapability = "keyMacro" | "clipboard" | "notification"

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
  readonly env?: Readonly<Record<string, string>>
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
      const waylandDisplay = env["WAYLAND_DISPLAY"]
      if (
        waylandDisplay !== undefined &&
        waylandDisplay.length > 0 &&
        waylandDisplay !== "0"
      ) {
        return "wl-copy"
      }
      return "xclip"
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

const probeCommandV = async (
  executor: CommandExecutor,
  command: string,
): Promise<boolean> => {
  const result = await executor.run("command", ["-v", command])
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

export const checkRequirements = async ({
  platform,
  executor,
  env = process.env,
  extraFsProbe,
}: RequirementsCheckDeps): Promise<RequirementsCheckResult> => {
  const result: Partial<Record<SystemCapability, CapabilityStatus>> = {}
  const processEnv = env as NodeJS.ProcessEnv

  for (const [name, config] of Object.entries(capabilityConfig)) {
    const availability = await Promise.all(
      config.commands.map((command) =>
        probeCommand(executor, command, extraFsProbe),
      ),
    )
    const found = config.commands.filter((_, index) => availability[index])
    const missing = config.commands.filter((_, index) => !availability[index])
    result[name as SystemCapability] = {
      available: found.length > 0,
      commands: found,
      missingCommands: missing,
      reason: config.reason,
      preferred: config.preferred(platform, processEnv),
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
  return `${name}: none of ${status.missingCommands.join(", ")} found — ${status.reason}`
}

export const getRequiredCapability = (
  action: string,
): SystemCapability | null => {
  if (action.startsWith("type://")) return "keyMacro"
  if (action.startsWith("macro://")) return "keyMacro"
  return null
}
