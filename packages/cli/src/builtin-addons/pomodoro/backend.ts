import type { AddonGlobalService, AddonServiceContext } from "@/addon/api"

import { createPomodoroTimer, type PomodoroTimer } from "./timer"
import {
  computeRemaining,
  POMO_CHANNEL,
  type PomodoroButtonState,
  type PomodoroSnapshot,
} from "./state"

interface ButtonRuntime {
  startTsMs: number
  durationSec: number
}

const buttons = new Map<string, ButtonRuntime>()
let ctxRef: AddonServiceContext | undefined
let timer: PomodoroTimer | null = null
let lastSnapshot: PomodoroSnapshot = {}

const rebuildSnapshot = (now: number): PomodoroSnapshot => {
  const next: Record<string, PomodoroButtonState> = {}
  for (const [buttonId, info] of buttons) {
    const remaining = computeRemaining(info.startTsMs, info.durationSec, now)
    next[buttonId] = {
      status: remaining <= 0 ? "finished" : "running",
      remainingSec: remaining,
      totalSec: info.durationSec,
    }
  }
  return Object.freeze(next)
}

const publishNow = (): void => {
  if (ctxRef === undefined) return
  lastSnapshot = rebuildSnapshot(
    ctxRef.signal.aborted ? Date.now() : Date.now(),
  )
  ctxRef.publish(lastSnapshot)
}

const ensureTimer = (): PomodoroTimer | null => {
  if (timer !== null) return timer
  if (ctxRef === undefined) return null
  timer = createPomodoroTimer({
    now: () => Date.now(),
    setInterval: (fn, ms) => setInterval(fn, ms),
    clearInterval: (handle) => clearInterval(handle),
  })
  timer.start()
  return timer
}

export const globalService: AddonGlobalService = {
  pollers: [
    {
      id: "state",
      channel: POMO_CHANNEL,
      intervalMs: 1000,
      poll: () => {
        publishNow()
        return lastSnapshot
      },
    },
  ],
  methods: {
    register: (buttonId: unknown, durationSec: unknown): void => {
      const id = String(buttonId)
      if (typeof durationSec !== "number" || durationSec <= 0) return
      ensureTimer()
      ctxRef?.publish(lastSnapshot)
      void id
    },
    start: (buttonId: unknown, durationSec: unknown): void => {
      const id = String(buttonId)
      if (typeof durationSec !== "number" || durationSec <= 0) return
      ensureTimer()
      buttons.set(id, { startTsMs: Date.now(), durationSec })
      publishNow()
    },
    startWith: (
      buttonId: unknown,
      startTsMs: unknown,
      durationSec: unknown,
    ): void => {
      const id = String(buttonId)
      if (typeof durationSec !== "number" || durationSec <= 0) return
      if (typeof startTsMs !== "number") return
      ensureTimer()
      buttons.set(id, { startTsMs, durationSec })
      publishNow()
    },
    stop: (buttonId: unknown): void => {
      const id = String(buttonId)
      buttons.delete(id)
      publishNow()
    },
    isFinished: (buttonId: unknown): boolean => {
      const id = String(buttonId)
      const info = buttons.get(id)
      if (info === undefined) return false
      return computeRemaining(info.startTsMs, info.durationSec, Date.now()) <= 0
    },
  },
  onLoad: (ctx: AddonServiceContext) => {
    ctxRef = ctx
    ensureTimer()
  },
  onUnload: () => {
    timer?.stop()
    timer = null
    ctxRef = undefined
    buttons.clear()
    lastSnapshot = {}
  },
}
