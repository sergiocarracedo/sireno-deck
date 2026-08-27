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
