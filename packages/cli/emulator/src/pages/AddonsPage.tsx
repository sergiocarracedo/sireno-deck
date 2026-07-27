import { useEffect, useState } from "react"

interface DeckInfo {
  id: string
  isOverlay: boolean
  paginated: boolean
  buttons: number
  internal: boolean
}

interface AddonInfo {
  name: string
  path: string
  internal: boolean
  source: string
  buttonTypes: string[]
  defaultButton: string | null
  decks: DeckInfo[]
}

interface AddonInventory {
  addons: AddonInfo[]
}

const groupPaginated = (decks: DeckInfo[]): DeckInfo[] => {
  const groups = new Map<string, DeckInfo>()
  for (const deck of decks) {
    const match = deck.id.match(/^(.+)-p(\d+)$/)
    if (match?.[1] !== undefined && deck.paginated) {
      const base = match[1]
      if (!groups.has(base)) {
        groups.set(base, { ...deck, id: base })
      }
    } else {
      groups.set(deck.id, deck)
    }
  }
  return [...groups.values()]
}

const suffix = (items: string[]): string =>
  items.length > 0 ? ` ${items.join(" ")}` : ""

const Chip = ({
  label,
  tone,
  emoji,
}: {
  label: string
  tone: "deck" | "overlay" | "button" | "internal"
  emoji?: string
}) => {
  const cls =
    tone === "deck"
      ? "border-amber-500/60 text-amber-300 bg-amber-500/10"
      : tone === "overlay"
        ? "border-red-500/60 text-red-300 bg-red-500/10"
        : tone === "button"
          ? "border-sky-500/60 text-sky-300 bg-sky-500/10"
          : "border-emerald-500/60 text-emerald-300 bg-emerald-500/10"
  return (
    <span
      className={`inline-block rounded-full border px-2 py-0 font-mono text-[10px] font-bold uppercase tracking-wide ${cls}`}
    >
      {label}
      {emoji !== undefined ? suffix([emoji]) : ""}
    </span>
  )
}

export interface AddonsPageProps {
  addonInventory?: AddonInventory | null
}

export const AddonsPage = ({ addonInventory }: AddonsPageProps) => {
  const [data, setData] = useState<AddonInventory | null>(
    addonInventory ?? null,
  )
  const [error, setError] = useState<string | null>(null)
  const [fetching, setFetching] = useState(addonInventory === undefined)

  useEffect(() => {
    if (addonInventory !== undefined) return
    let cancelled = false
    void fetch("/api/addons")
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json() as Promise<{ addons: AddonInfo[] }>
      })
      .then((payload) => {
        if (!cancelled) {
          setData(payload)
          setFetching(false)
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError((err as Error).message)
          setFetching(false)
        }
      })
    return () => {
      cancelled = true
    }
  }, [addonInventory])

  if (fetching) {
    return <div className="p-3 text-neutral-500">loading…</div>
  }
  if (error !== null) {
    return (
      <div className="p-3 text-red-400">Failed to load addons: {error}</div>
    )
  }
  if (data === null) {
    return <div className="p-3 text-neutral-500">loading…</div>
  }

  const deckLabel = (deck: DeckInfo, addonInternal: boolean): string => {
    const emojis: string[] = []
    if (deck.isOverlay) emojis.push("◐")
    else if (deck.paginated) emojis.push("⠿")
    if (addonInternal || deck.internal) emojis.push("🔒")
    return emojis.length > 0 ? `${deck.id} ${emojis.join(" ")}` : deck.id
  }

  const btnLabel = (bt: string, addonInternal: boolean): string =>
    addonInternal ? `${bt} 🔒` : bt

  return (
    <div className="space-y-3 p-3" data-testid="addons-page">
      <div
        data-testid="addons-legend"
        className="flex flex-wrap gap-2 border-b border-neutral-800 pb-2 text-[10px] text-neutral-400"
      >
        <span className="font-semibold uppercase tracking-wide">Legend:</span>
        <Chip label="deck" tone="deck" />
        <Chip label="overlay ◐" tone="overlay" />
        <Chip label="paginated ⠿" tone="deck" />
        <Chip label="button" tone="button" />
        <Chip label="internal 🔒" tone="internal" />
      </div>

      {data.addons.map((addon) => (
        <section
          key={addon.name}
          className="rounded-lg border border-neutral-800 bg-neutral-950 p-3"
        >
          <div className="flex items-baseline gap-2">
            <h3 className="font-mono text-sm font-semibold text-neutral-100">
              {addon.name}
            </h3>
            {addon.internal && <Chip label="internal 🔒" tone="internal" />}
            <span className="font-mono text-[10px] text-neutral-500">
              {addon.path}
            </span>
          </div>

          <div className="mt-2 flex flex-wrap gap-1.5">
            {groupPaginated(addon.decks).map((deck) => (
              <span key={deck.id} className="inline-flex items-center gap-1">
                <Chip
                  label={deckLabel(deck, addon.internal)}
                  tone={deck.isOverlay ? "overlay" : "deck"}
                />
              </span>
            ))}
            {addon.buttonTypes.map((bt) => (
              <Chip
                key={bt}
                label={btnLabel(bt, addon.internal)}
                tone="button"
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
