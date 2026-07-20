import { useState } from "react"

import type { WsClient } from "./bridge"

const SECTIONS = [
  { path: "device", label: "Device" },
  { path: "bridge-logs", label: "Bridge logs" },
  { path: "service-logs", label: "Service logs" },
  { path: "addons", label: "Addons" },
  { path: "config", label: "Config" },
] as const

export interface SidePanelProps {
  readonly activeSection: string
  readonly onSelect: (path: string) => void
  readonly wsClient: WsClient | null
}

export const SidePanel = ({
  activeSection,
  onSelect,
  wsClient,
}: SidePanelProps) => {
  const [status] = useState(wsClient?.status() ?? "connecting")
  return (
    <nav
      data-testid="side-panel"
      className="flex w-44 flex-col gap-1 border-r border-neutral-800 bg-neutral-950 p-3"
    >
      <div className="mb-2 font-mono text-[10px] uppercase tracking-widest text-neutral-500">
        ws: {status}
      </div>
      {SECTIONS.map((s) => (
        <button
          key={s.path}
          type="button"
          onClick={() => onSelect(s.path)}
          data-testid={`side-panel-${s.path}`}
          className={`rounded px-3 py-2 text-left font-mono text-xs transition ${
            activeSection === s.path
              ? "bg-sky-600/40 text-sky-100"
              : "text-neutral-300 hover:bg-neutral-800"
          }`}
        >
          {s.label}
        </button>
      ))}
    </nav>
  )
}
