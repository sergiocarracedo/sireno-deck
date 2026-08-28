import {
  agentKey,
  type Agent,
  type AgentStatus,
  type AgentsSnapshot,
  type ProviderId,
} from "./state.js"

export const mergeSnapshot = (
  prev: AgentsSnapshot,
  providers: Readonly<Record<ProviderId, readonly Agent[]>>,
): AgentsSnapshot => {
  const merged: Record<ProviderId, Agent[]> = {
    opencode: [...prev.byProvider["opencode"]],
    "claude-code": [...prev.byProvider["claude-code"]],
  }
  const seen = new Map<string, Agent>()
  const attention: string[] = []

  for (const id of Object.keys(providers) as ProviderId[]) {
    const list: Agent[] = []
    for (const a of providers[id]) {
      const k = agentKey(a)
      seen.set(k, a)
      list.push(a)
      if (a.status === "waiting_for_human" || a.status === "error") {
        attention.push(k)
      }
    }
    list.sort((x, y) => y.updatedAt - x.updatedAt)
    merged[id] = list
  }

  return {
    byProvider: merged,
    attention,
    generatedAt: Date.now(),
  }
}

export const diffStatus = (
  before: AgentStatus | undefined,
  after: AgentStatus,
): boolean => before !== after

const ACTIVE: ReadonlySet<AgentStatus> = new Set([
  "running",
  "waiting",
  "waiting_for_human",
  "error",
  "compacting",
])

const ATTENTION: ReadonlySet<AgentStatus> = new Set([
  "waiting_for_human",
  "error",
])

const rank = (s: AgentStatus): number => {
  if (ATTENTION.has(s)) return 2
  if (ACTIVE.has(s)) return 1
  return 0
}

const byActiveThenRecent = (a: Agent, b: Agent): number => {
  const aRank = rank(a.status)
  const bRank = rank(b.status)
  if (aRank !== bRank) return bRank - aRank
  return b.updatedAt - a.updatedAt
}

// ponytail: the agents deck is materialized once at startup with a fixed
// number of slot tiles, so which agent fills each tile is resolved per
// broadcast from the live snapshot. Sessions needing attention (waiting /
// error) sit at the very top, other active work next, idle history last.
export const listAgents = (snapshot: AgentsSnapshot): readonly Agent[] =>
  [
    ...snapshot.byProvider["opencode"],
    ...snapshot.byProvider["claude-code"],
  ].sort(byActiveThenRecent)

export const agentAtSlot = (
  snapshot: AgentsSnapshot,
  slot: number,
): Agent | undefined => listAgents(snapshot)[slot]
