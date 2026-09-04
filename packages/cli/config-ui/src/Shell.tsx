import { SidePanel } from "./SidePanel"
import { useState } from "react"
import { PanelLeft, PanelLeftClose } from "lucide-react"

export interface ShellProps {
  readonly activeSection: string
  readonly onSelect: (path: string) => void
  readonly content: React.ReactNode
  readonly hideSidebar?: boolean
  readonly emulatorMode?: boolean
  readonly devMode?: boolean
  readonly deviceSelector?: React.ReactNode
  readonly pageTitle: string
  readonly wsUrl: string
  readonly frontendUrl: string
  readonly connectionStatus: string
}

export const Shell = ({
  activeSection,
  onSelect,
  content,
  hideSidebar = false,
  emulatorMode = false,
  devMode = false,
  deviceSelector,
  pageTitle,
  wsUrl,
  frontendUrl,
  connectionStatus,
}: ShellProps) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  if (hideSidebar) {
    return (
      <main
        data-testid="config-ui-shell"
        className="flex h-screen flex-1 overflow-hidden bg-neutral-900 text-neutral-100"
      >
        {content}
      </main>
    )
  }
  return (
    <div
      data-testid="config-ui-shell"
      className="flex h-screen bg-neutral-900 text-neutral-100"
    >
      <SidePanel
        activeSection={activeSection}
        onSelect={onSelect}
        emulatorMode={emulatorMode}
        devMode={devMode}
        collapsed={sidebarCollapsed}
        deviceSelector={deviceSelector}
      />
      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex min-h-14 shrink-0 flex-wrap items-center gap-3 border-b border-[var(--border)] bg-[var(--background)] px-4 py-2">
          <button
            type="button"
            aria-label={
              sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"
            }
            onClick={() => setSidebarCollapsed((value) => !value)}
            className="rounded-lg p-2 text-[var(--muted)] hover:bg-[var(--surface-secondary)] hover:text-[var(--foreground)]"
          >
            {sidebarCollapsed ? (
              <PanelLeft size={18} />
            ) : (
              <PanelLeftClose size={18} />
            )}
          </button>
          <h1 className="min-w-0 flex-1 truncate text-sm font-semibold text-[var(--foreground)]">
            {pageTitle}
          </h1>
          <div className="flex min-w-0 flex-wrap items-center justify-end gap-x-3 gap-y-1 font-mono text-[10px] uppercase tracking-wider text-[var(--muted)]">
            <span className="whitespace-nowrap">
              ws:{" "}
              <strong
                className={
                  connectionStatus === "open"
                    ? "text-emerald-400"
                    : "text-amber-400"
                }
              >
                {connectionStatus}
              </strong>
            </span>
            <span className="hidden truncate sm:inline" title={wsUrl}>
              ws://{wsUrl.replace(/^wss?:\/\//, "")}
            </span>
            <span className="hidden truncate md:inline" title={frontendUrl}>
              fe: {frontendUrl}
            </span>
          </div>
        </header>
        <div className="min-h-0 flex-1">{content}</div>
      </main>
    </div>
  )
}
