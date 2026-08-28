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

// ponytail: "live" window — only sessions updated within this are surfaced.
const RECENT_WINDOW_MS = 6 * 60 * 60 * 1000

// ponytail: a message-part poll (GET /session/<id>/message) runs per recent
// session per tick; only sessions touched within this window are polled so
// the request count stays at 1–3.
const STATUS_WINDOW_MS = 2 * 60 * 60 * 1000

interface OpencodeSessionLike {
  readonly id: string
  readonly title?: string
  readonly directory?: string
  readonly cost?: number
  readonly time?: { readonly updated?: number; readonly created?: number }
}

type SessionStatusEntry = OpencodeSessionStatus & { attention?: boolean }

interface MessagePart {
  readonly type?: string
  readonly tool?: string
  readonly state?: { readonly status?: string; readonly title?: string }
}

interface MessageLike {
  readonly info?: { readonly role?: string; readonly tokens?: unknown }
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
  ): Promise<ReadonlyArray<MessageLike>>
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
  sessionMessages: (signal, id) =>
    requestJson<ReadonlyArray<MessageLike>>(
      baseUrl,
      `/session/${encodeURIComponent(id)}/message`,
      signal,
    ),
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
// status comes from the session's last message parts: a `tool` part with
// state.status "pending" means the agent is asking the user (needs
// approval/answer) → waiting_for_human; "running" → running; otherwise the
// turn has finished (idle). Honored last message role: assistant text = idle.
const statusFromMessages = (
  messages: ReadonlyArray<MessageLike>,
): AgentStatus => {
  const last = messages[messages.length - 1]
  if (!last) return "idle"
  const parts = last.parts ?? []
  for (const p of parts) {
    if (p.type !== "tool") continue
    const st = p.state?.status
    if (st === "pending") return "waiting_for_human"
    if (st === "running") return "running"
  }
  const role = last.info?.role
  return role === "user" ? "running" : "idle"
}

// ponytail: the fork's /session/status is usually empty, so live status comes
// from the message parts; when a message-derived status is idle, fall back to
// whatever the status map reported (map status is authoritative when present).
const combineStatus = (
  fromMap: AgentStatus,
  fromMessages: AgentStatus,
): AgentStatus => (fromMessages !== "idle" ? fromMessages : fromMap)

export class OpenCodeProvider implements AgentProvider {
  readonly id = "opencode" as const
  readonly displayName = "OpenCode"
  readonly logoPath = OPENCODE_LOGO

  readonly #api: OpencodeHttpApi
  readonly #apiFactory: (baseUrl: string) => OpencodeHttpApi
  readonly #recentWindowMs: number
  readonly #statusWindowMs: number

  constructor(opts: {
    baseUrl: string
    apiFactory?: (baseUrl: string) => OpencodeHttpApi
    recentWindowMs?: number
    statusWindowMs?: number
  }) {
    this.#apiFactory = opts.apiFactory ?? httpApi
    this.#api = this.#apiFactory(opts.baseUrl)
    this.#recentWindowMs = opts.recentWindowMs ?? RECENT_WINDOW_MS
    this.#statusWindowMs = opts.statusWindowMs ?? STATUS_WINDOW_MS
  }

  async fetchSnapshot(signal: AbortSignal): Promise<readonly Agent[]> {
    if (signal.aborted) return []
    try {
      const [sessions, statusMap] = await Promise.all([
        this.#api.listSessions(signal),
        this.#api.sessionStatus(signal),
      ])
      const now = Date.now()
      const recent = sessions
        .filter((s) => (s.time?.updated ?? 0) >= now - this.#recentWindowMs)
        .sort((a, b) => (b.time?.updated ?? 0) - (a.time?.updated ?? 0))
      const agents = await this.#withMessages(recent, statusMap, signal)
      return agents
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
  ): Promise<readonly Agent[]> {
    const now = Date.now()
    const out: Agent[] = []
    for (const s of recent) {
      const fromMap = toStatusFromMap(s, statusMap)
      let status = fromMap
      const statusEligible =
        (s.time?.updated ?? 0) >= now - this.#statusWindowMs
      if (statusEligible && status !== "waiting_for_human") {
        try {
          const messages = await this.#api.sessionMessages(signal, s.id)
          status = combineStatus(fromMap, statusFromMessages(messages))
        } catch {
          // keep derived status; message endpoint may 4xx for closed sessions
        }
      }
      out.push(
        toAgent(s, status, {
          ...(s.directory !== undefined ? { directory: s.directory } : {}),
          ...(typeof s.cost === "number" && Number.isFinite(s.cost)
            ? { cost: s.cost }
            : {}),
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
  extra: { directory?: string; cost?: number },
): Agent => ({
  sessionId: s.id,
  providerId: "opencode",
  title: s.title && s.title.length > 0 ? s.title : "Untitled session",
  status,
  ...(extra.directory !== undefined ? { directory: extra.directory } : {}),
  ...(extra.cost !== undefined && Number.isFinite(extra.cost)
    ? { cost: extra.cost }
    : {}),
  ...(s.time?.created !== undefined ? { createdAt: s.time.created } : {}),
  updatedAt: s.time?.updated ?? s.time?.created ?? 0,
})
