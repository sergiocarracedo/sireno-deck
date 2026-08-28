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

interface AgentLike {
  sessionId: string
  providerId: string
  title: string
  status: string
  directory?: string
  cost?: number
  lastMessagePreview?: string
}

interface SnapshotLike {
  byProvider?: Record<string, AgentLike[]>
}

const STATUS_COLOR_VAR: Record<string, string> = {
  idle: "var(--sireno-color-muted)",
  running: "var(--sireno-color-success)",
  waiting: "var(--sireno-color-accent)",
  waiting_for_human: "var(--sireno-color-danger)",
  error: "var(--sireno-color-danger)",
  compacting: "var(--sireno-color-primary)",
}

const PROVIDER_LABEL: Record<string, string> = {
  opencode: "opencode",
  "claude-code": "claude",
}

// ponytail: slot tiles are static; the live agent is picked by slot index
// from the merged, active-first sorted list (see agentAtSlot). No logo
// <img> — title/status/cost on a key would push an icon out.
const agentAt = (snapshot: SnapshotLike, slot: number): AgentLike | null => {
  const all: AgentLike[] = []
  for (const list of Object.values(snapshot.byProvider ?? {})) all.push(...list)
  const ACTIVE = new Set([
    "running",
    "waiting",
    "waiting_for_human",
    "error",
    "compacting",
  ])
  const ATTENTION = new Set(["waiting_for_human", "error"])
  const rank = (s: string): number =>
    ATTENTION.has(s) ? 2 : ACTIVE.has(s) ? 1 : 0
  all.sort((x, y) => rank(y.status) - rank(x.status))
  return all[slot] ?? null
}

const formatCost = (cost: number | undefined): string | null => {
  if (typeof cost !== "number" || !Number.isFinite(cost) || cost <= 0) {
    return null
  }
  return `$${cost.toFixed(2)}`
}

const AgentFrontend = (props: AddonFrontendButtonProps<AgentConfig>) => {
  const { data } = useAddonChannel<SnapshotLike>(CHANNEL_NAME)
  const snapshot = data ?? { byProvider: {} }
  const agent = agentAt(snapshot, props.config?.slot ?? 0)
  const slot = props.config?.slot ?? 0

  const title = agent?.title ?? (slot === 0 ? "no agents" : "")
  const status = agent?.status ?? "idle"
  const dotColorVar = STATUS_COLOR_VAR[status] ?? STATUS_COLOR_VAR["idle"]!
  const provider = agent
    ? (PROVIDER_LABEL[agent.providerId] ?? agent.providerId)
    : ""
  const cost = formatCost(agent?.cost)

  return (
    <div className="flex h-full w-full flex-col justify-between p-1.5 text-[color:var(--sireno-color-foreground)]">
      <span className="line-clamp-2 text-[11px] font-medium leading-tight">
        {title || <span className="opacity-40">empty</span>}
      </span>
      <div className="flex items-center justify-between gap-1">
        <span className="text-[9px] uppercase opacity-70">
          {agent ? `${status}${provider ? ` · ${provider}` : ""}` : ""}
        </span>
        {agent?.lastMessagePreview !== undefined && (
          <span className="line-clamp-1 text-[9px] opacity-70">
            {agent.lastMessagePreview}
          </span>
        )}
        {cost !== null && <span className="text-[9px] opacity-70">{cost}</span>}
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
