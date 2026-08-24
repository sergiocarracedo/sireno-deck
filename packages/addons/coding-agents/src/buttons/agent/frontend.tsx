import type { AddonFrontendButtonProps } from "../../types/types"

import type { AgentConfig } from "./config"

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

const STATUS_COLOR: Record<string, string> = {
  idle: "bg-slate-500",
  running: "bg-emerald-500",
  waiting: "bg-amber-500",
  waiting_for_human: "bg-yellow-400",
  error: "bg-red-500",
  compacting: "bg-blue-500",
}

const LOGO_FOR: Record<string, string> = {
  opencode: "addon://coding-agents/assets/opencode-dark-square.svg",
  "claude-code": "addon://coding-agents/assets/claude-code.svg",
}

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

  const providerId = agent?.providerId ?? props.config?.providerId ?? "opencode"
  const logo = LOGO_FOR[providerId] ?? LOGO_FOR["opencode"]!
  const title = agent?.title ?? props.config?.sessionId ?? props.buttonId
  const status = agent?.status ?? "idle"
  const dotClass = STATUS_COLOR[status] ?? STATUS_COLOR["idle"]!
  const ringClass = isAttention ? "ring-2 ring-yellow-400" : ""

  return (
    <div
      className={`flex h-full w-full flex-col justify-between bg-slate-900 p-2 ${ringClass}`}
    >
      <div className="flex items-start gap-1.5">
        <img src={logo} alt={providerId} className="h-3.5 w-3.5 shrink-0" />
        <span
          className="line-clamp-2 text-[11px] font-medium leading-tight text-slate-100"
          style={{
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {title}
        </span>
      </div>
      <div className="flex items-center justify-between gap-1">
        <span
          className={`inline-block h-2 w-2 rounded-full ${dotClass}`}
          aria-label={status}
        />
        {agent?.lastMessagePreview !== undefined && (
          <span className="line-clamp-1 text-[9px] text-slate-400">
            {agent.lastMessagePreview}
          </span>
        )}
      </div>
    </div>
  )
}

export default AgentFrontend
