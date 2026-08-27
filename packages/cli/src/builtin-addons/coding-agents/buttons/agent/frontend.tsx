import type { AddonFrontendButtonProps } from "../../types/types.js"

import type { AgentConfig } from "./config.js"

const CHANNEL_NAME = "coding-agents:agents"

declare global {
  // ponytail: see summary/frontend.tsx — host-injected channel hook,
  // looked up lazily so test environments without it still typecheck.
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
  byProvider?: Record<
    string,
    Array<{
      sessionId: string
      providerId: string
      title: string
      status: string
      lastMessagePreview?: string
    }>
  >
  attention?: string[]
}

const STATUS_COLOR_VAR: Record<string, string> = {
  idle: "var(--sireno-color-muted)",
  running: "var(--sireno-color-success)",
  waiting: "var(--sireno-color-accent)",
  waiting_for_human: "var(--sireno-color-danger)",
  error: "var(--sireno-color-danger)",
  compacting: "var(--sireno-color-primary)",
}

// ponytail: no logo <img> — a per-agent tile has three text lines and an
// icon would push the title/preview out of the key. Status dot carries
// provider identity via color; themed bg comes from the host ButtonFrame.
const findAgent = (
  snapshot: SnapshotLike,
  buttonId: string,
): {
  sessionId: string
  providerId: string
  title: string
  status: string
  lastMessagePreview?: string
} | null => {
  const [providerId, ...rest] = buttonId.split(":")
  const sessionId = rest.join(":")
  if (!providerId || !sessionId) return null
  const list = snapshot.byProvider?.[providerId] ?? []
  return list.find((a) => a.sessionId === sessionId) ?? null
}

const AgentFrontend = (props: AddonFrontendButtonProps<AgentConfig>) => {
  const { data } = useAddonChannel<SnapshotLike>(CHANNEL_NAME)
  const snapshot = data ?? { byProvider: {}, attention: [] }
  const agent = findAgent(snapshot, props.buttonId)
  const isAttention = (snapshot.attention ?? []).includes(props.buttonId)

  const title = agent?.title ?? props.config?.sessionId ?? props.buttonId
  const status = agent?.status ?? "idle"
  const dotColorVar = STATUS_COLOR_VAR[status] ?? STATUS_COLOR_VAR["idle"]!
  const ringClass = isAttention
    ? "ring-2 ring-[color:var(--sireno-color-accent)]"
    : ""

  return (
    <div
      className={`flex h-full w-full flex-col justify-between p-1.5 text-[color:var(--sireno-color-foreground)] ${ringClass}`}
    >
      <span className="line-clamp-2 text-[11px] font-medium leading-tight">
        {title}
      </span>
      <div className="flex items-center justify-between gap-1">
        <span className="text-[9px] uppercase opacity-70">{status}</span>
        {agent?.lastMessagePreview !== undefined && (
          <span className="line-clamp-1 text-[9px] opacity-70">
            {agent.lastMessagePreview}
          </span>
        )}
        <span
          className="inline-block h-2 w-2 shrink-0 rounded-full"
          style={{ backgroundColor: dotColorVar }}
          aria-label={status}
        />
      </div>
    </div>
  )
}

export default AgentFrontend
