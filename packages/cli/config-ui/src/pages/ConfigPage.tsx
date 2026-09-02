import { useEffect, useState } from "react"

export interface ConfigPageProps {
  configPath?: string | null
}

export const ConfigPage = ({ configPath }: ConfigPageProps) => {
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
    <div className="h-full overflow-auto">
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
  )
}
