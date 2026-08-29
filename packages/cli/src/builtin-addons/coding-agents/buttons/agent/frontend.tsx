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

// ponytail: solid status color underlay at fixed opacity — unlike color-mix
// it's universally supported (emulator + headless hardware screenshots).
// idle stays transparent so stale sessions read as quiet.
const TILE_COLOR: Record<string, string> = {
  idle: "transparent",
  running: "var(--sireno-color-success)",
  waiting: "var(--sireno-color-accent)",
  waiting_for_human: "var(--sireno-color-danger)",
  error: "var(--sireno-color-danger)",
  compacting: "var(--sireno-color-primary)",
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
  const tileColor = TILE_COLOR[status] ?? TILE_COLOR["idle"]!
  const dotColorVar = DOT_COLOR[status] ?? DOT_COLOR["idle"]!
  const title = agent?.title ?? (slot === 0 ? "no agents" : "")
  const iconSource = agent ? snapshot.icons?.[agent.providerId] : undefined
  const cost = formatCost(agent?.cost)

  // ponytail: empty slots (no live session for this tile) read as blank —
  // trailing tiles of the paginated deck stay quiet.
  if (agent === null && slot !== 0) {
    return <div className="h-full w-full" />
  }

  return (
    <div className="relative flex h-full w-full flex-col justify-between p-1">
      {tileColor !== "transparent" && (
        <div
          className="pointer-events-none absolute inset-0 rounded-xl"
          style={{ backgroundColor: tileColor, opacity: 0.32 }}
        />
      )}
      <div className="relative flex items-start gap-1.5">
        {iconSource !== undefined ? (
          <Icon source={iconSource} size={14} />
        ) : (
          <span
            className="mt-[2px] inline-block h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: dotColorVar }}
            aria-label={status}
          />
        )}
        <span className="line-clamp-2 text-[13px] font-semibold leading-snug">
          {title || <span className="opacity-40">empty</span>}
        </span>
      </div>
      <div className="relative flex items-center justify-between gap-1">
        <span className="text-[10px] font-medium uppercase opacity-80">
          {status}
        </span>
        {cost !== null && (
          <span className="text-[10px] font-medium opacity-80">{cost}</span>
        )}
      </div>
    </div>
  )
}

export default AgentFrontend
