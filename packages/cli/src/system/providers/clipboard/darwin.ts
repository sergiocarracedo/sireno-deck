import type pino from "pino"

import type { ClipboardProvider } from "../clipboard"
import { ProviderError } from "../error"
import type { CommandExecutor } from "../shared"
import { withTimeout } from "../shared"

export interface CreateDarwinClipboardProviderOptions {
  readonly executor: CommandExecutor
  readonly logger: pino.Logger
  readonly timeoutMs?: number
}

export const createDarwinClipboardProvider = (
  options: CreateDarwinClipboardProviderOptions,
): ClipboardProvider => {
  const { executor, logger, timeoutMs: timeoutMsOption } = options
  const timeoutMs = timeoutMsOption ?? 500
  let disposed = false
  const stop = async (): Promise<void> => {
    disposed = true
  }

  const writeText = async (text: string): Promise<void> => {
    if (disposed) throw new Error("Clipboard provider is disposed")
    const escaped = text.replace(/'/g, "'\\''")
    try {
      const result = await withTimeout(
        executor.run("sh", ["-c", `printf '%s' '${escaped}' | pbcopy`], {
          timeoutMs,
        }),
        timeoutMs + 500,
      )
      if (result.exitCode !== 0) {
        logger.warn(
          { stderr: result.stderr },
          "clipboard: pbcopy failed",
        )
        throw new ProviderError(
          "EXEC_FAILED",
          `clipboard write failed: ${result.stderr || "unknown error"}`,
        )
      }
    } catch (err) {
      if (err instanceof ProviderError) throw err
      throw new ProviderError(
        "EXEC_FAILED",
        `clipboard write failed: ${err instanceof Error ? err.message : String(err)}`,
      )
    }
  }

  const readText = async (): Promise<string> => {
    if (disposed) throw new Error("Clipboard provider is disposed")
    try {
      const result = await withTimeout(
        executor.run("pbpaste", [], { timeoutMs }),
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
