import logoUrl from "../../src/assets/logo72x72.png"
import { VERSION } from "../../src/version"
import { Button } from "@heroui/react"
import {
  Blocks,
  CircleHelp,
  FileText,
  LayoutDashboard,
  Monitor,
  Puzzle,
  Server,
} from "lucide-react"

const SECTIONS = [
  { path: "config", label: "Config", icon: LayoutDashboard },
  { path: "about", label: "About", icon: CircleHelp },
  { path: "addons", label: "Addons", icon: Puzzle, devOnly: true },
  { path: "device", label: "Device", icon: Monitor, devOnly: true },
  { path: "bridge-logs", label: "Bridge logs", icon: Server, devOnly: true },
  {
    path: "service-logs",
    label: "Service logs",
    icon: FileText,
    devOnly: true,
  },
  { path: "decks", label: "Decks", icon: Blocks, devOnly: true },
] as const

export interface SidePanelProps {
  readonly activeSection: string
  readonly onSelect: (path: string) => void
  readonly emulatorMode?: boolean
  readonly devMode?: boolean
  readonly collapsed?: boolean
  readonly deviceSelector?: React.ReactNode
}

export const SidePanel = ({
  activeSection,
  onSelect,
  emulatorMode = false,
  devMode = false,
  collapsed = false,
  deviceSelector,
}: SidePanelProps) => {
  return (
    <nav
      data-testid="side-panel"
      className={`flex shrink-0 flex-col border-r border-neutral-800 bg-[var(--background)] transition-[width] ${collapsed ? "w-16" : "w-64"}`}
    >
      <div
        className={`flex items-center border-b border-neutral-800 py-5 ${collapsed ? "justify-center px-2" : "gap-3 px-5"}`}
      >
        <img
          src={logoUrl}
          alt="sirenodeck logo"
          className="h-9 w-9 shrink-0 rounded"
        />
        {!collapsed && (
          <div className="min-w-0">
            <div className="truncate font-mono text-sm font-semibold text-neutral-100">
              sirenodeck
            </div>
            <div className="font-mono text-[10px] uppercase tracking-widest text-neutral-500">
              UI
            </div>
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3">
        {!collapsed && deviceSelector}
        {SECTIONS.filter(
          (s) =>
            (s.emulatorOnly !== true || emulatorMode) &&
            (s.devOnly !== true || devMode),
        ).map((s) => {
          const active = activeSection === s.path
          return (
            <Button
              key={s.path}
              type="button"
              onPress={() => onSelect(s.path)}
              variant={active ? "secondary" : "tertiary"}
              data-testid={`side-panel-${s.path}`}
              aria-current={active ? "page" : undefined}
              title={collapsed ? s.label : undefined}
              className={`w-full justify-start rounded-full px-3 text-sm ${collapsed ? "justify-center px-0" : ""} ${active ? "" : "bg-transparent"}`}
            >
              <s.icon size={17} aria-hidden="true" />
              {!collapsed && s.label}
            </Button>
          )
        })}
      </div>
      <div
        className={`${collapsed ? "hidden" : "block"} border-t border-neutral-800 px-4 py-3 font-mono text-[10px] uppercase tracking-widest text-neutral-500`}
      >
        v{VERSION}
      </div>
    </nav>
  )
}
