import type pino from "pino"

import { type SessionProvider, type SessionState } from "@/system/provider"

export interface CommandExecutor {
  run(
    command: string,
    args: ReadonlyArray<string>,
    options?: { timeoutMs?: number },
  ): Promise<{
    exitCode: number
    stdout: string
    stderr: string
  }>
}

export interface DarwinSessionDeps {
  readonly executor: CommandExecutor
  readonly logger: pino.Logger
  readonly pollIntervalMs?: number
}

const toState = (locked: boolean): SessionState =>
  locked ? "locked" : "unlocked"

const OSASCRIPT_LOGINWINDOW = `tell application "System Events" to get running of loginwindow process`

const parseLoginWindowResult = (raw: string): boolean => {
  const trimmed = raw.trim().toLowerCase()
  return trimmed === "true"
}

export const createDarwinSessionProvider = async (
  deps: DarwinSessionDeps,
): Promise<SessionProvider> => {
  const listeners = new Set<(s: SessionState) => void>()
  let state: SessionState = "unknown"
  let stopped = false
  const pollMs = deps.pollIntervalMs ?? 5_000

  const tick = async (): Promise<SessionState> => {
    try {
      const result = await deps.executor.run(
        "osascript",
        ["-e", OSASCRIPT_LOGINWINDOW],
        {
          timeoutMs: 2_000,
        },
      )
      if (result.exitCode !== 0) return state
      return toState(parseLoginWindowResult(result.stdout))
    } catch (err) {
      deps.logger.debug({ err }, "session: osascript failed")
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
