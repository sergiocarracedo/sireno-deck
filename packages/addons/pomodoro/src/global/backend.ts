import {
  computeRemaining,
  POMO_CHANNEL,
  type PomodoroButtonState,
  type PomodoroSnapshot,
} from "../shared/state.js"
import type { AddonGlobalServiceShape } from "../types.js"

interface NotificationConfig {
  title: string
  body: string
}

interface ButtonRuntime {
  startTsMs: number
  durationSec: number
  pausedRemainingSec?: number
  notified?: boolean
  notification?: NotificationConfig
}

interface AddonServiceContextLike {
  publish: (data: unknown) => void
  poll: (id: string) => Promise<void>
  signal: AbortSignal
  executor: { run: (...args: unknown[]) => Promise<unknown> }
  notify(args: { title: string; body: string; sound?: boolean }): Promise<void>
}

const buttons = new Map<string, ButtonRuntime>()
let ctxRef: AddonServiceContextLike | undefined

const rebuildSnapshot = (now: number): PomodoroSnapshot => {
  const next: Record<string, PomodoroButtonState> = {}
  for (const [buttonId, info] of buttons) {
    if (info.pausedRemainingSec !== undefined) {
      next[buttonId] = {
        status: "paused",
        remainingSec: info.pausedRemainingSec,
        totalSec: info.durationSec,
      }
      continue
    }
    const remaining = computeRemaining(info.startTsMs, info.durationSec, now)
    const isFinished = remaining <= 0
    const wasFinished = info.notified === true
    if (isFinished && !wasFinished) {
      info.notified = true
      void ctxRef?.notify({
        title: info.notification?.title ?? "Pomodoro",
        body: info.notification?.body ?? "Time's up!",
      })
    }
    next[buttonId] = {
      status: isFinished ? "finished" : "running",
      remainingSec: remaining,
      totalSec: info.durationSec,
    }
  }
  return Object.freeze(next)
}

const publishNow = (): void => {
  if (ctxRef === undefined) return
  ctxRef.publish(rebuildSnapshot(Date.now()))
}

export const globalService = {
  pollers: [
    {
      id: "state",
      channel: POMO_CHANNEL,
      intervalMs: 1000,
      poll: () => rebuildSnapshot(Date.now()),
    },
  ],
  methods: {
    register: (buttonId, durationSec, notification) => {
      const id = String(buttonId)
      if (typeof durationSec !== "number" || durationSec <= 0) return
      buttons.set(id, {
        startTsMs: Date.now(),
        durationSec,
        notification: notification
          ? {
              title: (notification as { title?: string }).title ?? "Pomodoro",
              body: (notification as { body?: string }).body ?? "Time's up!",
            }
          : undefined,
      })
    },
    start: (buttonId, durationSec, notification) => {
      const id = String(buttonId)
      if (typeof durationSec !== "number" || durationSec <= 0) return
      const existing = buttons.get(id)
      buttons.set(id, {
        startTsMs: Date.now(),
        durationSec,
        notified: existing?.notified,
        notification: notification
          ? {
              title: (notification as { title?: string }).title ?? "Pomodoro",
              body: (notification as { body?: string }).body ?? "Time's up!",
            }
          : existing?.notification,
      })
      publishNow()
    },
    startWith: (buttonId, startTsMs, durationSec, notification) => {
      const id = String(buttonId)
      if (typeof durationSec !== "number" || durationSec <= 0) return
      if (typeof startTsMs !== "number") return
      const existing = buttons.get(id)
      buttons.set(id, {
        startTsMs,
        durationSec,
        notified: existing?.notified,
        notification: notification
          ? {
              title: (notification as { title?: string }).title ?? "Pomodoro",
              body: (notification as { body?: string }).body ?? "Time's up!",
            }
          : existing?.notification,
      })
      publishNow()
    },
    pause: (buttonId) => {
      const id = String(buttonId)
      const info = buttons.get(id)
      if (info === undefined || info.pausedRemainingSec !== undefined) return
      const remaining = computeRemaining(
        info.startTsMs,
        info.durationSec,
        Date.now(),
      )
      if (remaining <= 0) return
      info.pausedRemainingSec = remaining
      publishNow()
    },
    resume: (buttonId) => {
      const id = String(buttonId)
      const info = buttons.get(id)
      if (info === undefined || info.pausedRemainingSec === undefined) return
      const remaining = info.pausedRemainingSec
      delete info.pausedRemainingSec
      info.startTsMs = Date.now() - (info.durationSec - remaining) * 1000
      publishNow()
    },
    stop: (buttonId) => {
      buttons.delete(String(buttonId))
      publishNow()
    },
    isFinished: (buttonId) => {
      const info = buttons.get(String(buttonId))
      if (info === undefined) return false
      if (info.pausedRemainingSec !== undefined) return false
      return computeRemaining(info.startTsMs, info.durationSec, Date.now()) <= 0
    },
  } as Record<string, (...args: unknown[]) => unknown>,
  onLoad: (ctx: unknown) => {
    ctxRef = ctx as AddonServiceContextLike
  },
  onUnload: (_ctx?: unknown) => {
    ctxRef = undefined
    buttons.clear()
  },
} satisfies AddonGlobalServiceShape
