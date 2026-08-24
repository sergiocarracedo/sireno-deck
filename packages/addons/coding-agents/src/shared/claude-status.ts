import type { AgentStatus } from "./state"

export interface ClaudeJsonlEntry {
  readonly type: string
  readonly message?: {
    readonly role?: string
    readonly content?: unknown
  }
  readonly toolUse?: unknown
  readonly toolResult?: unknown
  readonly permissionRequest?: unknown
  readonly error?: { readonly message?: string }
  readonly rateLimit?: unknown
  readonly timestamp?: string | number
}

const IDLE_AFTER_MS = 30 * 60 * 1000

const flattenText = (content: unknown, max = 60): string | undefined => {
  if (typeof content === "string") {
    return content.length > max ? `${content.slice(0, max - 1)}…` : content
  }
  if (Array.isArray(content)) {
    const parts: string[] = []
    for (const part of content) {
      if (typeof part === "string") {
        parts.push(part)
      } else if (
        part !== null &&
        typeof part === "object" &&
        "text" in part &&
        typeof (part as { text: unknown }).text === "string"
      ) {
        parts.push((part as { text: string }).text)
      }
    }
    const joined = parts.join(" ")
    return joined.length > max ? `${joined.slice(0, max - 1)}…` : joined
  }
  return undefined
}

const lastTimestamp = (
  entries: readonly ClaudeJsonlEntry[],
): number | undefined => {
  for (let i = entries.length - 1; i >= 0; i -= 1) {
    const ts = entries[i]?.timestamp
    if (typeof ts === "number") return ts
    if (typeof ts === "string") {
      const parsed = Date.parse(ts)
      if (!Number.isNaN(parsed)) return parsed
    }
  }
  return undefined
}

const hasPendingToolUse = (entries: readonly ClaudeJsonlEntry[]): boolean => {
  // ponytail: a tool_use without a following tool_result (or a tool_result
  // for a different tool_use) means the assistant is mid-tool-call waiting
  // for the host. Cheap heuristic — only needs to be wrong on the edge.
  let lastToolUseId: string | null = null
  for (const e of entries) {
    if (e.type === "assistant") {
      const tu = (e as { toolUse?: { id?: string } }).toolUse
      if (tu && typeof tu.id === "string") lastToolUseId = tu.id
    } else if (e.type === "user") {
      const tr = (e as { toolResult?: { tool_use_id?: string } }).toolResult
      if (tr?.tool_use_id === lastToolUseId) lastToolUseId = null
    }
  }
  return lastToolUseId !== null
}

export interface ClaudeDeriveResult {
  readonly status: AgentStatus
  readonly preview?: string
  readonly updatedAt: number
}

export const deriveClaudeStatus = (
  entries: readonly ClaudeJsonlEntry[],
  now: number = Date.now(),
): ClaudeDeriveResult | null => {
  if (entries.length === 0) return null

  const last = entries[entries.length - 1]
  if (!last) return null

  let status: AgentStatus = "idle"
  let preview: string | undefined

  if (last.type === "error") {
    status = "error"
    preview =
      (typeof last.error?.message === "string" && last.error.message) ||
      "session error"
  } else if (last.type === "permission_request") {
    status = "waiting_for_human"
  } else if (typeof last.rateLimit !== "undefined") {
    status = "waiting"
  } else if (last.type === "assistant") {
    if (hasPendingToolUse(entries)) {
      status = "waiting"
    } else {
      status = "running"
    }
    preview = flattenText(last.message?.content)
  } else {
    status = "running"
  }

  const ts = lastTimestamp(entries) ?? now
  if (now - ts > IDLE_AFTER_MS) {
    status = "idle"
  }

  return { status, preview, updatedAt: ts }
}
