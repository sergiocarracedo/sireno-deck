import { SidePanel } from "./SidePanel"

export interface ShellProps {
  readonly activeSection: string
  readonly onSelect: (path: string) => void
  readonly content: React.ReactNode
  readonly wsClient: import("./bridge").WsClient | null
  readonly hideSidebar?: boolean
  readonly emulatorMode?: boolean
  readonly devMode?: boolean
}

export const Shell = ({
  activeSection,
  onSelect,
  content,
  wsClient,
  hideSidebar = false,
  emulatorMode = false,
  devMode = false,
}: ShellProps) => {
  if (hideSidebar) {
    return (
      <main
        data-testid="emulator-shell"
        className="flex h-screen flex-1 overflow-hidden bg-neutral-900 text-neutral-100"
      >
        {content}
      </main>
    )
  }
  return (
    <div
      data-testid="emulator-shell"
      className="flex h-screen bg-neutral-900 text-neutral-100"
    >
      <SidePanel
        activeSection={activeSection}
        onSelect={onSelect}
        wsClient={wsClient}
        emulatorMode={emulatorMode}
        devMode={devMode}
      />
      <main className="flex-1 overflow-hidden">{content}</main>
    </div>
  )
}
