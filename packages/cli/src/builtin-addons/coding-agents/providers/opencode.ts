// ponytail: talks to the `opencode serve` HTTP API directly — no SDK
// dependency. Endpoints on this fork (anomalyco): GET /session,
// GET /session/<id>/message (real per-session status lives here as message
// `parts[].state.status`), GET /event (SSE; /global/events is v1.x only).
// The old /session/status `attention` flag is still honored when present.
import type { Agent, AgentProvider, AgentStatus } from "../shared/state.js"
import {
  opencodeEventToStatus,
  type OpencodeEvent,
  type OpencodeSessionStatus,
} from "../shared/opencode-status.js"
import {
  readOpenCodeInstances,
  type OpenCodeInstance,
} from "./opencode-instances.js"

// ponytail: "live" window — only sessions updated within this are surfaced.
const RECENT_WINDOW_MS = 6 * 60 * 60 * 1000

// ponytail: how many trailing messages to fetch per session for status. A
// mid-turn session's newest message streams with finish==null and empty parts,
// so the previous message(s) carry the live tool state — 6 is enough to see
// the open tool while the response streams.
const STATUS_MESSAGE_LIMIT = 6

interface OpencodeSessionLike {
  readonly id: string
  readonly title?: string
  readonly directory?: string
  readonly cost?: number
  readonly contextTokens?: number
  readonly contextPercent?: number
  readonly agent?: string
  readonly model?: { readonly id?: string; readonly providerID?: string }
  readonly tokens?: TokenUsage
  readonly time?: { readonly updated?: number; readonly created?: number }
}

type SessionStatusEntry = OpencodeSessionStatus & { attention?: boolean }

interface MessagePart {
  readonly type?: string
  readonly id?: string
  readonly callID?: string
  readonly tool_use_id?: string
  readonly tool?: string
  readonly state?: { readonly status?: string; readonly title?: string }
}

interface TokenUsage {
  readonly input?: number
  readonly output?: number
  readonly reasoning?: number
  readonly cache?: { readonly read?: number; readonly write?: number }
}

interface ProviderModelLike {
  readonly limit?: { readonly context?: number }
}

interface ProviderLike {
  readonly id?: string
  readonly models?: Readonly<Record<string, ProviderModelLike>>
}

interface MessageLike {
  readonly info?: {
    readonly role?: string
    readonly tokens?: TokenUsage
    readonly cost?: number
    readonly finish?: string | null
  }
  readonly finish?: string | null
  readonly cost?: number
  readonly parts?: readonly MessagePart[]
}

export interface OpencodeHttpApi {
  listSessions(signal: AbortSignal): Promise<ReadonlyArray<OpencodeSessionLike>>
  sessionStatus(
    signal: AbortSignal,
  ): Promise<Record<string, SessionStatusEntry>>
  sessionMessages(
    signal: AbortSignal,
    id: string,
    limit: number,
  ): Promise<ReadonlyArray<MessageLike>>
  providerModels?: (signal: AbortSignal) => Promise<readonly ProviderLike[]>
  eventStream(
    signal: AbortSignal,
  ): Promise<AsyncIterable<OpencodeEvent | unknown>>
}

export const OPENCODE_LOGO =
  "addon://coding-agents/assets/opencode-dark-square.svg"

const requestJson = async <T>(
  baseUrl: string,
  path: string,
  signal: AbortSignal,
): Promise<T> => {
  const res = await fetch(`${baseUrl}${path}`, { signal })
  if (!res.ok) {
    throw new Error(`opencode ${path} → HTTP ${res.status}`)
  }
  return (await res.json()) as T
}

const httpApi = (baseUrl: string): OpencodeHttpApi => ({
  listSessions: (signal) => requestJson(baseUrl, "/session", signal),
  sessionStatus: (signal) =>
    requestJson<Record<string, SessionStatusEntry>>(
      baseUrl,
      "/session/status",
      signal,
    ),
  sessionMessages: (signal, id, limit) =>
    requestJson<ReadonlyArray<MessageLike>>(
      baseUrl,
      `/session/${encodeURIComponent(id)}/message?limit=${limit}`,
      signal,
    ),
  providerModels: async (signal) => {
    const response = await requestJson<{ all?: readonly ProviderLike[] }>(
      baseUrl,
      "/provider",
      signal,
    )
    return response.all ?? []
  },
  eventStream: async (signal) => streamEvents(baseUrl, signal),
})

// ponytail: minimal SSE reader over fetch's streaming body. opencode
// emits `data: <json>\n\n` frames; we only need the data payloads.
async function* streamEvents(
  baseUrl: string,
  signal: AbortSignal,
): AsyncIterable<OpencodeEvent | unknown> {
  // ponytail: the anomalyco fork serves the event stream at /event;
  // v1.x uses /global/events. Either path can 200 with an HTML fallback, so
  // validate the first chunk is a `data:` frame before committing.
  for (const path of ["/event", "/global/events"] as const) {
    try {
      const attempt = await fetch(`${baseUrl}${path}`, {
        signal,
        headers: { Accept: "text/event-stream" },
      })
      if (!attempt.ok || attempt.body === null) continue
      const reader = attempt.body.getReader()
      const first = await reader.read()
      reader.releaseLock()
      if (first.done || !first.value || !startsDataFrame(first.value)) {
        await attempt.body.cancel().catch(() => {})
        continue
      }
      const res = attempt
      void res
      const decoder = new TextDecoder()
      let buffer = new TextDecoder().decode(first.value as Uint8Array, {
        stream: true,
      })
      const body = res.body as ReadableStream<Uint8Array>
      for await (const chunk of body) {
        buffer += decoder.decode(chunk as Uint8Array, { stream: true })
        let idx: number
        while ((idx = buffer.indexOf("\n\n")) !== -1) {
          const frame = buffer.slice(0, idx)
          buffer = buffer.slice(idx + 2)
          for (const line of frame.split("\n")) {
            if (!line.startsWith("data:")) continue
            const payload = line.slice(5).trim()
            if (payload.length === 0) continue
            try {
              yield JSON.parse(payload) as OpencodeEvent
            } catch {
              // non-JSON frame — ignore
            }
          }
        }
      }
      return
    } catch {
      continue
    }
  }
}

const startsDataFrame = (chunk: Uint8Array): boolean =>
  String.fromCharCode(...chunk.slice(0, 32)).includes("data:")

// ponytail: this fork's /session/status is empty even mid-turn, so live
// status comes from the trailing message parts. A `tool` part with
// state.status "pending" means the agent is waiting on the user (permission
// prompt or a `question`) → waiting_for_human; "running" → running. The
// newest message of an in-flight turn streams with finish==null and (often)
// empty parts — that's still "running". Otherwise the turn has finished.
const statusFromMessages = (
  messages: ReadonlyArray<MessageLike>,
): AgentStatus | null => {
  const completedTools = new Set<string>()
  for (const message of messages) {
    for (const part of message.parts ?? []) {
      if (part.type !== "tool_result") continue
      const id = part.id ?? part.callID ?? part.tool_use_id
      if (id !== undefined) completedTools.add(id)
    }
  }

  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const m = messages[i]
    const parts = m?.parts ?? []
    for (const p of parts) {
      if (p?.type !== "tool") continue
      const id = p.id ?? p.callID ?? p.tool_use_id
      if (id !== undefined && completedTools.has(id)) continue
      const st = p.state?.status
      if (st === "pending") return "waiting_for_human"
      if (st === "running") return "running"
    }
  }
  const last = messages[messages.length - 1]
  if (last === undefined) return null
  // ponytail: an in-flight turn streams with finish==null and empty parts —
  // that's still "running". A finished turn carries a real finish value.
  if (last.finish === null || last.info?.finish === null) return "running"
  return "idle"
}

const tokenTotal = (tokens: TokenUsage | undefined): number | undefined => {
  if (tokens === undefined) return undefined
  const values = [
    tokens.input,
    tokens.output,
    tokens.reasoning,
    tokens.cache?.read,
    tokens.cache?.write,
  ]
  let total = 0
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) total += value
  }
  return total > 0 ? total : undefined
}

const latestAssistantTokens = (
  messages: ReadonlyArray<MessageLike>,
): number | undefined => {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const info = messages[i]?.info
    if (info?.role !== "assistant" || (info.tokens?.output ?? 0) <= 0) {
      continue
    }
    return tokenTotal(info.tokens)
  }
  return undefined
}

const messageCost = (messages: ReadonlyArray<MessageLike>): number =>
  messages.reduce((sum, message) => {
    const cost = message.info?.cost ?? message.cost
    return sum + (typeof cost === "number" && Number.isFinite(cost) ? cost : 0)
  }, 0)

// ponytail: the fork's /session/status is usually empty, so live status comes
// from the message parts; when a message-derived status is idle, fall back to
// whatever the status map reported (map status is authoritative when present).
const combineStatus = (
  fromMap: AgentStatus,
  fromMessages: AgentStatus | null,
): AgentStatus => fromMessages ?? fromMap

export class OpenCodeProvider implements AgentProvider {
  readonly id = "opencode" as const
  readonly displayName = "OpenCode"
  readonly logoPath = OPENCODE_LOGO

  readonly #api: OpencodeHttpApi
  readonly #apiFactory: (baseUrl: string) => OpencodeHttpApi
  readonly #recentWindowMs: number

  constructor(opts: {
    baseUrl: string
    apiFactory?: (baseUrl: string) => OpencodeHttpApi
    recentWindowMs?: number
  }) {
    this.#apiFactory = opts.apiFactory ?? httpApi
    this.#api = this.#apiFactory(opts.baseUrl)
    this.#recentWindowMs = opts.recentWindowMs ?? RECENT_WINDOW_MS
  }

  async fetchSnapshot(signal: AbortSignal): Promise<readonly Agent[]> {
    if (signal.aborted) return []
    try {
      const [sessions, statusMap, providers] = await Promise.all([
        this.#api.listSessions(signal),
        this.#api.sessionStatus(signal),
        this.#api.providerModels?.(signal).catch(() => []) ??
          Promise.resolve([]),
      ])
      const contextLimits = new Map<string, number>()
      for (const provider of providers) {
        for (const [modelId, model] of Object.entries(provider.models ?? {})) {
          const context = model.limit?.context
          if (provider.id !== undefined && typeof context === "number") {
            contextLimits.set(`${provider.id}:${modelId}`, context)
          }
        }
      }
      const now = Date.now()
      const recent = sessions
        .filter((s) => (s.time?.updated ?? 0) >= now - this.#recentWindowMs)
        .sort((a, b) => (b.time?.updated ?? 0) - (a.time?.updated ?? 0))
      const agents = await this.#withMessages(
        recent,
        statusMap,
        signal,
        contextLimits,
      )
      const instances = await readOpenCodeInstances()
      const bySessionId = new Map(
        instances.flatMap((instance) =>
          instance.sessionId === undefined
            ? []
            : [[instance.sessionId, instance] as const],
        ),
      )
      const represented = new Set<string>()
      const merged = agents.map((session) => {
        const instance = bySessionId.get(session.sessionId)
        if (instance === undefined) return session
        represented.add(instance.instanceId)
        return {
          ...session,
          instanceId: instance.instanceId,
          pid: instance.pid,
          status: instance.status,
          directory: instance.cwd,
          updatedAt: instance.updatedAt,
        }
      })
      return [
        ...merged,
        ...instances
          .filter((instance) => !represented.has(instance.instanceId))
          .map(toInstanceAgent),
      ]
    } catch (err) {
      if (signal.aborted) return []
      console.warn(
        "[coding-agents] opencode snapshot failed:",
        err instanceof Error ? err.message : String(err),
      )
      return []
    }
  }

  async #withMessages(
    recent: ReadonlyArray<OpencodeSessionLike>,
    statusMap: Record<string, SessionStatusEntry>,
    signal: AbortSignal,
    contextLimits: ReadonlyMap<string, number>,
  ): Promise<readonly Agent[]> {
    const out: Agent[] = []
    for (const s of recent) {
      const fromMap = toStatusFromMap(s, statusMap)
      let status = fromMap
      let contextTokens = tokenTotal(s.tokens)
      let cost =
        typeof s.cost === "number" && Number.isFinite(s.cost)
          ? s.cost
          : undefined
      if (status !== "waiting_for_human") {
        try {
          const messages = await this.#api.sessionMessages(
            signal,
            s.id,
            STATUS_MESSAGE_LIMIT,
          )
          status = combineStatus(fromMap, statusFromMessages(messages))
          contextTokens = latestAssistantTokens(messages) ?? contextTokens
          if (cost === undefined) {
            const derivedCost = messageCost(messages)
            if (derivedCost > 0) cost = derivedCost
          }
        } catch {
          // keep derived status; message endpoint may 4xx for closed sessions
        }
      }
      const contextLimit =
        s.model?.providerID !== undefined && s.model.id !== undefined
          ? contextLimits.get(`${s.model.providerID}:${s.model.id}`)
          : undefined
      const contextPercent =
        contextTokens !== undefined && contextLimit !== undefined
          ? Math.round((contextTokens / contextLimit) * 100)
          : undefined
      out.push(
        toAgent(s, status, {
          ...(s.directory !== undefined ? { directory: s.directory } : {}),
          ...(cost !== undefined ? { cost } : {}),
          ...(contextTokens !== undefined ? { contextTokens } : {}),
          ...(contextPercent !== undefined ? { contextPercent } : {}),
        }),
      )
    }
    return out
  }

  subscribe(signal: AbortSignal, onChange: () => void): () => void {
    let cancelled = false
    const setCancelled = (): void => {
      cancelled = true
    }
    signal.addEventListener("abort", setCancelled)
    const noop = (): void => {}

    const run = async () => {
      outer: while (!cancelled && !signal.aborted) {
        try {
          const sub = await this.#api.eventStream(signal)
          try {
            for await (const raw of sub) {
              if (cancelled || signal.aborted) break
              const evt = raw as OpencodeEvent
              if (!evt || typeof evt !== "object") continue
              if (!("type" in evt)) continue
              const mapped = opencodeEventToStatus(evt)
              if (mapped) {
                onChange()
              }
            }
          } finally {
            noop()
          }
          if (cancelled || signal.aborted) break outer
          await new Promise<void>((resolve) => {
            if (signal.aborted) {
              resolve()
              return
            }
            const t = setTimeout(resolve, 50)
            signal.addEventListener("abort", () => {
              clearTimeout(t)
              resolve()
            })
          })
        } catch {
          await new Promise((resolve) => {
            const t = setTimeout(resolve, 3000)
            signal.addEventListener("abort", () => {
              clearTimeout(t)
              resolve(undefined)
            })
          })
        }
      }
    }

    void run()
    return () => {
      cancelled = true
    }
  }
}

const toStatusFromMap = (
  s: OpencodeSessionLike,
  statusMap: Record<string, SessionStatusEntry>,
): AgentStatus => {
  const status = statusMap[s.id]
  let normalizedStatus: AgentStatus = "idle"
  if (status?.type === "busy") normalizedStatus = "running"
  else if (status?.type === "retry") normalizedStatus = "waiting"
  // ponytail: opencode v1.1+ surfaces an `attention` boolean on
  // /session/status entries when the assistant needs human input — trust
  // it over our inference since it comes from the source itself.
  if (status?.attention === true) normalizedStatus = "waiting_for_human"
  return normalizedStatus
}

const toAgent = (
  s: OpencodeSessionLike,
  status: AgentStatus,
  extra: {
    directory?: string
    cost?: number
    contextTokens?: number
    contextPercent?: number
  },
): Agent => ({
  sessionId: s.id,
  providerId: "opencode",
  title: s.title && s.title.length > 0 ? s.title : "Untitled session",
  status,
  ...(extra.directory !== undefined ? { directory: extra.directory } : {}),
  ...(extra.cost !== undefined && Number.isFinite(extra.cost)
    ? { cost: extra.cost }
    : {}),
  ...(extra.contextTokens !== undefined && Number.isFinite(extra.contextTokens)
    ? { contextTokens: extra.contextTokens }
    : {}),
  ...(extra.contextPercent !== undefined &&
  Number.isFinite(extra.contextPercent)
    ? { contextPercent: extra.contextPercent }
    : {}),
  ...(s.time?.created !== undefined ? { createdAt: s.time.created } : {}),
  updatedAt: s.time?.updated ?? s.time?.created ?? 0,
})

const toInstanceAgent = (instance: OpenCodeInstance): Agent => ({
  sessionId: instance.sessionId ?? `instance:${instance.instanceId}`,
  instanceId: instance.instanceId,
  pid: instance.pid,
  providerId: "opencode",
  title: "OpenCode",
  status: instance.status,
  directory: instance.cwd,
  updatedAt: instance.updatedAt,
  createdAt: instance.updatedAt,
})
