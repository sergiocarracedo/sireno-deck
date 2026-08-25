import { Label } from "@/ui/primitives/Label"

import type { PomodoroButtonState, PomodoroSnapshot } from "../../shared/state"
import { POMO_CHANNEL } from "../../shared/state"
import type { ConfigSchema } from "./config"

interface FrontendButtonProps<Config> {
  readonly config: Config
  readonly state: unknown
  readonly addonName: string
  readonly buttonType: string
  readonly buttonId: string
  readonly gesture: unknown
}

type UseAddonChannelHook = <T>(channel: string) => { data: T | undefined }

declare global {
  // ponytail: the cli host injects this hook via Deck.tsx so the addon's
  // frontend can subscribe to channels without importing from the host
  // package at runtime. Falls back to a no-op so typecheck/build pass when
  // the global is missing (e.g. unit tests, Storybook).
  // eslint-disable-next-line no-var
  var __pomodoroUseAddonChannel: UseAddonChannelHook | undefined
}

// ponytail: look up the global on each call. The addon's frontend.js
// evaluates before Deck.tsx runs its module-scope assignment, so a
// captured-at-module-load reference would lock in the no-op fallback
// forever. Lazy lookup guarantees the host's hook is used whenever it
// has been set by the time React renders.
const useAddonChannel = <T,>(channel: string): { data: T | undefined } => {
  const hook = globalThis.__pomodoroUseAddonChannel
  return hook ? hook<T>(channel) : { data: undefined }
}

const CIRCUMFERENCE = 2 * Math.PI * 46

const formatMmSs = (sec: number): string => {
  const m = Math.floor(sec / 60)
    .toString()
    .padStart(2, "0")
  const s = Math.floor(sec % 60)
    .toString()
    .padStart(2, "0")
  return `${m}:${s}`
}

const BLINK_KEYFRAMES = `@keyframes pomodoro-blink { 0%,100% { color: var(--sireno-color-danger); opacity: 1 } 50% { color: var(--sireno-color-danger); opacity: 0.35 } } .pomodoro-blink { color: var(--sireno-color-danger); animation: pomodoro-blink 1s 10 }`

const PomodoroButtonFrontend = (props: FrontendButtonProps<ConfigSchema>) => {
  const { data } = useAddonChannel<PomodoroSnapshot>(POMO_CHANNEL)
  const snapshot = data ?? ({} as PomodoroSnapshot)
  const state: PomodoroButtonState | undefined = snapshot[props.buttonId]
  const totalSec = state?.totalSec ?? props.config?.durationSec ?? 1500
  const status = state?.status ?? "idle"
  const remainingSec = state?.remainingSec ?? totalSec
  const progress =
    totalSec <= 0
      ? 0
      : Math.max(0, Math.min(1, (totalSec - remainingSec) / totalSec))
  // ponytail: two-tone ring — muted track for the full circle (remaining),
  // accent arc on top for the consumed portion (elapsed). The accent arc
  // grows clockwise from 12 o'clock as time passes, leaving the muted
  // track to represent what's left.
  const accentDashOffset = CIRCUMFERENCE * (1 - progress)
  const finished = status === "finished"
  const paused = status === "paused"

  return (
    <>
      <style>{BLINK_KEYFRAMES}</style>
      <div
        className={`relative flex h-full w-full items-center justify-center ${
          finished ? "pomodoro-blink" : ""
        }
        `}
      >
        <svg viewBox="0 0 100 100" className="h-full w-full">
          {/* ponytail: light track = remaining time. Rendered first so the
              accent arc paints on top. */}
          <circle
            cx="50"
            cy="50"
            r="46"
            fill="none"
            stroke="currentColor"
            strokeOpacity={0.25}
            strokeWidth={4}
            className="text-muted"
          />
          {/* ponytail: darker arc = elapsed time. dashOffset shrinks from
              full circumference to 0 as progress goes 0 → 1. */}
          <circle
            cx="50"
            cy="50"
            r="46"
            fill="none"
            stroke="currentColor"
            strokeWidth={4}
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={accentDashOffset}
            transform="rotate(-90 50 50)"
            className="text-accent"
          />
          <foreignObject
            x="10"
            y="22"
            width="80"
            height="56"
            className="overflow-visible"
          >
            <div className="flex h-full w-full flex-col items-center justify-center gap-0.5 leading-none">
              <span
                className="inline-block shrink-0 leading-none"
                style={{ fontSize: 20 }}
              >
                🍅
              </span>
              <Label
                text={formatMmSs(remainingSec)}
                variant="primary"
                lines={2}
                className="text-2xl"
              />
            </div>
          </foreignObject>
        </svg>
        {paused && (
          <svg
            viewBox="0 0 24 24"
            className="pointer-events-none absolute left-1/2 top-[34%] -translate-x-1/2 -translate-y-1/2 h-4 w-4"
            fill="currentColor"
            aria-label="paused"
          >
            <rect x="6" y="4" width="4" height="16" rx="1" />
            <rect x="14" y="4" width="4" height="16" rx="1" />
          </svg>
        )}
      </div>
    </>
  )
}

export default PomodoroButtonFrontend
