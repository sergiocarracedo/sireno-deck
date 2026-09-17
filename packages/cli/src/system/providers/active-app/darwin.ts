import type pino from "pino"

import type { ActiveAppProvider, ActiveAppSnapshot } from "../active-app"
import type { CommandExecutor } from "../shared"

export interface DarwinActiveAppDeps {
  readonly executor: CommandExecutor
  readonly logger: pino.Logger
  readonly pollIntervalMs?: number
}

const DEFAULT_POLL_MS = 1_000

// ponytail: the old one-liner asked for `{name, name of window 1 of ..., unix
// id of ...}` and had three separate faults. A bare `name` inside `tell
// application "System Events"` resolves to System Events ITSELF, so the app
// name was always "System Events". The result was then split on ",", so any
// window title containing a comma shifted every field. And reading `window 1`
// needs an Accessibility (TCC) grant — without it the whole script errors out,
// losing the app name and pid too, even though neither needs that permission.
//
// Now: one script, newline-delimited, with the window title in its own `try`
// so a missing Accessibility grant (or a window-less app) costs only the title.
// Name and pid are lines 1 and 2; everything after is the title, so a title
// containing the delimiter can't corrupt the fields that matter.
const APPLE_SCRIPT_GET_ACTIVE = `tell application "System Events"
  set p to first process whose frontmost is true
  set n to name of p
  set u to unix id of p
  try
    set w to name of window 1 of p
  on error
    set w to ""
  end try
  return n & linefeed & u & linefeed & w
end tell`

const parseOutput = (
  raw: string,
): { name: string; title: string; pid: number | null } | null => {
  if (raw.trim().length === 0) return null
  const lines = raw.replace(/\r\n?/g, "\n").split("\n")
  const name = (lines[0] ?? "").trim()
  if (name.length === 0) return null
  const pid = Number.parseInt((lines[1] ?? "").trim(), 10)
  const title = lines.slice(2).join("\n").trim()
  return { name, title, pid: Number.isFinite(pid) ? pid : null }
}

export const createDarwinActiveAppProvider = async (
  deps: DarwinActiveAppDeps,
): Promise<ActiveAppProvider> => {
  const pollMs = deps.pollIntervalMs ?? DEFAULT_POLL_MS
  const subscribers = new Set<(s: ActiveAppSnapshot | null) => void>()
  let last: ActiveAppSnapshot | null = null
  let stopped = false

  const snapshot = async (): Promise<ActiveAppSnapshot | null> => {
    try {
      const result = await deps.executor.run(
        "osascript",
        ["-e", APPLE_SCRIPT_GET_ACTIVE],
        {
          timeoutMs: 3_000,
        },
      )
      if (result.exitCode !== 0) return last
      const parsed = parseOutput(result.stdout)
      if (parsed === null) return last
      return {
        name: parsed.name,
        windowTitle: parsed.title || null,
        processId: parsed.pid,
      }
    } catch (err) {
      deps.logger.warn({ err }, "active-app: osascript failed")
      return last
    }
  }

  let interval: ReturnType<typeof setInterval> | null = null
  interval = setInterval(() => {
    if (stopped) return
    void snapshot().then((s) => {
      if (stopped) return
      const same =
        last !== null &&
        s !== null &&
        last.name === s.name &&
        last.windowTitle === s.windowTitle &&
        last.processId === s.processId
      if (!same) {
        last = s
        for (const h of subscribers) h(s)
      }
    })
  }, pollMs)

  return {
    async getActive() {
      return snapshot()
    },
    subscribe(handler) {
      subscribers.add(handler)
      return () => {
        subscribers.delete(handler)
      }
    },
    async stop() {
      stopped = true
      if (interval !== null) {
        clearInterval(interval)
        interval = null
      }
    },
  }
}
