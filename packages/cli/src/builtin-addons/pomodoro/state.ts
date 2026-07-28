export type PomodoroStatus = "idle" | "running" | "finished"

export interface PomodoroButtonState {
  readonly status: PomodoroStatus
  readonly remainingSec: number
  readonly totalSec: number
}

export type PomodoroSnapshot = Readonly<Record<string, PomodoroButtonState>>

export const POMO_CHANNEL = "pomodoro:state"

export const EMPTY_SNAPSHOT: PomodoroSnapshot = Object.freeze({})

export const idleState = (totalSec: number): PomodoroButtonState => ({
  status: "idle",
  remainingSec: totalSec,
  totalSec,
})

export const computeRemaining = (
  startTsMs: number,
  durationSec: number,
  now: number,
): number =>
  Math.max(0, Math.ceil((startTsMs + durationSec * 1000 - now) / 1000))
