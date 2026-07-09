import type pino from "pino"

import {
  type ActiveAppProvider,
  type ActiveAppSnapshot,
} from "@/system/provider"

import type { CommandExecutor } from "@/system/active-app/linux"

export interface DarwinActiveAppDeps {
  readonly executor: CommandExecutor
  readonly logger: pino.Logger
  readonly pollIntervalMs?: number
}

const DEFAULT_POLL_MS = 1_000

const APPLE_SCRIPT_GET_ACTIVE = `tell application "System Events" to get {name, name of window 1 of (first process whose frontmost is true), unix id of (first process whose frontmost is true)}`

const parseOutput = (
  raw: string,
): { name: string; title: string; pid: number | null } | null => {
  const trimmed = raw.trim()
  if (trimmed.length === 0) return null
  const parts = trimmed.split(",").map((s) => s.trim())
  if (parts.length < 3) return null
  const name = parts[0] ?? ""
  const title = parts[1] ?? ""
  const pidRaw = parts[2] ?? ""
  const pid = Number.parseInt(pidRaw, 10)
  if (name.length === 0) return null
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
