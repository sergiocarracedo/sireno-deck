import { Icon } from "@sirenodeck/cli"

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
  createdAt?: number
  lastMessagePreview?: string
}

interface SnapshotLike {
  byProvider?: Record<string, AgentLike[]>
  icons?: Record<string, string>
}

// ponytail: color-mix tints the tile by state using theme tokens; `idle`
// stays transparent so stale sessions read as quiet.
const tint = (c: string): string =>
  `color-mix(in srgb, var(--sireno-color-${c}) 18%, transparent)`

const TILE_BG: Record<string, string> = {
  idle: "transparent",
  running: tint("success"),
  waiting: tint("accent"),
  waiting_for_human: tint("danger"),
  error: tint("danger"),
  compacting: tint("primary"),
}

const DOT_COLOR: Record<string, string> = {
  idle: "var(--sireno-color-muted)",
  running: "var(--sireno-color-success)",
  waiting: "var(--sireno-color-accent)",
  waiting_for_human: "var(--sireno-color-danger)",
  error: "var(--sireno-color-danger)",
  compacting: "var(--sireno-color-primary)",
}

const agentAt = (snapshot: SnapshotLike, slot: number): AgentLike | null => {
  const all: AgentLike[] = []
  for (const list of Object.values(snapshot.byProvider ?? {})) all.push(...list)
  all.sort((x, y) => (y.createdAt ?? 0) - (x.createdAt ?? 0) || 0)
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
  const slot = props.config?.slot ?? 0
  const agent = agentAt(snapshot, slot)

  const status = agent?.status ?? "idle"
  const bgVar = TILE_BG[status] ?? TILE_BG["idle"]!
  const dotColorVar = DOT_COLOR[status] ?? DOT_COLOR["idle"]!
  const title = agent?.title ?? (slot === 0 ? "no agents" : "")
  const iconSource = agent ? snapshot.icons?.[agent.providerId] : undefined
  const cost = formatCost(agent?.cost)

  // ponytail: empty slots (no live session for this tile) read as blank —
  // trailing pages of the paginated deck stay quiet.
  if (agent === null && slot !== 0) {
    return <div className="h-full w-full" />
  }

  return (
    <div
      className="flex h-full w-full flex-col justify-between p-1"
      style={{ background: bgVar }}
    >
      <div className="flex items-start gap-1">
        {iconSource !== undefined ? (
          <Icon source={iconSource} size={12} />
        ) : (
          <span
            className="mt-[1px] inline-block h-2 w-2 shrink-0 rounded-full opacity-70"
            style={{ backgroundColor: dotColorVar }}
            aria-label={status}
          />
        )}
        <span className="line-clamp-2 text-[11px] font-medium leading-tight">
          {title || <span className="opacity-40">empty</span>}
        </span>
      </div>
      <div className="flex items-center justify-between gap-1">
        <span className="text-[9px] uppercase opacity-70">{status}</span>
        {agent?.lastMessagePreview !== undefined && (
          <span className="line-clamp-1 text-[9px] opacity-70">
            {agent.lastMessagePreview}
          </span>
        )}
        {cost !== null && <span className="text-[9px] opacity-70">{cost}</span>}
      </div>
    </div>
  )
}

export default AgentFrontend
