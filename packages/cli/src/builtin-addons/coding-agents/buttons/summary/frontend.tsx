import { useEffect, useRef, useState } from "react"

import type { AddonFrontendButtonProps } from "../../types/types.js"

import type { SummaryConfig } from "./config.js"

const CHANNEL_NAME = "coding-agents:agents"

declare global {
  // ponytail: pomodoro uses the same host-injection pattern for
  // `useAddonChannel`. The host injects the hook via Deck.tsx module-scope
  // assignment; we look it up lazily so the global may be undefined
  // during tests / Storybook without crashing.
  // eslint-disable-next-line no-var
  var __codingAgentsUseAddonChannel:
    | (<T>(channel: string) => { data: T | undefined })
    | undefined
}

const useAddonChannel = <T,>(channel: string): { data: T | undefined } => {
  const hook = globalThis.__codingAgentsUseAddonChannel
  return hook ? hook<T>(channel) : { data: undefined }
}

interface SnapshotLike {
  byProvider?: Record<string, Array<{ status: string }>>
  attention?: string[]
}

// ponytail: inline keyframes — Tailwind's utility classes cover layout but
// not a custom pulse. Defined once, referenced via `animation`.
const BLINK_CSS =
  "@keyframes sirenoCaBlink{0%,100%{background-color:transparent}50%{background-color:var(--sireno-color-accent)}}"

// ponytail: matrix rain is pure CSS — strips translate down the column on
// the compositor (no JS loop), and the character/geometry values are fixed at
// module load, so the 500ms channel re-renders can neither restart nor
// re-randomize the animation. Negative delays start every strip mid-fall.
const RAIN_CHARS = "ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾗﾘﾙﾚﾛﾜ0123456789"

interface RainColumn {
  left: number
  durationMs: number
  delayMs: number
  fontSize: number
  chars: string
}

const randomRainChars = (count: number): string => {
  let out = ""
  for (let i = 0; i < count; i++) {
    out += RAIN_CHARS[Math.floor(Math.random() * RAIN_CHARS.length)]
  }
  return out
}

const buildRainColumns = (count: number): RainColumn[] =>
  Array.from({ length: count }, (_, i) => {
    const durationMs = 3200 + Math.random() * 2400
    return {
      left: (i / count) * 100 + Math.random() * (100 / count) * 0.6,
      durationMs,
      delayMs: -Math.random() * durationMs,
      fontSize: 9 + Math.random() * 3,
      chars: randomRainChars(8 + i + Math.floor(Math.random() * 5)),
    }
  })

// ponytail: fixed once per page load — every deck instance renders the same
// rain so nothing re-rolls on re-render.
const RAIN_COLUMNS = buildRainColumns(8)

const RAIN_CSS = [
  "@keyframes sirenoCaFall{from{transform:translateY(-100%)}to{transform:translateY(100%)}}",
  ".sirenoCaRain{position:absolute;inset:0;overflow:hidden;pointer-events:none;opacity:0.55;color:color-mix(in oklab,var(--sireno-frame-border,var(--sireno-color-accent)) 30%,transparent)}",
  ".sirenoCaRainSt{position:absolute;top:0;width:1.5ch;display:flex;flex-direction:column;align-items:center;line-height:1;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;will-change:transform;animation:sirenoCaFall linear infinite}",
  "@media (prefers-reduced-motion:reduce){.sirenoCaRainSt{animation:none}}",
].join("")

const MatrixRain = () => (
  <div aria-hidden className="sirenoCaRain">
    {RAIN_COLUMNS.flatMap((col, i) => {
      const strip = (delayMs: number, key: string) => (
        <div
          key={key}
          style={{
            left: `${col.left}%`,
            fontSize: col.fontSize,
            animationDuration: `${col.durationMs}ms`,
            animationDelay: `${delayMs}ms`,
          }}
          className="sirenoCaRainSt"
        >
          {col.chars}
        </div>
      )
      return [
        strip(col.delayMs, `${i}-a`),
        strip(col.delayMs - col.durationMs / 2, `${i}-b`),
      ]
    })}
  </div>
)

const SummaryFrontend = (props: AddonFrontendButtonProps<SummaryConfig>) => {
  const { data } = useAddonChannel<SnapshotLike>(CHANNEL_NAME)
  const snapshot = data ?? { byProvider: {}, attention: [] }
  const all = Object.values(snapshot.byProvider ?? {}).flat()
  const attention = snapshot.attention ?? []

  const count = (s: string): number => all.filter((a) => a.status === s).length

  const showCount = props.config?.showCount ?? true
  const attentionOnly = props.config?.attentionOnly ?? false
  const fallingLetters = props.config?.fallingLetters !== false
  const hasSessions = all.length > 0

  // ponytail: statuses with a count render as a colored ball + number row.
  // Danger covers both waiting_for_human and error; accent for stalled/waiting;
  // success for running. Only non-zero statuses are shown.
  const balls: Array<{ color: string; count: number }> = [
    {
      color: "var(--sireno-color-danger)",
      count: count("waiting_for_human") + count("error"),
    },
    { color: "var(--sireno-color-accent)", count: count("waiting") },
    { color: "var(--sireno-color-success)", count: count("running") },
  ].filter((b) => b.count > 0)

  // --- blink on change ---------------------------------------------------
  // Blink the tile background when an agent enters attention (waiting/error)
  // or when a running agent finishes (running -> idle). Restart via key.
  const prevRef = useRef<{ attention: Set<string>; running: Set<string> }>({
    attention: new Set(),
    running: new Set(),
  })
  const [blinkKey, setBlinkKey] = useState(0)

  useEffect(() => {
    const keys = (s: string): Set<string> => {
      const out = new Set<string>()
      const byStatus = new Map<string, Set<string>>()
      for (const [provider, list] of Object.entries(
        snapshot.byProvider ?? {},
      )) {
        for (const a of list) {
          const set = byStatus.get(a.status) ?? new Set<string>()
          set.add(
            `${provider}:${(a as { sessionId?: string }).sessionId ?? ""}`,
          )
          byStatus.set(a.status, set)
        }
      }
      return byStatus.get(s) ?? out
    }

    const prev = prevRef.current
    const nAtt = keys("waiting_for_human")
    const nErr = keys("error")
    const nRun = keys("running")
    const newAttention = new Set([...nAtt, ...nErr])

    const enteredAttention = [...newAttention].some(
      (k) => !prev.attention.has(k),
    )
    const finished = [...prev.running].some(
      (k) => !nRun.has(k) && !newAttention.has(k),
    )

    prevRef.current = { attention: newAttention, running: nRun }

    if (enteredAttention || finished) {
      setBlinkKey((k) => k + 1)
    }
  }, [data]) // eslint-disable-line react-hooks/exhaustive-deps

  if (attentionOnly && attention.length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <span className="text-xs opacity-40">no agents</span>
      </div>
    )
  }

  return (
    <div
      key={blinkKey}
      className="relative flex h-full w-full flex-col items-center justify-center gap-1 p-1 text-[color:var(--sireno-color-foreground)]"
      style={{
        animation: blinkKey > 0 ? "sirenoCaBlink 0.35s ease 3" : undefined,
      }}
    >
      <style>{BLINK_CSS}</style>
      <style>{RAIN_CSS}</style>
      {fallingLetters && <MatrixRain />}
      <div className="relative flex h-full w-full flex-col items-center justify-center gap-1">
        <span className="text-sm font-bold leading-tight">Agents</span>
        {showCount &&
          (balls.length > 0 ? (
            <div className="flex flex-col gap-0.5">
              {balls.map((b, i) => (
                <div key={i} className="flex items-center gap-1 leading-none">
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: b.color }}
                  />
                  <span className="text-[11px] font-semibold tabular-nums">
                    {b.count}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <span className="text-[10px] opacity-50">
              {hasSessions ? "0 active" : "no agents"}
            </span>
          ))}
      </div>
    </div>
  )
}

export default SummaryFrontend
