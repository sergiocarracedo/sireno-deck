import { execFileSync } from "node:child_process"

import {
  EXTENSION_INSTALL_URL,
  hasWaylandGnomeSession,
} from "../providers/active-app/wayland-gnome"
import type { CommandExecutor } from "../providers/shared"
import { UDEV_RULES_PATH } from "./types"
import {
  type CapabilityName,
  type CapabilityProbe,
  type DesktopSession,
  type PackageManager,
  type ProbeDeps,
  type SystemReport,
  type UdevProbe,
  type ConfigProbe,
} from "./types"

const STREAM_DECK_PRODUCT_IDS = [
  "0060",
  "006c",
  "006d",
  "006e",
  "0080",
  "0084",
  "0086",
  "0090",
] as const

const PCMAN_PM_BINS: ReadonlyArray<{
  readonly pm: PackageManager
  readonly probe: ReadonlyArray<string>
}> = [
  { pm: "apt", probe: ["apt-get", "apt"] },
  { pm: "dnf", probe: ["dnf"] },
  { pm: "pacman", probe: ["pacman"] },
  { pm: "zypper", probe: ["zypper"] },
]

const detectPackageManager = async (
  platform: string,
  executor: CommandExecutor,
  extraFsProbe?: (command: string) => boolean,
): Promise<PackageManager> => {
  if (platform === "darwin") {
    const brew = await probeCommand(executor, "brew", extraFsProbe)
    return brew ? "brew" : "none"
  }
  if (platform !== "linux") return "none"
  for (const { pm, probe } of PCMAN_PM_BINS) {
    for (const bin of probe) {
      if (await probeCommand(executor, bin, extraFsProbe)) return pm
    }
  }
  return "none"
}

const detectSession = (env: NodeJS.ProcessEnv): DesktopSession => {
  if (env["XDG_SESSION_TYPE"] === "wayland") return "wayland"
  if (env["XDG_SESSION_TYPE"] === "x11") return "x11"
  if (env["WAYLAND_DISPLAY"] !== undefined && env["WAYLAND_DISPLAY"] !== "") {
    return "wayland"
  }
  if (env["DISPLAY"] !== undefined && env["DISPLAY"] !== "") return "x11"
  return "unknown"
}

const detectStreamDeck = (
  platforms: ReadonlyArray<string>,
  syncRunner: (cmd: string) => string,
): { connected: boolean; matched: ReadonlyArray<string> } => {
  if (!platforms.includes("linux")) return { connected: false, matched: [] }
  const candidates = ["lsusb", "/usr/bin/lsusb", "/usr/sbin/lsusb"]
  let raw = ""
  for (const bin of candidates) {
    try {
      raw = syncRunner(bin)
      if (raw.length > 0) break
    } catch {
      // try next candidate
    }
  }
  if (raw.length === 0) return { connected: false, matched: [] }
  const matched: string[] = []
  for (const pid of STREAM_DECK_PRODUCT_IDS) {
    const re = new RegExp(`0fd9:${pid}\\b`, "i")
    if (re.test(raw)) matched.push(pid)
  }
  return { connected: matched.length > 0, matched }
}

const probeViaCommandV = async (
  executor: CommandExecutor,
  command: string,
): Promise<boolean> => {
  // ponytail: `command` is a POSIX shell builtin, not a binary.
  // execFile can't run builtins directly — wrap in sh -c so the call
  // works under real executors as well as test mocks. Argument is
  // shell-quoted to keep the call single-token.
  const quoted = `'${command.replaceAll(`'`, `'\\''`)}'`
  const result = await executor.run("sh", ["-c", `command -v ${quoted}`])
  return result.exitCode === 0 && result.stdout.trim().length > 0
}

const probeViaVersion = async (
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
  if (await probeViaCommandV(executor, command)) return true
  if (extraFsProbe?.(command) === true) return true
  return await probeViaVersion(executor, command)
}

const probeCapability = async (
  name: CapabilityName,
  candidates: ReadonlyArray<string>,
  preferred: string,
  reason: string,
  executor: CommandExecutor,
  extraFsProbe?: (command: string) => boolean,
): Promise<CapabilityProbe> => {
  const availability = await Promise.all(
    candidates.map((cmd) => probeCommand(executor, cmd, extraFsProbe)),
  )
  const found = candidates.filter((_, idx) => availability[idx])
  const missing = candidates.filter((_, idx) => !availability[idx])
  return {
    name,
    available: found.length > 0,
    missing,
    preferred,
    reason,
  }
}

const probeKeyMacro = (
  platform: string,
  executor: CommandExecutor,
  extraFsProbe?: (command: string) => boolean,
): Promise<CapabilityProbe> => {
  if (platform === "darwin") {
    return probeCapability(
      "keyMacro",
      ["osascript"],
      "osascript",
      "macOS uses osascript for key macros.",
      executor,
      extraFsProbe,
    )
  }
  if (platform === "win32") {
    return probeCapability(
      "keyMacro",
      ["powershell"],
      "powershell",
      "Windows uses PowerShell SendInput for key macros.",
      executor,
      extraFsProbe,
    )
  }
  return probeCapability(
    "keyMacro",
    ["ydotool", "wtype", "xdotool", "dotool"],
    "ydotool",
    "Install ydotool (most compositors) or wtype (wlroots only).",
    executor,
    extraFsProbe,
  )
}

const probeClipboard = (
  platform: string,
  executor: CommandExecutor,
  extraFsProbe?: (command: string) => boolean,
): Promise<CapabilityProbe> => {
  if (platform === "darwin") {
    return probeCapability(
      "clipboard",
      ["pbcopy"],
      "pbcopy",
      "macOS ships pbcopy.",
      executor,
      extraFsProbe,
    )
  }
  if (platform === "win32") {
    return probeCapability(
      "clipboard",
      ["clip"],
      "clip",
      "Windows ships clip.exe.",
      executor,
      extraFsProbe,
    )
  }
  return probeCapability(
    "clipboard",
    ["wl-copy"],
    "wl-copy",
    "Install wl-clipboard (provides wl-copy).",
    executor,
    extraFsProbe,
  )
}

const probeNotification = (
  platform: string,
  executor: CommandExecutor,
  extraFsProbe?: (command: string) => boolean,
): Promise<CapabilityProbe> => {
  if (platform === "darwin") {
    return probeCapability(
      "notification",
      ["osascript"],
      "osascript",
      "macOS uses osascript for notifications.",
      executor,
      extraFsProbe,
    )
  }
  if (platform === "win32") {
    return probeCapability(
      "notification",
      ["powershell"],
      "powershell",
      "Windows uses PowerShell NotifyIcon.",
      executor,
      extraFsProbe,
    )
  }
  return probeCapability(
    "notification",
    ["notify-send"],
    "notify-send",
    "Install libnotify (provides notify-send).",
    executor,
    extraFsProbe,
  )
}

const probeActiveApp = async (
  platform: string,
  env: NodeJS.ProcessEnv,
  executor: CommandExecutor,
  extraFsProbe?: (command: string) => boolean,
): Promise<CapabilityProbe> => {
  if (platform === "darwin") {
    return probeCapability(
      "activeApp",
      ["osascript"],
      "osascript",
      "macOS uses AppleScript for active-app detection.",
      executor,
      extraFsProbe,
    )
  }
  if (platform === "win32") {
    return probeCapability(
      "activeApp",
      ["powershell"],
      "powershell",
      "Windows uses PowerShell UIAutomation for active-app detection.",
      executor,
      extraFsProbe,
    )
  }
  const session = detectSession(env)
  if (await hasWaylandGnomeSession({ env, executor })) {
    return {
      name: "activeApp",
      available: true,
      missing: [],
      preferred: "gnome-shell-extension",
      reason: `Wayland GNOME requires the 'Window Calls Extended' extension (${EXTENSION_INSTALL_URL}). The wizard can detect this — install it from the GNOME extensions website and re-run.`,
    }
  }
  if (session === "x11") {
    return probeCapability(
      "activeApp",
      ["xdotool", "xprop"],
      "xdotool",
      "Install xdotool and xprop for active-app detection on X11.",
      executor,
      extraFsProbe,
    )
  }
  return probeCapability(
    "activeApp",
    ["xdotool"],
    "xdotool",
    "No active-app provider detected for this session. Install xdotool or switch to a supported session.",
    executor,
    extraFsProbe,
  )
}

const probeUdev = (
  platform: string,
  rulesPath: string,
  fileExists: (path: string) => boolean,
  readFile: (path: string) => string | null,
  streamDeck: { connected: boolean; matched: ReadonlyArray<string> },
): UdevProbe => {
  if (platform !== "linux") {
    return {
      rulesInstalled: true,
      rulesPath,
      streamDeckConnected: false,
      matchedProductIds: [],
    }
  }
  const contents = fileExists(rulesPath) ? readFile(rulesPath) : null
  return {
    rulesInstalled:
      contents !== null &&
      contents.includes('SUBSYSTEM=="usb"') &&
      contents.includes('ATTRS{idVendor}=="0fd9"'),
    rulesPath,
    streamDeckConnected: streamDeck.connected,
    matchedProductIds: streamDeck.matched,
  }
}

const probeConfig = (
  xdgConfigHome: string,
  fileExists: (path: string) => boolean,
): ConfigProbe => {
  const path = `${xdgConfigHome}/sirenodeck/config.yml`
  return { exists: fileExists(path), path }
}

export const probeAll = async (deps: ProbeDeps): Promise<SystemReport> => {
  const {
    platform,
    homeDir,
    xdgConfigHome,
    env,
    executor,
    extraFsProbe,
    fileExists,
    readFile,
  } = deps

  const session = detectSession(env)
  const packageManager = await detectPackageManager(
    platform,
    executor,
    extraFsProbe,
  )

  const lsusbSync = (binary: string): string => {
    try {
      const out = execFileSync(binary, [], {
        encoding: "utf8",
        timeout: 2_000,
        stdio: ["ignore", "pipe", "ignore"],
      })
      return out
    } catch {
      return ""
    }
  }

  const streamDeck = detectStreamDeck([platform], lsusbSync)

  const capabilities = {
    keyMacro: await probeKeyMacro(platform, executor, extraFsProbe),
    clipboard: await probeClipboard(platform, executor, extraFsProbe),
    notification: await probeNotification(platform, executor, extraFsProbe),
    activeApp: await probeActiveApp(platform, env, executor, extraFsProbe),
  } as const

  const udev = probeUdev(
    platform,
    UDEV_RULES_PATH,
    fileExists,
    readFile,
    streamDeck,
  )
  const config = probeConfig(xdgConfigHome, fileExists)

  return {
    platform,
    homeDir,
    xdgConfigHome,
    session,
    packageManager,
    capabilities,
    udev,
    config,
  }
}
