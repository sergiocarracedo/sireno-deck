import type pino from "pino"

import type { ClipboardProvider } from "../clipboard"
import { ProviderError } from "../error"
import type { CommandExecutor } from "../shared"
import { withTimeout } from "../shared"

export interface CreateWindowsClipboardProviderOptions {
  readonly executor: CommandExecutor
  readonly logger: pino.Logger
  readonly timeoutMs?: number
}

const escapeForPowerShellSingleQuote = (s: string): string =>
  s.replace(/'/g, "''")

const escapeForDoubleQuote = (s: string): string => s.replace(/[\\"$`]/g, "``$&")

export const createWindowsClipboardProvider = (
  options: CreateWindowsClipboardProviderOptions,
): ClipboardProvider => {
  const { executor, logger, timeoutMs: timeoutMsOption } = options
  const timeoutMs = timeoutMsOption ?? 500
  let disposed = false
  const stop = async (): Promise<void> => {
    disposed = true
  }

  const runPS = async (script: string): Promise<string> => {
    const result = await withTimeout(
      executor.run(
        "powershell",
        ["-NoProfile", "-Command", script],
        { timeoutMs },
      ),
      timeoutMs + 500,
    )
    if (result.exitCode !== 0) {
      logger.warn(
        { stderr: result.stderr },
        "clipboard: powershell failed",
      )
      throw new ProviderError(
        "EXEC_FAILED",
        `clipboard write failed: ${result.stderr.trim() || "unknown error"}`,
      )
    }
    return result.stdout
  }

  const writeText = async (text: string): Promise<void> => {
    if (disposed) throw new Error("Clipboard provider is disposed")
    const escaped = escapeForDoubleQuote(text)
    const psValue = `'${escapeForPowerShellSingleQuote(escaped)}'`
    await runPS(`Set-Clipboard -Value ${psValue}`)
  }

  const readText = async (): Promise<string> => {
    if (disposed) throw new Error("Clipboard provider is disposed")
    try {
      const result = await withTimeout(
        executor.run(
          "powershell",
          ["-NoProfile", "-Command", "Get-Clipboard"],
          { timeoutMs },
        ),
        timeoutMs + 500,
      )
      if (result.exitCode === 0) return result.stdout
    } catch {
      // ignore
    }
    return ""
  }

  return { writeText, readText, stop }
}
