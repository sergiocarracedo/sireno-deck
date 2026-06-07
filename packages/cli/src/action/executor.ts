import { execa } from "execa"

import type { HostContext } from "@/system/host-context"

export interface CommandExecutionOptions {
  command: string
  hostContext?: HostContext
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

const HOST_CONTEXT_TEMPLATE_PATTERN = /\{\{\s*(host(?:\.[a-zA-Z0-9_]+)+)\s*\}\}/g

function quotePosixShellValue(value: string): string {
  return `'${value.replaceAll("'", "'\"'\"'")}'`
}

function normalizeOutput(value: string): string {
  return value.replace(/\r\n/g, "\n").trim()
}

function resolveHostContextPath(hostContext: HostContext, path: string): string | undefined {
  const segments = path.split(".")
  const normalizedSegments = segments[0] === "host" ? segments.slice(1) : segments
  let current: unknown = hostContext

  for (const segment of normalizedSegments) {
    if (!current || typeof current !== "object" || !(segment in current)) {
      return undefined
    }

    current = (current as Record<string, unknown>)[segment]
  }

  return typeof current === "string" ? current : undefined
}

export function resolveHostContextPlaceholders(command: string, hostContext: HostContext): string {
  return command.replace(HOST_CONTEXT_TEMPLATE_PATTERN, (placeholder, path) => (
    resolveHostContextPath(hostContext, path) ?? placeholder
  ))
}

export function resolveHostContextCommandPlaceholders(command: string, hostContext: HostContext): string {
  return command.replace(HOST_CONTEXT_TEMPLATE_PATTERN, (placeholder, path) => {
    const value = resolveHostContextPath(hostContext, path)
    return value === undefined ? placeholder : quotePosixShellValue(value)
  })
}

export async function executeCommand(options: CommandExecutionOptions): Promise<CommandExecutionResult> {
  try {
    const command = options.hostContext
      ? resolveHostContextCommandPlaceholders(options.command, options.hostContext)
      : options.command

    const result = await execa("/bin/sh", ["-c", command], {
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
