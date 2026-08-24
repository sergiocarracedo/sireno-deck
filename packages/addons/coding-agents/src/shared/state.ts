export type AgentStatus =
  | "idle"
  | "running"
  | "waiting"
  | "waiting_for_human"
  | "error"
  | "compacting"

export type ProviderId = "opencode" | "claude-code"

export interface Agent {
  readonly sessionId: string
  readonly providerId: ProviderId
  readonly title: string
  readonly status: AgentStatus
  readonly directory?: string
  readonly updatedAt: number
  readonly lastMessagePreview?: string
}

export interface AgentsSnapshot {
  readonly byProvider: Readonly<Record<ProviderId, readonly Agent[]>>
  readonly attention: readonly string[]
  readonly generatedAt: number
}

export const CHANNEL = "coding-agents:agents" as const

export const KNOWN_PROVIDERS: readonly ProviderId[] = [
  "opencode",
  "claude-code",
] as const

export const notifiableStatus = (s: AgentStatus): boolean =>
  s === "waiting_for_human" || s === "error"

export const agentKey = (a: Pick<Agent, "providerId" | "sessionId">): string =>
  `${a.providerId}:${a.sessionId}`

export const EMPTY_SNAPSHOT: AgentsSnapshot = {
  byProvider: { opencode: [], "claude-code": [] },
  attention: [],
  generatedAt: 0,
}

export interface CoreMethods {
  notify(args: { title: string; body: string; sound?: boolean }): Promise<void>
  runCommand(
    command: string,
    options?: { timeoutMs?: number },
  ): Promise<unknown>
  navigateToDeck(args: { id: string; addToHistory?: boolean }): void
  goBack(): void
}

export interface AgentProvider {
  readonly id: ProviderId
  readonly displayName: string
  readonly logoPath: string
  fetchSnapshot(signal: AbortSignal): Promise<readonly Agent[]>
  subscribe(signal: AbortSignal, onChange: () => void): () => void
}
