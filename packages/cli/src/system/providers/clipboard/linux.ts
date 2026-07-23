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
  readonly extraFsProbe?: (tool: string) => boolean
}

const WL_COPY_TOOL = "wl-copy"
const WL_PASTE_TOOL = "wl-paste"

const probeWlCopy = async (
  executor: CommandExecutor,
  extraFsProbe?: (tool: string) => boolean,
): Promise<boolean> => {
  const result = await executor.run("which", [WL_COPY_TOOL])
  if (result.exitCode === 0 && result.stdout.trim().length > 0) return true
  // ponytail: fallback when CLI is launched with a stripped PATH (systemd,
  // launchd, IDE runners) and `which` returns nothing even though wl-copy
  // is installed at e.g. /usr/bin. Mirror of the requirements.ts probe and
  // key-macro/linux.ts probeTool.
  return extraFsProbe?.(WL_COPY_TOOL) === true
}

const shellQuote = (value: string): string =>
  `'${value.replace(/'/g, "'\\''")}'`

export const createLinuxClipboardProvider = (
  options: CreateLinuxClipboardProviderOptions,
): ClipboardProvider => {
  const { executor, logger, timeoutMs: timeoutMsOption } = options
  const timeoutMs = timeoutMsOption ?? 500
  let disposed = false

  const stop = async (): Promise<void> => {
    disposed = true
  }

  const writeText = async (text: string): Promise<void> => {
    if (disposed) throw new Error("Clipboard provider is disposed")
    // ponytail: `-o` (paste-once) makes wl-copy exit after the next paste, so
    // the surrounding `sh -c` pipeline does not wait on a long-lived wl-copy.
    // The runtime's spawn() already drains stdio on 'exit', but the shell
    // here waits for every child in the pipeline — without `-o`, wl-copy
    // stays alive maintaining clipboard ownership and the pipe never closes.
    const cmd = `printf '%s' ${shellQuote(text)} | ${WL_COPY_TOOL} -o`
    const startedAt = Date.now()
    logger.info(
      { step: "clipboard.writeText", cmd, textPreview: text.slice(0, 24) },
      "clipboard: invoking wl-copy",
    )
    const result = await withTimeout(
      executor.run("sh", ["-c", cmd]),
      timeoutMs + 2500,
    )
    logger.info(
      {
        step: "clipboard.writeText",
        exitCode: result.exitCode,
        stderr: result.stderr.trim(),
        elapsedMs: Date.now() - startedAt,
      },
      "clipboard: wl-copy returned",
    )
    if (result.exitCode !== 0) {
      logger.warn(
        { stderr: result.stderr.trim() },
        "clipboard: wl-copy failed",
      )
      throw new ProviderError(
        "EXEC_FAILED",
        `clipboard write failed: ${result.stderr.trim() || "unknown error"}`,
      )
    }
  }

  const readText = async (): Promise<string> => {
    if (disposed) throw new Error("Clipboard provider is disposed")
    try {
      const startedAt = Date.now()
      const result = await withTimeout(
        executor.run(WL_PASTE_TOOL, []),
        timeoutMs + 2500,
      )
      logger.info(
        {
          step: "clipboard.readText",
          exitCode: result.exitCode,
          stdoutPreview: result.stdout.slice(0, 32),
          elapsedMs: Date.now() - startedAt,
        },
        "clipboard: wl-paste returned",
      )
      if (result.exitCode !== 0) return ""
      return result.stdout
    } catch {
      return ""
    }
  }

  let _probeDone = false
  let _probeOk = false
  const ensureProbed = async (): Promise<boolean> => {
    if (_probeDone) return _probeOk
    _probeOk = await probeWlCopy(executor, options.extraFsProbe)
    _probeDone = true
    if (!_probeOk) {
      logger.warn(
        { tool: WL_COPY_TOOL },
        "wl-copy not found on PATH; clipboard will throw ProviderError",
      )
    }
    return _probeOk
  }

  // Eager probe so a missing tool surfaces at init time.
  void ensureProbed()

  return {
    writeText: async (text: string) => {
      const ok = await ensureProbed()
      if (!ok) {
        throw new ProviderError(
          "NOT_AVAILABLE",
          "wl-copy not found on PATH; install the wl-clipboard package",
        )
      }
      await writeText(text)
    },
    readText,
    stop,
  }
}
