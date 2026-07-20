import { useState } from "react"

import { getBridgeMessages, type BridgeMessageEntry } from "../bridge-log-store"

const formatPayload = (payload: unknown): string => {
  try {
    return JSON.stringify(payload)
  } catch {
    return String(payload)
  }
}

export const BridgeLogsPage = () => {
  const [direction, setDirection] = useState<"all" | "sent" | "received">("all")
  const [typeFilter, setTypeFilter] = useState("")
  const [content, setContent] = useState("")
  const [, force] = useState(0)

  const messages: BridgeMessageEntry[] = getBridgeMessages({
    direction,
    ...(typeFilter !== "" ? { type: typeFilter } : {}),
    ...(content !== "" ? { contentSubstring: content } : {}),
  })

  return (
    <div
      data-testid="bridge-logs-page"
      className="flex h-full flex-col gap-2 p-3"
    >
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={direction}
          onChange={(e) => setDirection(e.target.value as "all" | "sent" | "received")}
          className="rounded bg-neutral-800 px-2 py-1 text-xs text-neutral-200"
          data-testid="bridge-logs-direction"
        >
          <option value="all">all</option>
          <option value="sent">sent</option>
          <option value="received">received</option>
        </select>
        <input
          type="text"
          placeholder="type filter"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="rounded bg-neutral-800 px-2 py-1 text-xs text-neutral-200"
        />
        <input
          type="text"
          placeholder="content substring"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="rounded bg-neutral-800 px-2 py-1 text-xs text-neutral-200"
          data-testid="bridge-logs-content"
        />
        <button
          type="button"
          onClick={() => force((n) => n + 1)}
          className="rounded bg-neutral-700 px-2 py-1 text-xs text-neutral-200"
        >
          refresh
        </button>
      </div>
      <ul
        data-testid="bridge-logs-list"
        className="flex-1 space-y-1 overflow-y-auto font-mono text-[11px]"
      >
        {messages.map((m, i) => (
          <li
            key={`${m.ts}-${i}`}
            className={`rounded px-2 py-1 ${m.direction === "sent" ? "bg-sky-900/30" : "bg-emerald-900/30"}`}
          >
            <span className="text-neutral-500">
              {new Date(m.ts).toISOString().slice(11, 19)}
            </span>
            {" "}
            <span className="text-neutral-400">{m.direction}</span>
            {" "}
            <span className="font-semibold text-neutral-200">{m.type}</span>
            {m.channel !== null && (
              <span className="ml-2 text-neutral-500">#{m.channel}</span>
            )}
            <div className="truncate text-neutral-400">
              {formatPayload(m.payload)}
            </div>
          </li>
        ))}
        {messages.length === 0 && (
          <li className="text-neutral-500">no messages</li>
        )}
      </ul>
    </div>
  )
}
