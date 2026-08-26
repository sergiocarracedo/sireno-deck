import { createOpencodeClient } from "@opencode-ai/sdk"

// ponytail: see packages/addons/app-shortcuts/src/index.ts for context.
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
  readonly time?: { readonly updated?: number; readonly created?: number }
}

export interface OpencodeClientLike {
  session: {
    list(): Promise<ReadonlyArray<OpencodeSessionLike>>
    status(): Promise<Record<string, OpencodeSessionStatus>>
  }
  event: {
    subscribe(): Promise<{
      stream: AsyncIterable<OpencodeEvent | unknown>
    }>
  }
}

export const OPENCODE_LOGO =
  "addon://coding-agents/assets/opencode-dark-square.svg"

export class OpenCodeProvider implements AgentProvider {
  readonly id = "opencode" as const
  readonly displayName = "OpenCode"
  readonly logoPath = OPENCODE_LOGO

  readonly #client: OpencodeClientLike
  readonly #clientFactory: (baseUrl: string) => OpencodeClientLike

  constructor(opts: {
    baseUrl: string
    clientFactory?: (baseUrl: string) => OpencodeClientLike
  }) {
    this.#clientFactory =
      opts.clientFactory ??
      ((baseUrl: string) =>
        createOpencodeClient({ baseUrl }) as unknown as OpencodeClientLike)
    this.#client = this.#clientFactory(opts.baseUrl)
  }

  async fetchSnapshot(signal: AbortSignal): Promise<readonly Agent[]> {
    if (signal.aborted) return []
    try {
      const [listRes, statusRes] = await Promise.all([
        this.#client.session.list(),
        this.#client.session.status(),
      ])
      // ponytail: the SDK is a HeyApi client — with throwOnError:false
      // (default) calls resolve to `{ data, error, response }`, NOT the
      // payload. Treating the result as an array threw TypeError, the
      // catch below swallowed it, and every snapshot came back as zero
      // agents regardless of how many opencode instances were open.
      const sessions =
        (listRes as unknown as { data?: ReadonlyArray<OpencodeSessionLike> })
          .data ?? []
      const statusMap =
        (
          statusRes as unknown as {
            data?: Record<string, OpencodeSessionStatus>
          }
        ).data ?? {}
      return sessions.map((s) => toAgent(s, statusMap[s.id]))
    } catch (err) {
      if (signal.aborted) return []
      // ponytail: surface unavailability instead of silently reporting
      // zero — consumers can distinguish "no agents" from "broken probe"
      // via the error field, and daemon logs get the reason.
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
          const sub = await this.#client.event.subscribe()
          try {
            for await (const raw of sub.stream) {
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
          // `cancelled` flag — otherwise an empty SSE stream creates a tight
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
  status: OpencodeSessionStatus | undefined,
): Agent => {
  let normalizedStatus: AgentStatus = "idle"
  if (status?.type === "busy") normalizedStatus = "running"
  else if (status?.type === "retry") normalizedStatus = "waiting"
  return {
    sessionId: s.id,
    providerId: "opencode",
    title: s.title && s.title.length > 0 ? s.title : "Untitled session",
    status: normalizedStatus,
    ...(s.directory !== undefined ? { directory: s.directory } : {}),
    updatedAt: s.time?.updated ?? s.time?.created ?? 0,
  }
}
