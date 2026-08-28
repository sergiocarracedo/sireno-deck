import { Writable } from "node:stream"

import { log } from "@clack/prompts"
import pino, {
  type Logger,
  type LoggerOptions,
  type SerializedError,
} from "pino"

export interface CreateLoggerOptions {
  level?: LoggerOptions["level"]
  verbose?: boolean
  json?: boolean
  component?: string
}

const RESET = "\u001b[0m"
const DIM = "\u001b[2m"
const RED = "\u001b[31m"
const GREEN = "\u001b[32m"
const YELLOW = "\u001b[33m"
const BLUE = "\u001b[34m"
const MAGENTA = "\u001b[35m"
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

const COMPONENT_COLOR: Record<string, string> = {
  runtime: CYAN,
  methods: CYAN,
  executor: CYAN,
  "state-publisher": CYAN,
  real: GREEN,
  emulator: GREEN,
  "ws-bridge": MAGENTA,
  "addon-handler": MAGENTA,
  "active-app": YELLOW,
  "key-macro": YELLOW,
  clipboard: YELLOW,
  notification: YELLOW,
  session: YELLOW,
  "browser-renderer": BLUE,
  "emulator-server": BLUE,
  daemon: BLUE,
  requirements: BLUE,
  orchestrator: CYAN,
  cli: GRAY,
}

const colorForComponent = (component: string): string =>
  COMPONENT_COLOR[component] ?? GRAY

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

const FORWARDED_CONTEXT_FIELDS = [
  "component",
  "deckId",
  "position",
  "addonName",
  "gesture",
  "keyIndex",
  "reason",
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
  // ponytail: operator-facing logs drop the [HH:MM:SS] prefix and the
  // continuation-line indent. Timestamps belong in service.log (where the
  // structured `time` field stays intact for forensics); the terminal only
  // needs enough info to read the line at a glance.
  const head = colorize(levelColor, level.padEnd(5))

  const component =
    typeof entry["component"] === "string" ? entry["component"] : ""
  const componentTag =
    component.length > 0
      ? ` ${colorize(colorForComponent(component), `[${component}]`)}`
      : ""

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
  return `${head}${componentTag} ${msg}${ctxStr}`
}

// ponytail: CLI startup logs (between intro/outro) should use the same
// clack tool as the banner: log.info / log.warn / log.error. Those tools
// render with a dim │ border + level-appropriate icon (● / ▲ / ■) and no
// "INFO"/"WARN" text label — matching the banner's visual language.
// HumanWritable maps pino levels to those tools so `logger.info(...)`
// calls made between intro() and outro() automatically get the border and
// icon. Outside a banner (or when stdout is not a TTY), fall back to the
// plain formatHuman line so piped output stays greppable.
class HumanWritable extends Writable {
  override _write(
    chunk: Buffer | string,
    _encoding: BufferEncoding,
    callback: (error?: Error | null) => void,
  ): void {
    const text = typeof chunk === "string" ? chunk : chunk.toString("utf8")
    const lines = text.split("\n")
    const useClack = process.stdout.isTTY && !isServiceMode()
    for (const line of lines) {
      if (line.length === 0) continue
      if (useClack) {
        let entry: Record<string, unknown> | null = null
        try {
          entry = JSON.parse(line) as Record<string, unknown>
        } catch {
          // not JSON — fall back to plain
        }
        if (
          entry !== null &&
          typeof entry["level"] === "number" &&
          typeof entry["msg"] === "string"
        ) {
          const levelNum = entry["level"] as number
          const component =
            typeof entry["component"] === "string"
              ? ` [${entry["component"]}]`
              : ""
          // ponytail: keep CONTEXT_FIELDS + err inline so operators still see
          // deckId / position / err details on the terminal, just without the
          // "INFO"/"WARN" text label — the icon + color from log.* conveys level.
          const ctxParts: string[] = []
          for (const key of CONTEXT_FIELDS) {
            const value = entry[key]
            if (value === undefined || value === null) continue
            const display =
              typeof value === "string" ? value : JSON.stringify(value)
            if (display.length === 0) continue
            ctxParts.push(`${key}: ${display}`)
          }
          const err = entry["err"]
          if (err !== null && typeof err === "object") {
            const e = err as { type?: unknown; message?: unknown }
            const errType = typeof e.type === "string" ? e.type : "Error"
            const errMsg = typeof e.message === "string" ? e.message : ""
            if (errMsg.length > 0) ctxParts.push(`err: ${errType}: ${errMsg}`)
          }
          const ctxStr = ctxParts.length > 0 ? ` (${ctxParts.join(", ")})` : ""
          const msg = `${entry["msg"] as string}${component}${ctxStr}`
          if (levelNum >= 50) log.error(msg)
          else if (levelNum >= 40) log.warn(msg)
          else log.info(msg)
          continue
        }
      }
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
    if (!Number.isFinite(ppid)) return false
    // ppid === 1 covers system-level services and true orphans; a systemd
    // --user unit's parent is the user manager itself (not pid 1), and
    // treating that as "not a service" made the daemon try `systemctl
    // restart` on its own unit — a self-restart loop under Restart=.
    // Interactive shells never have systemd as a direct parent, so the
    // stray-env false-positive defense still holds.
    if (ppid === 1) return true
    return readFileSync(`/proc/${ppid}/comm`, "utf8").trim() === "systemd"
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
  // INVOCATION_ID is systemd-scoped: user-unit children always have it, and
  // it can only leak into a shell when that shell's ANCESTOR is a user unit
  // (terminal-server etc). isOrphaned() requires our DIRECT parent to be
  // systemd, which a shell never is — so the pair is false-positive-proof.
  // JOURNAL_STREAM proved unreliable: user units don't always export it.
  if (process.env["INVOCATION_ID"] && deps.isOrphaned()) return true
  return false
}

export const isServiceMode = createIsServiceMode({
  isOrphaned: isOrphanedToInit,
})

export const createLogger = (options: CreateLoggerOptions = {}): Logger => {
  const { level, verbose = false, json = false, component } = options

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

  if (component === undefined) {
    return makeLogger(loggerOptions, wantRaw)
  }
  return makeLogger(loggerOptions, wantRaw).child({ component })
}

const makeLogger = (loggerOptions: LoggerOptions, wantRaw: boolean): Logger => {
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
          component?: unknown
          deckId?: unknown
          position?: unknown
          addonName?: unknown
          gesture?: unknown
          keyIndex?: unknown
          reason?: unknown
        }
        if (
          typeof parsed.level === "number" &&
          typeof parsed.time === "number" &&
          typeof parsed.msg === "string"
        ) {
          const levelName = levelNameFromNumber(parsed.level)
          if (levelName !== null) {
            const payload: Record<string, unknown> = {
              level: levelName,
              msg: parsed.msg,
              ts: parsed.time,
            }
            for (const key of FORWARDED_CONTEXT_FIELDS) {
              const v = parsed[key]
              if (v === undefined || v === null) continue
              if (typeof v === "string" || typeof v === "number") {
                payload[key] = v
              }
            }
            ;(process.emit as unknown as (e: string, p: unknown) => void)(
              "sireno:log",
              payload,
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
