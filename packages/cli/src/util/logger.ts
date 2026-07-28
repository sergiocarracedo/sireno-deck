import { Writable } from "node:stream"

import pino, {
  type Logger,
  type LoggerOptions,
  type SerializedError,
} from "pino"

export interface CreateLoggerOptions {
  level?: LoggerOptions["level"]
  verbose?: boolean
  json?: boolean
}

const RESET = "\u001b[0m"
const DIM = "\u001b[2m"
const RED = "\u001b[31m"
const YELLOW = "\u001b[33m"
const CYAN = "\u001b[36m"
const GRAY = "\u001b[90m"

const LEVEL_COLOR: Record<number, string> = {
  10: GRAY,
  20: GRAY,
  30: CYAN,
  40: YELLOW,
  50: RED,
  60: RED,
}

const LEVEL_LABEL: Record<number, string> = {
  10: "TRACE",
  20: "DEBUG",
  30: "INFO",
  40: "WARN",
  50: "ERROR",
  60: "FATAL",
}

const colorize = (color: string, text: string): string =>
  process.stdout.isTTY ? `${color}${text}${RESET}` : text

const CONTEXT_FIELDS = [
  "frontendUrl",
  "wsUrl",
  "tool",
  "sessionType",
  "platform",
  "executor",
  "deckId",
  "position",
  "gesture",
  "host",
  "port",
  "addon",
  "source",
  "message",
  "addonDecks",
  "userDecks",
  "addonConfigEntries",
  "icon",
  "fullPath",
] as const

export const formatHuman = (jsonLine: string): string | null => {
  let entry: Record<string, unknown>
  try {
    entry = JSON.parse(jsonLine) as Record<string, unknown>
  } catch {
    return jsonLine
  }
  const levelNum = typeof entry["level"] === "number" ? entry["level"] : 30
  const level = LEVEL_LABEL[levelNum] ?? "INFO"
  const levelColor = LEVEL_COLOR[levelNum] ?? CYAN
  const msg = typeof entry["msg"] === "string" ? entry["msg"] : ""
  const time =
    typeof entry["time"] === "number"
      ? new Date(entry["time"]).toISOString().slice(11, 19)
      : ""
  const ts = colorize(DIM, time.length > 0 ? `${time} ` : "")
  const head = colorize(levelColor, level.padEnd(5))

  const ctxParts: string[] = []
  for (const key of CONTEXT_FIELDS) {
    const value = entry[key]
    if (value === undefined || value === null) continue
    const display = typeof value === "string" ? value : JSON.stringify(value)
    if (display.length === 0) continue
    ctxParts.push(`${colorize(DIM, `${key}:`)} ${display}`)
  }
  const err = entry["err"]
  if (err !== null && typeof err === "object") {
    const e = err as { type?: unknown; message?: unknown }
    const errType = typeof e.type === "string" ? e.type : "Error"
    const errMsg = typeof e.message === "string" ? e.message : ""
    if (errMsg.length > 0) {
      ctxParts.push(
        `${colorize(DIM, "err:")} ${colorize(RED, `${errType}: ${errMsg}`)}`,
      )
    }
  }
  const ctxStr = ctxParts.length > 0 ? ` (${ctxParts.join(", ")})` : ""
  return `${ts}${head} ${msg}${ctxStr}`
}

class HumanWritable extends Writable {
  override _write(
    chunk: Buffer | string,
    _encoding: BufferEncoding,
    callback: (error?: Error | null) => void,
  ): void {
    const text = typeof chunk === "string" ? chunk : chunk.toString("utf8")
    const lines = text.split("\n")
    for (const line of lines) {
      if (line.length === 0) continue
      const formatted = formatHuman(line)
      if (formatted !== null) {
        process.stdout.write(`${formatted}\n`)
      }
    }
    callback()
  }
}

const errorSerializer = (
  err: Error & { issues?: unknown; type?: string },
): SerializedError => {
  const out = {
    type: err.name || "Error",
    message: err.message,
    stack: process.env["SIRENO_LOG_VERBOSE"] === "1" ? (err.stack ?? "") : "",
    raw: err,
  }
  if (err.type !== undefined) (out as { type?: string }).type = err.type
  if (err.issues !== undefined)
    (out as { issues?: unknown }).issues = err.issues
  return out as SerializedError
}

// ponytail: stray INVOCATION_ID + JOURNAL_STREAM in a user's shell (from a
// prior systemd context) makes human-format detection false-positive. Match
// the same heuristic as isUnderServiceManager: ppid === 1 is the only reliable
// signal that we're actually being supervised by init.
import { readFileSync } from "node:fs"

export const isOrphanedToInit = (): boolean => {
  if (process.platform !== "linux") return true
  try {
    const stat = readFileSync("/proc/self/stat", "utf8")
    const closeParen = stat.lastIndexOf(")")
    const tail = stat.slice(closeParen + 2)
    const ppid = Number.parseInt(tail.split(" ")[1] ?? "", 10)
    return Number.isFinite(ppid) && ppid === 1
  } catch {
    return false
  }
}

// ponytail: factory so tests can inject a mocked isOrphanedToInit without
// hitting ESM binding issues (the closure above captures the real one).
export interface ServiceModeDeps {
  readonly isOrphaned: () => boolean
}

export const createIsServiceMode = (deps: ServiceModeDeps) => (): boolean => {
  if (process.env["SIRENO_DAEMON_CHILD"]) return true
  if (process.env["LAUNCH_JOB_NAME"]) return deps.isOrphaned()
  if (
    process.env["INVOCATION_ID"] &&
    process.env["JOURNAL_STREAM"] &&
    deps.isOrphaned()
  ) {
    return true
  }
  return false
}

export const isServiceMode = createIsServiceMode({
  isOrphaned: isOrphanedToInit,
})

export const createLogger = (options: CreateLoggerOptions = {}): Logger => {
  const { level, verbose = false, json = false } = options

  if (verbose) process.env["SIRENO_LOG_VERBOSE"] = "1"
  if (json) process.env["SIRENO_LOG_JSON"] = "1"

  const wantRaw = json || isServiceMode() || !process.stdout.isTTY

  const loggerOptions: LoggerOptions = {
    name: "sireno-deck",
    level: level ?? (verbose ? "debug" : "info"),
    serializers: {
      err: errorSerializer,
    },
    redact: {
      paths: ["err.raw"],
      censor: "[hidden]",
    },
  }

  if (wantRaw) {
    return pino(loggerOptions)
  }

  const dest = new HumanWritable()
  const teeStream = {
    write(chunk: string): void {
      dest.write(chunk)
      try {
        const parsed = JSON.parse(chunk) as {
          level?: number
          time?: number
          msg?: string
        }
        if (
          typeof parsed.level === "number" &&
          typeof parsed.time === "number" &&
          typeof parsed.msg === "string"
        ) {
          const levelName = levelNameFromNumber(parsed.level)
          if (levelName !== null) {
            ;(process.emit as unknown as (e: string, p: unknown) => void)(
              "sireno:log",
              {
                level: levelName,
                msg: parsed.msg,
                ts: parsed.time,
              },
            )
          }
        }
      } catch {
        // ignore non-JSON log lines
      }
    },
  }
  return pino(loggerOptions, teeStream as unknown as pino.DestinationStream)
}

const levelNameFromNumber = (level: number): string | null => {
  if (level >= 60) return "fatal"
  if (level >= 50) return "error"
  if (level >= 40) return "warn"
  if (level >= 30) return "info"
  if (level >= 20) return "debug"
  return "trace"
}
