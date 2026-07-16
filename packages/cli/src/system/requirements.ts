import type { CommandExecutor } from "./providers/shared"

export type SystemCapability = "clipboard" | "keyMacro"

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
  clipboard: {
    commands: ["wl-copy", "xclip", "xsel", "pbcopy"],
    reason:
      "paste:// actions require a clipboard tool (wl-copy, xclip, xsel, or pbcopy)",
    preferred: (platform, env) => {
      if (platform === "darwin") return "pbcopy"
      const waylandDisplay = env["WAYLAND_DISPLAY"]
      if (waylandDisplay !== undefined && waylandDisplay.length > 0 && waylandDisplay !== "0") {
        return "wl-copy"
      }
      return "xclip"
    },
  },
  keyMacro: {
    commands: ["ydotool", "xdotool", "dotool", "osascript"],
    reason:
      "macro:// and paste:// keystrokes require a key-macro tool (ydotool, xdotool, dotool, or osascript)",
    preferred: (platform, env) => {
      if (platform === "darwin") return "osascript"
      const sessionType = env["XDG_SESSION_TYPE"]
      if (sessionType === "wayland") return "ydotool"
      return "xdotool"
    },
  },
}

const probeCommand = async (
  executor: CommandExecutor,
  command: string,
): Promise<boolean> => {
  const result = await executor.run("which", [command])
  return result.exitCode === 0 && result.stdout.trim().length > 0
}

export const checkRequirements = async ({
  platform,
  executor,
  env = process.env,
}: RequirementsCheckDeps): Promise<RequirementsCheckResult> => {
  const result: Partial<Record<SystemCapability, CapabilityStatus>> = {}
  const processEnv = env as NodeJS.ProcessEnv

  for (const [name, config] of Object.entries(capabilityConfig)) {
    const availability = await Promise.all(
      config.commands.map((command) => probeCommand(executor, command)),
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

export const getRequiredCapability = (action: string): SystemCapability | null => {
  if (action.startsWith("paste://")) return "clipboard"
  if (action.startsWith("macro://")) return "keyMacro"
  return null
}
