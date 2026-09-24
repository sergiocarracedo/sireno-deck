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
        executor.run(
          "sh",
          [
            "-c",
            // ponytail: `pbcopy` decides how to read its input from the
            // locale, and with none set it falls back to Mac OS Roman. The
            // daemon normally runs under launchd, which passes almost no
            // environment — the generated unit sets PATH and nothing else — so
            // the bytes of an emoji arrived as the Mac OS Roman characters
            // that happen to share them: 🏉 pasted as "üèâ", 🥏 as "ü•è",
            // each with an invisible Apple-logo byte in front. Nothing failed;
            // pbcopy exited 0 and faithfully copied the wrong text.
            //
            // Stating the encoding here fixes it wherever the daemon was
            // started from, rather than relying on a locale it may not have
            // inherited. `export` so it applies to pbcopy, not just printf.
            `export LC_CTYPE=UTF-8; printf '%s' '${escaped}' | pbcopy`,
          ],
          {
            timeoutMs,
          },
        ),
        timeoutMs + 500,
      )
      if (result.exitCode !== 0) {
        logger.warn({ stderr: result.stderr }, "clipboard: pbcopy failed")
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
        // Same locale caveat as the write: without LC_CTYPE, pbpaste renders
        // the pasteboard as Mac OS Roman and hands back mojibake for anything
        // outside ASCII.
        executor.run("sh", ["-c", "export LC_CTYPE=UTF-8; pbpaste"], {
          timeoutMs,
        }),
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
