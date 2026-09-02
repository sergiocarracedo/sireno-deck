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

const COMPONENT_COLOR: Record<string, string> = {
  runtime: "text-cyan-300",
  methods: "text-cyan-300",
  executor: "text-cyan-300",
  "state-publisher": "text-cyan-300",
  real: "text-emerald-300",
  emulator: "text-emerald-300",
  "ws-bridge": "text-fuchsia-300",
  "addon-handler": "text-fuchsia-300",
  "active-app": "text-amber-300",
  "key-macro": "text-amber-300",
  clipboard: "text-amber-300",
  notification: "text-amber-300",
  session: "text-amber-300",
  "browser-renderer": "text-blue-300",
  "emulator-server": "text-blue-300",
  daemon: "text-blue-300",
  requirements: "text-blue-300",
  orchestrator: "text-cyan-300",
  cli: "text-neutral-400",
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
            {l.component !== undefined && (
              <>
                {" "}
                <span
                  className={COMPONENT_COLOR[l.component] ?? "text-neutral-400"}
                >
                  [{l.component}]
                </span>
              </>
            )}
            {" — "}
            <span>{l.msg}</span>
            {(l.deckId !== undefined ||
              l.position !== undefined ||
              l.addonName !== undefined ||
              l.gesture !== undefined ||
              l.keyIndex !== undefined) && (
              <span className="text-neutral-500">
                {[
                  l.deckId !== undefined ? `deckId=${l.deckId}` : null,
                  l.position !== undefined ? `position=${l.position}` : null,
                  l.addonName !== undefined ? `addon=${l.addonName}` : null,
                  l.gesture !== undefined ? `gesture=${l.gesture}` : null,
                  l.keyIndex !== undefined ? `keyIndex=${l.keyIndex}` : null,
                ]
                  .filter((s) => s !== null)
                  .join(", ")}
              </span>
            )}
          </li>
        ))}
        {logs.length === 0 && <li className="text-neutral-500">no logs</li>}
      </ul>
    </div>
  )
}
