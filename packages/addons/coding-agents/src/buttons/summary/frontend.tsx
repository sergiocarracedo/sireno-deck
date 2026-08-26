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

// ponytail: no <img> here — the host's ButtonFrame supplies the themed
// bg/border (adding our own frame or image broke layout and double-framed).
// Colors come from theme CSS vars via the cascade.
const SummaryFrontend = (props: AddonFrontendButtonProps<SummaryConfig>) => {
  const { data } = useAddonChannel<SnapshotLike>(CHANNEL_NAME)
  const snapshot = data ?? { byProvider: {}, attention: [] }
  const all = Object.values(snapshot.byProvider ?? {}).flat()
  const attention = snapshot.attention ?? []
  const showCount = props.config?.showCount ?? true
  const attentionOnly = props.config?.attentionOnly ?? false
  // ponytail: tile counts LIVE open instances across providers (user spec:
  // multiple opencode instances open must not read as 0).
  const liveCount = attention.length > 0 ? attention.length : all.length

  if (attentionOnly && attention.length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <span className="text-xs opacity-40">no agents</span>
      </div>
    )
  }

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-1 p-1 text-[color:var(--sireno-color-foreground)]">
      <span className="text-sm font-bold leading-tight">Agents</span>
      {showCount && (
        <span
          className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
          style={{
            backgroundColor:
              attention.length > 0
                ? "var(--sireno-color-danger)"
                : liveCount > 0
                  ? "var(--sireno-color-success)"
                  : "var(--sireno-color-muted)",
            color: "var(--sireno-color-foreground-contrast)",
          }}
        >
          {attention.length > 0
            ? `${attention.length} attention`
            : `${liveCount} ${liveCount === 1 ? "instance" : "instances"}`}
        </span>
      )}
    </div>
  )
}

export default SummaryFrontend
