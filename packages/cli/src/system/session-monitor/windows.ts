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

export interface WindowsSessionDeps {
  readonly executor: CommandExecutor
  readonly logger: pino.Logger
  readonly pollIntervalMs?: number
}

const toState = (locked: boolean): SessionState =>
  locked ? "locked" : "unlocked"

const PS_GET_LOGONUI = `if (Get-Process logonui -ErrorAction SilentlyContinue) { 'true' } else { 'false' }`

const parseLockResult = (raw: string): boolean =>
  raw.trim().toLowerCase() === "true"

export const createWindowsSessionProvider = async (
  deps: WindowsSessionDeps,
): Promise<SessionProvider> => {
  const listeners = new Set<(s: SessionState) => void>()
  let state: SessionState = "unknown"
  let stopped = false
  const pollMs = deps.pollIntervalMs ?? 5_000

  const tick = async (): Promise<SessionState> => {
    try {
      const result = await deps.executor.run(
        "powershell",
        ["-NoProfile", "-Command", PS_GET_LOGONUI],
        { timeoutMs: 2_000 },
      )
      if (result.exitCode !== 0) return state
      return toState(parseLockResult(result.stdout))
    } catch (err) {
      deps.logger.debug({ err }, "session: powershell failed")
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
