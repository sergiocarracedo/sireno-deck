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
  running: "var(--sireno-color-primary)",
  waiting: "var(--sireno-color-accent)",
  waiting_for_human: "var(--sireno-color-danger)",
  error: "var(--sireno-color-danger)",
  compacting: "var(--sireno-color-primary)",
}

const DOT_COLOR: Record<string, string> = {
  idle: "var(--sireno-color-muted)",
  running: "var(--sireno-color-primary)",
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
      <div className="relative grid min-w-0 flex-1 grid-cols-[auto_minmax(0,1fr)] grid-rows-[1fr_auto] items-center gap-x-1 py-1">
        {iconSource !== undefined ? (
          <span className="row-span-2">
            <Icon source={iconSource} size={18} />
          </span>
        ) : (
          <span
            className="row-span-2 inline-block h-3 w-3 shrink-0 rounded-full"
            style={{ backgroundColor: dotColorVar }}
            aria-label={status}
          />
        )}
        <span className="min-w-0 truncate text-sm font-semibold leading-tight">
          {title || <span className="opacity-40">empty</span>}
        </span>
        <span className="min-w-0 truncate text-[10px] font-medium uppercase opacity-80">
          {status}
          {cost !== null && ` ${cost}`}
        </span>
      </div>
    </div>
  )
}

export default AgentFrontend
