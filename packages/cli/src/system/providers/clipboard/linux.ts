import type pino from "pino"

import type { ClipboardProvider } from "../clipboard"
import { ProviderError } from "../error"
import type { CommandExecutor } from "../shared"
import { withTimeout } from "../shared"

export interface CreateLinuxClipboardProviderOptions {
  readonly executor: CommandExecutor
  readonly env?: Readonly<Record<string, string>>
  readonly logger: pino.Logger
  readonly timeoutMs?: number
}

export const createLinuxClipboardProvider = (
  options: CreateLinuxClipboardProviderOptions,
): ClipboardProvider => {
  const { executor, env, logger, timeoutMs: timeoutMsOption } = options
  const timeoutMs = timeoutMsOption ?? 500
  let disposed = false
  const stop = async (): Promise<void> => {
    disposed = true
  }

  const runWithTimeout = async (
    command: string,
    args: ReadonlyArray<string>,
  ): Promise<{ exitCode: number; stdout: string; stderr: string }> => {
    return await withTimeout(executor.run(command, args), timeoutMs + 500)
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

    const failures: string[] = []

    if (isWayland) {
      try {
        const r = await runWithTimeout("sh", ["-c", `${cmd} | wl-copy`])
        if (r.exitCode === 0) return
        failures.push(`wl-copy: ${r.stderr.trim() || "unknown error"}`)
      } catch (err) {
        failures.push(
          `wl-copy: ${err instanceof Error ? err.message : String(err)}`,
        )
      }
    }

    try {
      const r1 = await runWithTimeout("sh", [
        "-c",
        `${cmd} | xclip -selection clipboard`,
      ])
      if (r1.exitCode === 0) return
      failures.push(`xclip: ${r1.stderr.trim() || "unknown error"}`)
    } catch (err) {
      failures.push(
        `xclip: ${err instanceof Error ? err.message : String(err)}`,
      )
    }

    try {
      const r2 = await runWithTimeout("sh", [
        "-c",
        `${cmd} | xsel --clipboard --input`,
      ])
      if (r2.exitCode === 0) return
      failures.push(`xsel: ${r2.stderr.trim() || "unknown error"}`)
    } catch (err) {
      failures.push(
        `xsel: ${err instanceof Error ? err.message : String(err)}`,
      )
    }

    if (failures.length > 0) {
      const message = failures.join("; ")
      logger.warn(
        { stderr: message },
        "clipboard: all write methods failed; install wl-copy (Wayland) or xclip/xsel (X11)",
      )
      throw new ProviderError(
        "EXEC_FAILED",
        `clipboard write failed: ${message}`,
      )
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
      try {
        const r = await runWithTimeout("sh", ["-c", "wl-paste"])
        if (r.exitCode === 0 && r.stdout.length > 0) return r.stdout
      } catch {
        // ignore
      }
    }
    try {
      const r1 = await runWithTimeout("sh", [
        "-c",
        "xclip -selection clipboard -o",
      ])
      if (r1.exitCode === 0 && r.stdout.length > 0) return r.stdout
    } catch {
      // ignore
    }
    try {
      const r2 = await runWithTimeout("sh", ["-c", "xsel --clipboard --output"])
      if (r2.exitCode === 0 && r2.stdout.length > 0) return r.stdout
    } catch {
      // ignore
    }
    return ""
  }

  return { writeText, readText, stop }
}
