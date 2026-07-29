import {
  computeRemaining,
  POMO_CHANNEL,
  type PomodoroButtonState,
  type PomodoroSnapshot,
} from "../shared/state"
import type { AddonGlobalServiceShape } from "../types"

interface ButtonRuntime {
  startTsMs: number
  durationSec: number
}

interface AddonServiceContextLike {
  publish: (data: unknown) => void
  poll: (id: string) => Promise<void>
  signal: AbortSignal
  executor: { run: (...args: unknown[]) => Promise<unknown> }
}

const buttons = new Map<string, ButtonRuntime>()
let ctxRef: AddonServiceContextLike | undefined

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
    register: (buttonId: unknown, durationSec: unknown): void => {
      const id = String(buttonId)
      if (typeof durationSec !== "number" || durationSec <= 0) return
      void id
    },
    start: (buttonId: unknown, durationSec: unknown): void => {
      const id = String(buttonId)
      if (typeof durationSec !== "number" || durationSec <= 0) return
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
      buttons.set(id, { startTsMs, durationSec })
      publishNow()
    },
    stop: (buttonId: unknown): void => {
      buttons.delete(String(buttonId))
      publishNow()
    },
    isFinished: (buttonId: unknown): boolean => {
      const info = buttons.get(String(buttonId))
      if (info === undefined) return false
      return computeRemaining(info.startTsMs, info.durationSec, Date.now()) <= 0
    },
  },
  onLoad: (ctx: unknown) => {
    ctxRef = ctx as AddonServiceContextLike
  },
  onUnload: (_ctx?: unknown) => {
    ctxRef = undefined
    buttons.clear()
  },
} satisfies AddonGlobalServiceShape
