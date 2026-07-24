import { useState } from "react"

import {
  getServiceLogs,
  type ServiceLogEntry,
  type ServiceLogLevel,
} from "../bridge-log-store"

const LEVEL_COLOR: Record<ServiceLogLevel, string> = {
  trace: "text-neutral-500",
  debug: "text-neutral-400",
  info: "text-sky-300",
  warn: "text-amber-300",
  error: "text-red-400",
  fatal: "text-red-500",
}

export const ServiceLogsPage = () => {
  const [level, setLevel] = useState<ServiceLogLevel | "">("")
  const [content, setContent] = useState("")
  const [, force] = useState(0)

  const logs: ServiceLogEntry[] = getServiceLogs({
    ...(level !== "" ? { level } : {}),
    ...(content !== "" ? { contentSubstring: content } : {}),
  })

  return (
    <div
      data-testid="service-logs-page"
      className="flex h-full flex-col gap-2 p-3"
    >
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={level}
          onChange={(e) => setLevel(e.target.value as ServiceLogLevel | "")}
          className="rounded bg-neutral-800 px-2 py-1 text-xs text-neutral-200"
        >
          <option value="">all levels</option>
          {(["trace", "debug", "info", "warn", "error", "fatal"] as const).map(
            (l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ),
          )}
        </select>
        <input
          type="text"
          placeholder="content substring"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="rounded bg-neutral-800 px-2 py-1 text-xs text-neutral-200"
        />
        <button
          type="button"
          onClick={() => force((n) => n + 1)}
          className="rounded bg-neutral-700 px-2 py-1 text-xs text-neutral-200"
        >
          refresh
        </button>
      </div>
      <ul className="flex-1 space-y-1 overflow-y-auto font-mono text-[11px]">
        {logs.map((l, i) => (
          <li
            key={`${l.ts}-${i}`}
            className={`rounded bg-neutral-900 px-2 py-1 ${LEVEL_COLOR[l.level]}`}
          >
            <span className="text-neutral-500">
              {new Date(l.ts).toISOString().slice(11, 19)}
            </span>{" "}
            <span className="uppercase">{l.level}</span>
            {" — "}
            <span>{l.msg}</span>
          </li>
        ))}
        {logs.length === 0 && <li className="text-neutral-500">no logs</li>}
      </ul>
    </div>
  )
}
