import { PaginatedSurface, type PaginatedPage } from "@/ui"

import type { AddonFrontendButtonProps } from "../../types/types.js"

import type { AgentConfig } from "./config.js"
import {
  AgentContextPage,
  AgentDetailsPage,
  AgentMetricsPage,
  CurrentAgentPage,
} from "./pages.js"

const AUTO_RETURN_MS = 10_000

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
  contextTokens?: number
  contextPercent?: number
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
  waiting: "var(--sireno-variant-amber-primary, #fbbf24)",
  waiting_for_human: "var(--sireno-variant-amber-primary, #fbbf24)",
  error: "var(--sireno-color-danger)",
  compacting: "var(--sireno-color-primary)",
}

const DOT_COLOR: Record<string, string> = {
  idle: "var(--sireno-variant-default-muted, #9ca3af)",
  running: "var(--sireno-color-primary)",
  waiting: "var(--sireno-variant-amber-primary, #fbbf24)",
  waiting_for_human: "var(--sireno-variant-amber-primary, #fbbf24)",
  error: "var(--sireno-color-danger)",
  compacting: "var(--sireno-color-primary)",
}

const agentAt = (snapshot: SnapshotLike, slot: number): AgentLike | null => {
  const all: AgentLike[] = []
  for (const list of Object.values(snapshot.byProvider ?? {})) all.push(...list)
  all.sort((x, y) => (y.createdAt ?? 0) - (x.createdAt ?? 0) || 0)
  return all[slot] ?? null
}

const AgentFrontend = (props: AddonFrontendButtonProps<AgentConfig>) => {
  const { data } = useAddonChannel<SnapshotLike>(CHANNEL_NAME)
  const snapshot = data ?? { byProvider: {} }
  const slot = props.config?.slot ?? 0
  const agent = agentAt(snapshot, slot)

  const status = agent?.status ?? "idle"
  const tileColor = TILE_COLOR[status] ?? TILE_COLOR["idle"]!
  const dotColor = DOT_COLOR[status] ?? DOT_COLOR["idle"]!
  const title = agent?.title ?? (slot === 0 ? "no agents" : "")
  const iconSource = agent ? snapshot.icons?.[agent.providerId] : undefined

  // ponytail: empty slots (no live session for this tile) read as blank —
  // trailing tiles of the paginated deck stay quiet.
  if (agent === null && slot !== 0) {
    return <div className="h-full w-full" />
  }

  const pageProps = {
    title,
    sessionId: agent?.sessionId,
    directory: agent?.directory,
    lastMessagePreview: agent?.lastMessagePreview,
    status,
    iconSource,
    cost: agent?.cost,
    contextTokens: agent?.contextTokens,
    contextPercent: agent?.contextPercent,
    tileColor,
    dotColor,
  }
  const pages: PaginatedPage<typeof pageProps>[] = [
    { render: CurrentAgentPage, config: pageProps },
    { render: AgentMetricsPage, config: pageProps },
    { render: AgentContextPage, config: pageProps },
    { render: AgentDetailsPage, config: pageProps },
  ]
  return (
    <PaginatedSurface
      pages={pages}
      gesture={props.gesture}
      autoReturnMs={AUTO_RETURN_MS}
    />
  )
}

export default AgentFrontend
