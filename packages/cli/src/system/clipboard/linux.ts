import type pino from "pino"

import { type ClipboardProvider } from "../provider"

import type { CommandExecutor } from "../media"

export interface CreateLinuxClipboardProviderOptions {
  readonly executor: CommandExecutor
  readonly env?: Readonly<Record<string, string>>
  readonly logger: pino.Logger
}

export const createLinuxClipboardProvider = (
  options: CreateLinuxClipboardProviderOptions,
): ClipboardProvider => {
  const { executor, env, logger } = options
  let disposed = false
  const stop = async (): Promise<void> => {
    disposed = true
  }

  const writeText = async (text: string): Promise<void> => {
    if (disposed) throw new Error("Clipboard provider is disposed")
    const escaped = text.replace(/'/g, "'\\''")
    const cmd = `printf '%s' '${escaped}'`
    const waylandDisplay = (env ?? process.env)["WAYLAND_DISPLAY"]
    const isWayland =
      waylandDisplay !== undefined &&
      waylandDisplay.length > 0 &&
      waylandDisplay !== "0"
    if (isWayland) {
      const r = await executor.run("sh", ["-c", `${cmd} | wl-copy`])
      if (r.exitCode === 0) return
      logger.warn({ stderr: r.stderr }, "clipboard: wl-copy failed")
    }
    const r1 = await executor.run("sh", [
      "-c",
      `${cmd} | xclip -selection clipboard`,
    ])
    if (r1.exitCode === 0) return
    const r2 = await executor.run("sh", [
      "-c",
      `${cmd} | xsel --clipboard --input`,
    ])
    if (r2.exitCode !== 0) {
      logger.warn({ stderr: r2.stderr }, "clipboard: xclip + xsel both failed")
    }
  }

  const readText = async (): Promise<string> => {
    if (disposed) throw new Error("Clipboard provider is disposed")
    const waylandDisplay = (env ?? process.env)["WAYLAND_DISPLAY"]
    const isWayland =
      waylandDisplay !== undefined &&
      waylandDisplay.length > 0 &&
      waylandDisplay !== "0"
    if (isWayland) {
      const r = await executor.run("sh", ["-c", "wl-paste"])
      if (r.exitCode === 0 && r.stdout.length > 0) return r.stdout
    }
    const r1 = await executor.run("sh", ["-c", "xclip -selection clipboard -o"])
    if (r1.exitCode === 0 && r1.stdout.length > 0) return r1.stdout
    const r2 = await executor.run("sh", ["-c", "xsel --clipboard --output"])
    if (r2.exitCode === 0 && r2.stdout.length > 0) return r2.stdout
    return ""
  }

  return { writeText, readText, stop }
}
