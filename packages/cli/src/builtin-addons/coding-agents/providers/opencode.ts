// ponytail: talks to the `opencode serve` HTTP API directly — no SDK
// dependency. Endpoints (v1.x): GET /session, GET /session/status,
// GET /global/events (SSE). Presence of a field named `attention` in
// /session/status entries overrides the derived status to
// waiting_for_human (opencode v1.1+).
import type { Agent, AgentProvider, AgentStatus } from "../shared/state.js"
import {
  opencodeEventToStatus,
  type OpencodeEvent,
  type OpencodeSessionStatus,
} from "../shared/opencode-status.js"

interface OpencodeSessionLike {
  readonly id: string
  readonly title?: string
  readonly directory?: string
  readonly cost?: number
  readonly time?: { readonly updated?: number; readonly created?: number }
}

type SessionStatusEntry = OpencodeSessionStatus & { attention?: boolean }

export interface OpencodeHttpApi {
  listSessions(signal: AbortSignal): Promise<ReadonlyArray<OpencodeSessionLike>>
  sessionStatus(
    signal: AbortSignal,
  ): Promise<Record<string, SessionStatusEntry>>
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
  eventStream: async (signal) => streamEvents(baseUrl, signal),
})

// ponytail: minimal SSE reader over fetch's streaming body. opencode
// emits `event: <name>\ndata: <json>\n\n` frames; we only need the data
// payloads, mapped through opencodeEventToStatus by the caller.
async function* streamEvents(
  baseUrl: string,
  signal: AbortSignal,
): AsyncIterable<OpencodeEvent | unknown> {
  const res = await fetch(`${baseUrl}/global/events`, {
    signal,
    headers: { Accept: "text/event-stream" },
  })
  if (!res.ok || res.body === null) return
  const decoder = new TextDecoder()
  let buffer = ""
  for await (const chunk of res.body) {
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
}

export class OpenCodeProvider implements AgentProvider {
  readonly id = "opencode" as const
  readonly displayName = "OpenCode"
  readonly logoPath = OPENCODE_LOGO

  readonly #api: OpencodeHttpApi
  readonly #apiFactory: (baseUrl: string) => OpencodeHttpApi

  constructor(opts: {
    baseUrl: string
    apiFactory?: (baseUrl: string) => OpencodeHttpApi
  }) {
    this.#apiFactory = opts.apiFactory ?? httpApi
    this.#api = this.#apiFactory(opts.baseUrl)
  }

  async fetchSnapshot(signal: AbortSignal): Promise<readonly Agent[]> {
    if (signal.aborted) return []
    try {
      const [sessions, statusMap] = await Promise.all([
        this.#api.listSessions(signal),
        this.#api.sessionStatus(signal),
      ])
      return sessions.map((s) => toAgent(s, statusMap[s.id]))
    } catch (err) {
      if (signal.aborted) return []
      console.warn(
        "[coding-agents] opencode snapshot failed:",
        err instanceof Error ? err.message : String(err),
      )
      return []
    }
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
          // ponytail: yield to the event loop between reconnect attempts so
          // an unsub/abort from another microtask has a chance to flip the
          // `cancelled` flag — otherwise an empty stream creates a tight
          // synchronous loop that starves setTimeout-based tests.
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
          // ponytail: reconnect loop. If the SSE socket drops or the server
          // is briefly unreachable, wait 3 s and try again. Abort signal
          // breaks the loop cleanly.
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

const toAgent = (
  s: OpencodeSessionLike,
  status: SessionStatusEntry | undefined,
): Agent => {
  let normalizedStatus: AgentStatus = "idle"
  if (status?.type === "busy") normalizedStatus = "running"
  else if (status?.type === "retry") normalizedStatus = "waiting"
  // ponytail: opencode v1.1+ surfaces an `attention` boolean on
  // /session/status entries when the assistant needs human input — trust
  // it over our inference since it comes from the source itself.
  if (status?.attention === true) normalizedStatus = "waiting_for_human"
  return {
    sessionId: s.id,
    providerId: "opencode",
    title: s.title && s.title.length > 0 ? s.title : "Untitled session",
    status: normalizedStatus,
    ...(s.directory !== undefined ? { directory: s.directory } : {}),
    ...(typeof s.cost === "number" && Number.isFinite(s.cost)
      ? { cost: s.cost }
      : {}),
    updatedAt: s.time?.updated ?? s.time?.created ?? 0,
  }
}
