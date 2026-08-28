import type { AgentStatus } from "./state.js"

export interface ClaudeJsonlEntry {
  readonly type: string
  readonly subtype?: string
  readonly message?: {
    readonly role?: string
    readonly content?: unknown
  }
  readonly toolUse?: unknown
  readonly toolResult?: unknown
  readonly permissionRequest?: unknown
  readonly error?: { readonly message?: string }
  readonly rateLimit?: unknown
  readonly costUSD?: number
  readonly cwd?: string
  readonly timestamp?: string | number
}

// ponytail: real claude jsonl has none of the v1 phantom shapes. The
// signals that exist (verified against ~/.claude/projects) are:
//   • message.content as an ARRAY of blocks — tool_use blocks carry id+name
//   • user tool_result blocks resolve a pending tool_use
//   • system entries with subtype "turn_duration" mark the turn finished
//   • progress entries stream while a tool/step runs
// Stalled (needs-human) heuristics below still work on the edge where a
// permission prompt ends the turn as a pending tool_use.
const IDLE_AFTER_MS = 30 * 60 * 1000
// ponytail: a pending non-AskUserQuestion tool longer than this is stuck on
// a permission prompt or a slow tool → surface as "waiting".
const STALLED_MS = 90 * 1000

interface ToolUseBlock {
  readonly type?: string
  readonly id?: string
  readonly name?: string
}

const textFromContent = (content: unknown, max = 60): string | undefined => {
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
        "type" in part &&
        (part as { type: unknown }).type === "text"
      ) {
        const text = (part as { text?: unknown }).text
        if (typeof text === "string") parts.push(text)
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

const firstTimestamp = (
  entries: readonly ClaudeJsonlEntry[],
): number | undefined => {
  for (const e of entries) {
    const ts = e?.timestamp
    if (typeof ts === "number") return ts
    if (typeof ts === "string") {
      const parsed = Date.parse(ts)
      if (!Number.isNaN(parsed)) return parsed
    }
  }
  return undefined
}

const lastAssistantText = (
  entries: readonly ClaudeJsonlEntry[],
): string | undefined => {
  for (let i = entries.length - 1; i >= 0; i -= 1) {
    const e = entries[i]
    if (e?.type !== "assistant") continue
    const text = textFromContent(e.message?.content)
    if (text !== undefined) return text
  }
  return undefined
}

interface PendingTool {
  readonly id: string
  readonly name: string
}

// ponytail: track tool_use blocks until their matching tool_result. A tool
// still pending at the end of the stream is what the agent is doing right now.
const pendingToolUses = (
  entries: readonly ClaudeJsonlEntry[],
): readonly PendingTool[] => {
  const pending = new Map<string, string>()
  for (const e of entries) {
    if (e.type === "assistant") {
      const content = e.message?.content
      if (Array.isArray(content)) {
        for (const block of content) {
          if (
            typeof block !== "object" ||
            block === null ||
            (block as ToolUseBlock).type !== "tool_use"
          ) {
            continue
          }
          const b = block as ToolUseBlock
          if (typeof b.id === "string" && typeof b.name === "string") {
            pending.set(b.id, b.name)
          }
        }
      }
    } else if (e.type === "user") {
      const content = e.message?.content
      if (Array.isArray(content)) {
        for (const block of content) {
          if (
            typeof block !== "object" ||
            block === null ||
            (block as { type?: string }).type !== "tool_result"
          ) {
            continue
          }
          const id = (block as { tool_use_id?: unknown }).tool_use_id
          if (typeof id === "string") pending.delete(id)
        }
      }
    }
  }
  return [...pending.entries()].map(([id, name]) => ({ id, name }))
}

export interface ClaudeDeriveResult {
  readonly status: AgentStatus
  readonly preview?: string
  readonly updatedAt: number
  readonly cost?: number
  readonly cwd?: string
  readonly createdAt?: number
}

export const deriveClaudeStatus = (
  entries: readonly ClaudeJsonlEntry[],
  now: number = Date.now(),
): ClaudeDeriveResult | null => {
  if (entries.length === 0) return null

  const last = entries[entries.length - 1]!
  const ts = lastTimestamp(entries) ?? now
  let status: AgentStatus = "idle"
  let preview: string | undefined

  const pending = pendingToolUses(entries)
  const pendingAsk = pending.find((t) => t.name === "AskUserQuestion")
  if (pendingAsk !== undefined) {
    status = "waiting_for_human"
    preview = "asking for your input"
  } else if (last.type === "error") {
    status = "error"
    preview =
      (typeof last.error?.message === "string" && last.error.message) ||
      "session error"
  } else if (typeof last.rateLimit !== "undefined") {
    status = "waiting"
  } else if (last.type === "system" && last.subtype === "turn_duration") {
    // ponytail: turn finished — agent await
    status = "idle"
    preview = lastAssistantText(entries) ?? preview
  } else if (last.type === "progress") {
    status = "running"
  } else if (pending.length > 0) {
    // A non-AskUserQuestion tool is still open: running now, "waiting" once
    // it stalls (permission prompt / hung tool).
    const stalled = now - ts > STALLED_MS
    status = stalled ? "waiting" : "running"
    const toolName = pending[pending.length - 1]?.name
    preview = toolName !== undefined ? `running ${toolName}` : undefined
  } else if (last.type === "user") {
    // Agent hasn't replied yet — mid-turn.
    status = "running"
  } else if (last.type === "assistant") {
    preview = textFromContent(last.message?.content)
    status = "idle"
  }

  if (now - ts > IDLE_AFTER_MS) {
    status = "idle"
  }

  // ponytail: costUSD is per-assistant-message; sum gives a rough session
  // total. Not every version files cost on every message — absent values
  // just don't accrue.
  let cost = 0
  for (const e of entries) {
    if (typeof e.costUSD === "number" && Number.isFinite(e.costUSD)) {
      cost += e.costUSD
    }
  }
  const cwd = entries.find((e) => typeof e.cwd === "string")?.cwd
  const createdAt = firstTimestamp(entries)

  return {
    status,
    preview,
    updatedAt: ts,
    ...(cost > 0 ? { cost } : {}),
    ...(cwd !== undefined && cwd.length > 0 ? { cwd } : {}),
    ...(createdAt !== undefined ? { createdAt } : {}),
  }
}
