import { useEffect, useState } from "react"
import { Tabs } from "@heroui/react"

export interface ConfigPageProps {
  configPath?: string | null
  editor?: React.ReactNode
}

export const ConfigPage = ({ configPath, editor }: ConfigPageProps) => {
  const [tab, setTab] = useState<"editor" | "config">(
    editor === undefined ? "config" : "editor",
  )
  const [content, setContent] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void fetch("/api/config")
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.text()
      })
      .then((text) => {
        if (!cancelled) setContent(text)
      })
      .catch((err: unknown) => {
        if (!cancelled) setError((err as Error).message)
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (error !== null) {
    return <div className="p-3 text-red-400">Failed: {error}</div>
  }
  if (content === null) {
    return <div className="p-3 text-neutral-500">loading…</div>
  }
  return (
    <div className="flex h-full min-h-0 flex-col">
      <Tabs
        selectedKey={tab}
        onSelectionChange={(key) => setTab(String(key) as "editor" | "config")}
        className="min-h-0 flex-1"
      >
        <Tabs.ListContainer>
          <Tabs.List aria-label="Configuration views">
            <Tabs.Tab id="editor">
              Editor
              <Tabs.Indicator />
            </Tabs.Tab>
            <Tabs.Tab id="config">
              Config
              <Tabs.Indicator />
            </Tabs.Tab>
          </Tabs.List>
        </Tabs.ListContainer>
        <Tabs.Panel id="editor" className="min-h-0 flex-1 overflow-hidden p-4">
          {editor}
        </Tabs.Panel>
        <Tabs.Panel id="config" className="min-h-0 flex-1 overflow-auto">
          <div className="min-h-0 flex-1 overflow-auto">
            {configPath !== null && configPath !== undefined && (
              <div
                data-testid="config-page-path"
                className="border-b border-neutral-800 px-3 py-1 font-mono text-[10px] text-neutral-500"
              >
                {configPath}
              </div>
            )}
            <pre
              data-testid="config-page"
              className="whitespace-pre-wrap p-3 font-mono text-xs text-neutral-200"
            >
              {content}
            </pre>
          </div>
        </Tabs.Panel>
      </Tabs>
    </div>
  )
}
