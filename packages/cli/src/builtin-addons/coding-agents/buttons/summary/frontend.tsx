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

const SummaryFrontend = (props: AddonFrontendButtonProps<SummaryConfig>) => {
  const { data } = useAddonChannel<SnapshotLike>(CHANNEL_NAME)
  const snapshot = data ?? { byProvider: {}, attention: [] }
  const all = Object.values(snapshot.byProvider ?? {}).flat()
  const attention = snapshot.attention ?? []

  const count = (s: string): number => all.filter((a) => a.status === s).length
  const waiting = count("waiting_for_human")
  const errors = count("error")
  const running = count("running")
  const active =
    waiting + errors + running + count("waiting") + count("compacting")

  const showCount = props.config?.showCount ?? true
  const attentionOnly = props.config?.attentionOnly ?? false
  const liveCount = attention.length > 0 ? attention.length : all.length

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

  const detail = [waiting, errors, running]
    .map((n, i) => (n > 0 ? `${["wait", "err", "run"][i]} ${n}` : ""))
    .filter(Boolean)
    .join(" · ")

  return (
    <div
      key={blinkKey}
      className="flex h-full w-full flex-col items-center justify-center gap-1 p-1 text-[color:var(--sireno-color-foreground)]"
      style={{
        animation: blinkKey > 0 ? "sirenoCaBlink 0.35s ease 3" : undefined,
      }}
    >
      <style>{BLINK_CSS}</style>
      <span className="text-sm font-bold leading-tight">Agents</span>
      {showCount && (
        <span
          className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
          style={{
            backgroundColor:
              attention.length > 0
                ? "var(--sireno-color-danger)"
                : active > 0
                  ? "var(--sireno-color-success)"
                  : "var(--sireno-color-muted)",
            color: "var(--sireno-color-foreground-contrast)",
          }}
        >
          {attention.length > 0
            ? `${attention.length} ${attention.length === 1 ? "wait" : "waiting"}`
            : `${liveCount} live`}
        </span>
      )}
      {detail.length > 0 && (
        <span className="text-[9px] leading-tight opacity-80">{detail}</span>
      )}
      {liveCount === 0 && (
        <span className="text-[9px] leading-tight opacity-50">no agents</span>
      )}
    </div>
  )
}

export default SummaryFrontend
