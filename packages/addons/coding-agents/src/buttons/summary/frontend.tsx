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

const STATUS_COLORS: Record<string, string> = {
  idle: "bg-slate-500",
  running: "bg-emerald-500",
  waiting: "bg-amber-500",
  waiting_for_human: "bg-yellow-400",
  error: "bg-red-500",
  compacting: "bg-blue-500",
}

interface SnapshotLike {
  byProvider?: Record<string, Array<{ status: string }>>
  attention?: string[]
}

const SummaryFrontend = (props: AddonFrontendButtonProps<SummaryConfig>) => {
  const { data } = useAddonChannel<SnapshotLike>(CHANNEL_NAME)
  const snapshot = data ?? { byProvider: {}, attention: [] }
  const all = Object.values(snapshot.byProvider ?? {}).flat()
  const attention = snapshot.attention ?? []
  const showCount = props.config?.showCount ?? true
  const attentionOnly = props.config?.attentionOnly ?? false

  if (attentionOnly && attention.length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-slate-900">
        <img
          src="addon://coding-agents/assets/opencode-dark-square.svg"
          alt="Coding agents"
          className="h-2/3 w-2/3 opacity-30"
        />
      </div>
    )
  }

  const dotColor =
    attention.length > 0
      ? STATUS_COLORS["waiting_for_human"]
      : all.some((a) => a.status === "error")
        ? STATUS_COLORS["error"]
        : all.some((a) => a.status === "running" || a.status === "waiting")
          ? STATUS_COLORS["running"]
          : all.length > 0
            ? STATUS_COLORS["idle"]
            : "bg-slate-700"

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-1 bg-slate-900 p-2">
      <img
        src="addon://coding-agents/assets/opencode-dark-square.svg"
        alt="Coding agents"
        className="h-10 w-10"
      />
      <span className="text-xs font-semibold text-slate-100">Agents</span>
      {showCount && (
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] text-white ${dotColor}`}
        >
          {attention.length > 0
            ? `${attention.length} attention`
            : `${all.length} active`}
        </span>
      )}
    </div>
  )
}

export default SummaryFrontend
