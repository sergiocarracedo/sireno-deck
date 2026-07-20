import { useEffect, useState } from "react"

interface AddonInfo {
  name: string
  buttonTypes: string[]
  defaultButton: string | null
}

interface AddonPayload {
  addons: AddonInfo[]
}

export const AddonsPage = () => {
  const [data, setData] = useState<AddonPayload | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void fetch("/api/addons")
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json() as Promise<AddonPayload>
      })
      .then((payload) => {
        if (!cancelled) setData(payload)
      })
      .catch((err: unknown) => {
        if (!cancelled) setError((err as Error).message)
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (error !== null) {
    return (
      <div className="p-3 text-red-400">Failed to load addons: {error}</div>
    )
  }
  if (data === null) {
    return <div className="p-3 text-neutral-500">loading…</div>
  }
  return (
    <div className="space-y-3 p-3" data-testid="addons-page">
      {data.addons.map((addon) => (
        <section
          key={addon.name}
          className="rounded-lg border border-neutral-800 bg-neutral-950 p-3"
        >
          <h3 className="font-mono text-sm font-semibold text-neutral-100">
            {addon.name}
          </h3>
          <ul className="mt-2 space-y-1 font-mono text-xs text-neutral-400">
            {addon.buttonTypes.map((bt) => (
              <li key={bt}>
                <span className="text-neutral-200">{bt}</span>
                {addon.defaultButton === bt && (
                  <span className="ml-2 text-amber-400">[default]</span>
                )}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
