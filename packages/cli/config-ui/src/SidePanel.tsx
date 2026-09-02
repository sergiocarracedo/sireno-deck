import logoUrl from "../../src/assets/logo72x72.png"
import { VERSION } from "../../src/version"

import type { WsClient } from "./bridge"

const SECTIONS = [
  { path: "config", label: "Config" },
  { path: "about", label: "About" },
  { path: "addons", label: "Addons", devOnly: true },
  { path: "device", label: "Device", devOnly: true },
  { path: "bridge-logs", label: "Bridge logs", devOnly: true },
  { path: "service-logs", label: "Service logs", devOnly: true },
  { path: "decks", label: "Decks", devOnly: true },
] as const

export interface SidePanelProps {
  readonly activeSection: string
  readonly onSelect: (path: string) => void
  readonly wsClient: WsClient | null
  readonly emulatorMode?: boolean
  readonly devMode?: boolean
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
  emulatorMode = false,
  devMode = false,
}: SidePanelProps) => {
  const status = wsClient?.status() ?? "connecting"
  return (
    <nav
      data-testid="side-panel"
      className="flex w-56 shrink-0 flex-col border-r border-neutral-800 bg-neutral-950"
    >
      <div className="flex items-center gap-3 border-b border-neutral-800 px-4 py-4">
        <img
          src={logoUrl}
          alt="sirenodeck logo"
          className="h-9 w-9 shrink-0 rounded"
        />
        <div className="min-w-0">
          <div className="truncate font-mono text-sm font-semibold text-neutral-100">
            sirenodeck
          </div>
          <div className="font-mono text-[10px] uppercase tracking-widest text-neutral-500">
            UI
          </div>
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <div className="mb-2 flex items-center gap-2 px-3 py-2 font-mono text-[10px] uppercase tracking-widest text-neutral-500">
          <span>ws</span>
          <span data-testid="side-panel-status" className={statusColor(status)}>
            ● {status}
          </span>
        </div>
        {SECTIONS.filter(
          (s) =>
            (s.emulatorOnly !== true || emulatorMode) &&
            (s.devOnly !== true || devMode),
        ).map((s) => {
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
      </div>
      <div className="border-t border-neutral-800 px-4 py-3 font-mono text-[10px] uppercase tracking-widest text-neutral-600">
        v{VERSION}
      </div>
    </nav>
  )
}
