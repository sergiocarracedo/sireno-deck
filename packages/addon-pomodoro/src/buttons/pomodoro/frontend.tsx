import type {
  PomodoroButtonState,
  PomodoroSnapshot,
} from "../../shared/state.js"
import { POMO_CHANNEL } from "../../shared/state.js"
import type { ConfigSchema } from "./config.js"

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
  // ponytail: the cli host injects this hook via the addon loader's
  // import-rewriting; declare a local signature so the file type-checks.
  // eslint-disable-next-line no-var
  var __pomodoroUseAddonChannel: UseAddonChannelHook | undefined
}

const useAddonChannel: UseAddonChannelHook =
  globalThis.__pomodoroUseAddonChannel ?? (() => ({ data: undefined }))

const CIRCUMFERENCE = 2 * Math.PI * 42

const formatMmSs = (sec: number): string => {
  const m = Math.floor(sec / 60)
    .toString()
    .padStart(2, "0")
  const s = Math.floor(sec % 60)
    .toString()
    .padStart(2, "0")
  return `${m}:${s}`
}

const BLINK_KEYFRAMES = `@keyframes pomodoro-blink { 0%,100% { color: #ef4444; opacity: 1 } 50% { color: #ef4444; opacity: 0.35 } } .pomodoro-blink { color: #ef4444; animation: pomodoro-blink 1s 10 }`

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
  const dashOffset = CIRCUMFERENCE * (1 - progress)
  const finished = status === "finished"

  return (
    <>
      <style>{BLINK_KEYFRAMES}</style>
      <div
        className={`flex h-full w-full items-center justify-center ${
          finished ? "pomodoro-blink" : ""
        }`}
      >
        <svg viewBox="0 0 100 100" className="h-full w-full">
          <circle
            cx="50"
            cy="50"
            r="42"
            fill="none"
            stroke="var(--color-bg)"
            strokeWidth={4}
          />
          <circle
            cx="50"
            cy="50"
            r="42"
            fill="none"
            stroke="var(--color-accent)"
            strokeWidth={4}
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={dashOffset}
            transform="rotate(-90 50 50)"
          />
          <text
            x="50"
            y="46"
            textAnchor="middle"
            fontSize="28"
            dominantBaseline="middle"
          >
            🍅
          </text>
          <text
            x="50"
            y="70"
            textAnchor="middle"
            fontSize="12"
            fill="currentColor"
            fontFamily="var(--font-mono, monospace)"
          >
            {formatMmSs(remainingSec)}
          </text>
        </svg>
      </div>
    </>
  )
}

export default PomodoroButtonFrontend
