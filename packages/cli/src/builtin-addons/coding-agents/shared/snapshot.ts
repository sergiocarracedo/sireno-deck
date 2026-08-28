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

const byCreatedDesc = (a: Agent, b: Agent): number => {
  const aCreated = a.createdAt ?? 0
  const bCreated = b.createdAt ?? 0
  if (aCreated !== bCreated) return bCreated - aCreated
  return b.updatedAt - a.updatedAt
}

// ponytail: the agents deck is materialized once at startup with a fixed
// number of slot tiles, so which agent fills each tile is resolved per
// broadcast from the live snapshot. Ordered by creation date (newest first);
// state is conveyed by the tile's color instead of ordering.
export const listAgents = (snapshot: AgentsSnapshot): readonly Agent[] =>
  [
    ...snapshot.byProvider["opencode"],
    ...snapshot.byProvider["claude-code"],
  ].sort(byCreatedDesc)

export const agentAtSlot = (
  snapshot: AgentsSnapshot,
  slot: number,
): Agent | undefined => listAgents(snapshot)[slot]
