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

const statusColor = (status: string): string => {
  if (status === "open") return "text-emerald-400"
  if (status === "connecting") return "text-amber-400"
  return "text-red-400"
}

export const SidePanel = ({
  activeSection,
  onSelect,
  wsClient,
}: SidePanelProps) => {
  const status = wsClient?.status() ?? "connecting"
  return (
    <nav
      data-testid="side-panel"
      className="flex w-56 shrink-0 flex-col gap-1 border-r border-neutral-800 bg-neutral-950 p-3"
    >
      <div className="mb-3 flex items-center gap-2 px-3 py-2 font-mono text-[10px] uppercase tracking-widest text-neutral-500">
        <span>ws</span>
        <span data-testid="side-panel-status" className={statusColor(status)}>
          ● {status}
        </span>
      </div>
      {SECTIONS.map((s) => {
        const active = activeSection === s.path
        return (
          <button
            key={s.path}
            type="button"
            onClick={() => onSelect(s.path)}
            data-testid={`side-panel-${s.path}`}
            aria-current={active ? "page" : undefined}
            className={`cursor-pointer rounded px-3 py-2 text-left font-mono text-xs transition-colors ${
              active
                ? "bg-sky-500/30 text-sky-100 ring-1 ring-sky-400/50"
                : "text-neutral-300 hover:bg-neutral-800 hover:text-neutral-100"
            }`}
          >
            {s.label}
          </button>
        )
      })}
    </nav>
  )
}
