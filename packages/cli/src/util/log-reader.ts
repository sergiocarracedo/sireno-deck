// ponytail: the CLI is the operator's interface to the daemon — not just
// a launcher. When the daemon starts, restarts, or stops, the CLI
// reads the daemon's `service.log` and surfaces any warn/error/fatal
// events inline so the operator doesn't have to grep a file. The
// daemon's pino JSON lines are easy to parse: each line is a
// self-describing object with `level` (30/40/50/60 = info/warn/error/fatal),
// `time` (ms epoch), `msg` (string), and `component` (optional).
//
// The CLI snapshots the file size at command start, then reads the
// appended bytes when it needs to surface events. Tail-like polling
// would work too, but we only need the events that accumulated during
// the operator's command — the operator can always run `p dev logs`
// for full live tail.
import { closeSync, existsSync, openSync, readSync, statSync } from "node:fs"

import { resolveDaemonPaths } from "./daemon"

export type DaemonLogLevel = "warn" | "error" | "fatal"

export interface DaemonEvent {
  readonly level: DaemonLogLevel
  readonly component: string
  readonly message: string
  readonly time: number
}

interface RawLogEntry {
  level?: unknown
  time?: unknown
  msg?: unknown
  component?: unknown
}

const LEVEL_BY_NUMBER: Record<number, DaemonLogLevel> = {
  40: "warn",
  50: "error",
  60: "fatal",
}

const isLevel = (v: unknown): v is DaemonLogLevel =>
  v === "warn" || v === "error" || v === "fatal"

const parseEntry = (line: string): DaemonEvent | null => {
  let raw: RawLogEntry
  try {
    raw = JSON.parse(line) as RawLogEntry
  } catch {
    return null
  }
  const levelNum = typeof raw.level === "number" ? raw.level : NaN
  const level = LEVEL_BY_NUMBER[levelNum]
  if (level === undefined) return null
  const message = typeof raw.msg === "string" ? raw.msg : ""
  if (message.length === 0) return null
  const component = typeof raw.component === "string" ? raw.component : ""
  const time = typeof raw.time === "number" ? raw.time : Date.now()
  return { level, component, message, time }
}

// ponytail: the only DaemonEvent surface the CLI needs for command-time
// inline output. If we ever want a structured `severity` field for
// formatting (e.g. red for error, yellow for warn), add it here.
const readRange = (logPath: string, start: number, end: number): string => {
  const fd = openSync(logPath, "r")
  try {
    const buf = Buffer.alloc(end - start)
    readSync(fd, buf, 0, buf.length, start)
    return buf.toString("utf8")
  } finally {
    closeSync(fd)
  }
}

// ponytail: same rotation-resilience as `tailFile` — if the file shrinks
// (truncated/rotated), reset the read offset to 0. We never see the
// pre-rotation content twice.
export const readDaemonEventsSince = (
  logPath: string,
  sinceBytes: number,
): DaemonEvent[] => {
  if (!existsSync(logPath)) return []
  const size = statSync(logPath).size
  if (size < sinceBytes) return [] // rotated
  if (size === sinceBytes) return []
  const text = readRange(logPath, sinceBytes, size)
  const events: DaemonEvent[] = []
  for (const raw of text.split("\n")) {
    if (raw.length === 0) continue
    const ev = parseEntry(raw)
    if (ev !== null) events.push(ev)
  }
  return events
}

// ponytail: combined "size now" + "events since then" helper. The CLI
// records the size at command start with `snapshotDaemonLog()` and
// calls this at the end to surface what accumulated.
export const readDaemonEventsFromSnapshot = (
  logPath: string,
  snapshot: { readonly sinceBytes: number },
): DaemonEvent[] => readDaemonEventsSince(logPath, snapshot.sinceBytes)

export interface DaemonLogSnapshot {
  readonly sinceBytes: number
  readonly takenAt: number
}

export const snapshotDaemonLog = (): DaemonLogSnapshot => {
  const logPath = `${resolveDaemonPaths().runtimeDir}/service.log`
  if (!existsSync(logPath)) {
    return { sinceBytes: 0, takenAt: Date.now() }
  }
  return { sinceBytes: statSync(logPath).size, takenAt: Date.now() }
}
