export type PomodoroStatus = "idle" | "running" | "paused" | "finished"

export interface PomodoroButtonState {
  readonly status: PomodoroStatus
  readonly remainingSec: number
  readonly totalSec: number
}

export type PomodoroSnapshot = Readonly<Record<string, PomodoroButtonState>>

export const POMO_CHANNEL = "pomodoro:state"

export const computeRemaining = (
  startTsMs: number,
  durationSec: number,
  now: number,
): number =>
  Math.max(0, Math.ceil((startTsMs + durationSec * 1000 - now) / 1000))
