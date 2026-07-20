import { useEffect, useState } from "react"

export const ConfigPage = () => {
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
    <pre
      data-testid="config-page"
      className="h-full overflow-auto whitespace-pre-wrap p-3 font-mono text-xs text-neutral-200"
    >
      {content}
    </pre>
  )
}
