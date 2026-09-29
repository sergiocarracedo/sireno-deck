import { SidePanel } from "./SidePanel"
import { useState } from "react"
import { PanelLeft, PanelLeftClose } from "lucide-react"
import { Button } from "@heroui/react"

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
        className="flex h-[100dvh] w-full flex-1 overflow-hidden bg-background text-foreground"
      >
        {content}
      </main>
    )
  }
  return (
    <div
      data-testid="config-ui-shell"
      className="flex h-screen bg-background text-foreground"
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
        <header className="flex min-h-14 shrink-0 flex-wrap items-center gap-3 border-b border-separator bg-background px-4 py-2">
          <Button
            type="button"
            isIconOnly
            variant="tertiary"
            aria-label={
              sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"
            }
            onPress={() => setSidebarCollapsed((value) => !value)}
          >
            {sidebarCollapsed ? (
              <PanelLeft size={18} />
            ) : (
              <PanelLeftClose size={18} />
            )}
          </Button>
          <h1 className="min-w-0 flex-1 truncate text-sm font-semibold">
            {pageTitle}
          </h1>
          <div className="flex min-w-0 flex-wrap items-center justify-end gap-x-3 gap-y-1 text-xs text-muted">
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
            <a
              href={frontendUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden truncate text-sky-400 hover:underline md:inline"
              title={frontendUrl}
            >
              fe: {frontendUrl}
            </a>
          </div>
        </header>
        <div className="min-h-0 flex-1">{content}</div>
      </main>
    </div>
  )
}
