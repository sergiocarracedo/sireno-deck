import type pino from "pino"

import {
  type ActiveAppProvider,
  type ActiveAppSnapshot,
} from "@/system/provider"

import type { CommandExecutor } from "@/system/active-app/linux"

export interface WindowsActiveAppDeps {
  readonly executor: CommandExecutor
  readonly logger: pino.Logger
  readonly pollIntervalMs?: number
}

const DEFAULT_POLL_MS = 1_000

const PS_GET_ACTIVE = `Add-Type -AssemblyName UIAutomationClient,UIAutomationTypes; $el=[System.Windows.Automation.AutomationElement]::FocusedElement; "{0}|{1}" -f $el.Current.Name, $el.Current.ProcessId`

const parseOutput = (
  raw: string,
): { name: string; pid: number | null } | null => {
  const trimmed = raw.trim()
  if (trimmed.length === 0) return null
  const idx = trimmed.lastIndexOf("|")
  if (idx < 0) return null
  const name = trimmed.substring(0, idx).trim()
  const pidStr = trimmed.substring(idx + 1).trim()
  const pid = Number.parseInt(pidStr, 10)
  if (name.length === 0) return null
  return { name, pid: Number.isFinite(pid) ? pid : null }
}

export const createWindowsActiveAppProvider = async (
  deps: WindowsActiveAppDeps,
): Promise<ActiveAppProvider> => {
  const pollMs = deps.pollIntervalMs ?? DEFAULT_POLL_MS
  const subscribers = new Set<(s: ActiveAppSnapshot | null) => void>()
  let last: ActiveAppSnapshot | null = null
  let stopped = false

  const snapshot = async (): Promise<ActiveAppSnapshot | null> => {
    try {
      const result = await deps.executor.run(
        "powershell",
        ["-NoProfile", "-Command", PS_GET_ACTIVE],
        { timeoutMs: 3_000 },
      )
      if (result.exitCode !== 0) return last
      const parsed = parseOutput(result.stdout)
      if (parsed === null) return last
      return {
        name: parsed.name,
        windowTitle: parsed.name,
        processId: parsed.pid,
      }
    } catch (err) {
      deps.logger.warn({ err }, "active-app: powershell failed")
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
