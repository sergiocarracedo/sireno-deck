import { execa } from "execa"

export interface CommandExecutionOptions {
  command: string
  timeoutMs?: number
}

export interface CommandExecutionResult {
  code: number | null
  failed: boolean
  signal?: string
  stderr: string
  stdout: string
  timedOut: boolean
}

const DEFAULT_TIMEOUT_MS = 10_000

function normalizeOutput(value: string): string {
  return value.replace(/\r\n/g, "\n").trim()
}

export async function executeCommand(options: CommandExecutionOptions): Promise<CommandExecutionResult> {
  try {
    const result = await execa("/bin/sh", ["-c", options.command], {
      reject: false,
      timeout: options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    })

    return {
      code: result.exitCode ?? null,
      failed: result.failed,
      signal: result.signal ?? undefined,
      stderr: normalizeOutput(result.stderr),
      stdout: normalizeOutput(result.stdout),
      timedOut: result.timedOut,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)

    return {
      code: null,
      failed: true,
      stderr: normalizeOutput(message),
      stdout: "",
      timedOut: message.toLowerCase().includes("timed out"),
    }
  }
}
