import type { AddonCheck, AddonCheckResult } from "@/addon/api"
import type { CommandExecutor } from "@/system/providers/shared"

interface MediaChecksDeps {
  readonly platform: NodeJS.Platform
  readonly executor: CommandExecutor
}

const commandExists = async (
  executor: CommandExecutor,
  command: string,
): Promise<boolean> => {
  // `command` is a shell builtin, not an executable that execFile can spawn.
  const quoted = `'${command.replaceAll(`'`, `'\\''`)}'`
  const result = await executor.run("sh", ["-c", `command -v ${quoted}`])
  return result.exitCode === 0 && result.stdout.trim().length > 0
}

// ponytail: each OS exposes a different media control surface. The
// check should match the binary the provider actually invokes — if the
// provider shells out to `playerctl`, the check looks for `playerctl`.
// No need to instantiate the full provider; that would spawn real
// subprocesses during preflight.
const checkLinux = async ({
  executor,
}: MediaChecksDeps): Promise<AddonCheckResult> => {
  const found: string[] = []
  const missing: string[] = []
  if (await commandExists(executor, "playerctl")) found.push("playerctl")
  else missing.push("playerctl")
  if (await commandExists(executor, "wpctl")) found.push("wpctl")
  else missing.push("wpctl")
  if (missing.length === 0) return { available: true }
  return {
    available: false,
    reason: `install ${missing.join(", ")} (volume control needs wpctl on PipeWire/WirePlumber; transport needs playerctl)`,
  }
}

const checkDarwin = async ({
  executor,
}: MediaChecksDeps): Promise<AddonCheckResult> => {
  if (await commandExists(executor, "osascript")) {
    return { available: true }
  }
  return {
    available: false,
    reason:
      "install osascript (ships with macOS; needed for media control via Spotify AppleScript)",
  }
}

const checkWindows = async ({
  executor,
}: MediaChecksDeps): Promise<AddonCheckResult> => {
  if (await commandExists(executor, "powershell")) {
    return { available: true }
  }
  return {
    available: false,
    reason:
      "install powershell (ships with Windows; needed for SMTC media control)",
  }
}

const checkUnknown = async (): Promise<AddonCheckResult> => ({
  available: false,
  reason: "unsupported platform; media controls unavailable",
})

export const buildMediaAddonChecks = (
  deps: MediaChecksDeps,
): ReadonlyArray<AddonCheck> => {
  const check = async (): Promise<AddonCheckResult> => {
    switch (deps.platform) {
      case "linux":
        return checkLinux(deps)
      case "darwin":
        return checkDarwin(deps)
      case "win32":
        return checkWindows(deps)
      default:
        return checkUnknown()
    }
  }
  return [
    {
      name: "media-control",
      check,
    },
  ]
}
