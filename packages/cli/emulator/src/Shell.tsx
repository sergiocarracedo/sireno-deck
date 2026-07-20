import { SidePanel } from "./SidePanel"

export interface ShellProps {
  readonly activeSection: string
  readonly onSelect: (path: string) => void
  readonly content: React.ReactNode
  readonly wsClient: import("./bridge").WsClient | null
}

export const Shell = ({
  activeSection,
  onSelect,
  content,
  wsClient,
}: ShellProps) => {
  return (
    <div className="flex h-screen bg-neutral-900 text-neutral-100">
      <SidePanel
        activeSection={activeSection}
        onSelect={onSelect}
        wsClient={wsClient}
      />
      <main className="flex-1 overflow-hidden">{content}</main>
    </div>
  )
}
