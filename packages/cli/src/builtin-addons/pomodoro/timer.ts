import {
  computeRemaining,
  type PomodoroButtonState,
  type PomodoroSnapshot,
  type PomodoroStatus,
} from "./state"

export interface PomodoroTimerOptions {
  readonly now: () => number
  readonly setInterval: (fn: () => void, ms: number) => NodeJS.Timeout
  readonly clearInterval: (handle: NodeJS.Timeout) => void
}

export interface PomodoroTimer {
  readonly start: () => void
  readonly stop: () => void
  readonly setSnapshot: (next: PomodoroSnapshot) => void
  readonly getSnapshot: () => PomodoroSnapshot
}

interface ActiveButton {
  readonly buttonId: string
  readonly startTsMs: number
  readonly totalSec: number
}

export const createPomodoroTimer = (
  options: PomodoroTimerOptions,
): PomodoroTimer => {
  let handle: NodeJS.Timeout | null = null
  let snapshot: PomodoroSnapshot = {}
  const active = new Map<string, ActiveButton>()

  const recomputeSnapshot = (): void => {
    const now = options.now()
    const next: Record<string, PomodoroButtonState> = {}
    let changed = false
    for (const [buttonId, info] of active) {
      const remaining = computeRemaining(info.startTsMs, info.totalSec, now)
      const status: PomodoroStatus = remaining <= 0 ? "finished" : "running"
      next[buttonId] = {
        status,
        remainingSec: remaining,
        totalSec: info.totalSec,
      }
      if (status === "finished" && remaining === 0) {
        // ponytail: keep the entry until the user taps reset, so the blink
        // CSS keeps firing for 10 s before the wrapper state goes static.
        changed = true
      }
    }
    snapshot = Object.freeze(next)
    void changed
  }

  const tick = (): void => {
    recomputeSnapshot()
  }

  return {
    start() {
      if (handle !== null) return
      handle = options.setInterval(tick, 1000)
    },
    stop() {
      if (handle !== null) {
        options.clearInterval(handle)
        handle = null
      }
      active.clear()
      snapshot = {}
    },
    setSnapshot(next) {
      const now = options.now()
      active.clear()
      const map: Record<string, PomodoroButtonState> = {}
      for (const [buttonId, info] of Object.entries(next)) {
        map[buttonId] = info
        if (info.status === "running") {
          active.set(buttonId, {
            buttonId,
            startTsMs: now - (info.totalSec - info.remainingSec) * 1000,
            totalSec: info.totalSec,
          })
        }
      }
      snapshot = Object.freeze(map)
    },
    getSnapshot() {
      return snapshot
    },
  }
}
