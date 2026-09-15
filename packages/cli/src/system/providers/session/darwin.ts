import type pino from "pino"

import type { CommandExecutor } from "../shared"
import { type SessionProvider, type SessionState } from "../session"

export interface DarwinSessionDeps {
  readonly executor: CommandExecutor
  readonly logger: pino.Logger
  readonly pollIntervalMs?: number
}

const toState = (locked: boolean): SessionState =>
  locked ? "locked" : "unlocked"

// ponytail: this used to ask System Events whether the `loginwindow` process
// was running, which was wrong twice over. The script was a syntax error
// (`loginwindow process` instead of `process "loginwindow"`), so every tick
// exited non-zero and the state stayed "unknown" forever; and had it parsed,
// loginwindow runs for the whole login session whether or not the screen is
// locked, so it would have reported "locked" permanently.
//
// The real signal is CGSSessionScreenIsLocked in the console session
// dictionary, which `ioreg` exposes without any Accessibility grant:
// the key is present and true only while the screen is locked, and absent
// entirely when unlocked.
const IOREG_ARGS = ["-n", "Root", "-d1", "-a"] as const

const parseScreenLocked = (raw: string): boolean =>
  /<key>CGSSessionScreenIsLocked<\/key>\s*<true\/>/.test(raw)

export const createDarwinSessionProvider = async (
  deps: DarwinSessionDeps,
): Promise<SessionProvider> => {
  const listeners = new Set<(s: SessionState) => void>()
  let state: SessionState = "unknown"
  let stopped = false
  const pollMs = deps.pollIntervalMs ?? 5_000

  const tick = async (): Promise<SessionState> => {
    try {
      const result = await deps.executor.run("ioreg", [...IOREG_ARGS], {
        timeoutMs: 2_000,
      })
      if (result.exitCode !== 0) return state
      return toState(parseScreenLocked(result.stdout))
    } catch (err) {
      deps.logger.debug({ err }, "session: ioreg failed")
      return state
    }
  }

  state = await tick()
  let interval: ReturnType<typeof setInterval> | null = setInterval(() => {
    if (stopped) return
    void tick().then((s) => {
      if (stopped) return
      if (s !== state) {
        state = s
        for (const l of listeners) l(state)
      }
    })
  }, pollMs)

  return {
    getState() {
      return state
    },
    subscribe(handler) {
      listeners.add(handler)
      return () => {
        listeners.delete(handler)
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
