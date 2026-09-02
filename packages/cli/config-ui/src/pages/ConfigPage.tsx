import { useEffect, useState } from "react"

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
      <div className="flex shrink-0 border-b border-neutral-800" role="tablist">
        {(["editor", "config"] as const).map((id) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className="min-h-11 border-b-2 px-4 text-xs font-semibold uppercase tracking-wider aria-selected:border-sky-400 aria-selected:text-sky-300"
          >
            {id === "editor" ? "Editor" : "Config"}
          </button>
        ))}
      </div>
      {tab === "editor" ? (
        <div className="min-h-0 flex-1 overflow-hidden p-4">{editor}</div>
      ) : (
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
      )}
    </div>
  )
}
