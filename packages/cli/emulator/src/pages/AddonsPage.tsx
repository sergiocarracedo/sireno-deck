import { useEffect, useState } from "react"

interface DeckInfo {
  id: string
  isOverlay: boolean
  paginated: boolean
  buttons: number
  internal: boolean
}

interface ButtonTypeInfo {
  type: string
  internal: boolean
}

interface AddonInfo {
  name: string
  path: string
  internal: boolean
  source: string
  buttonTypes: ButtonTypeInfo[]
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

const stripAddonPrefix = (id: string): string => {
  const idx = id.indexOf(":")
  return idx >= 0 ? id.slice(idx + 1) : id
}

const deckModifiers = (deck: DeckInfo): string[] => {
  const out: string[] = []
  if (deck.isOverlay) out.push("◐")
  else if (deck.paginated) out.push("⠿")
  if (deck.internal) out.push("🔒")
  return out
}

const Chip = ({
  id,
  label,
  tone,
  modifiers,
}: {
  id: string
  label: string
  tone: "deck" | "button"
  modifiers?: string[]
}) => {
  const cls =
    tone === "deck"
      ? "border-sky-500/60 text-sky-300 bg-sky-500/10"
      : "border-emerald-500/60 text-emerald-300 bg-emerald-500/10"
  const modSuffix =
    modifiers !== undefined && modifiers.length > 0
      ? ` ${modifiers.join("")}`
      : ""
  return (
    <span
      title={id}
      className={`inline-block rounded-full border px-2 py-0 font-mono text-[10px] font-bold uppercase tracking-wide ${cls}`}
    >
      {label}
      {modSuffix}
    </span>
  )
}

const LegendModifier = ({ emoji, label }: { emoji: string; label: string }) => (
  <span className="inline-flex items-center gap-1 text-neutral-400">
    <span aria-hidden="true">{emoji}</span>
    <span>{label}</span>
  </span>
)

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

  return (
    <div className="space-y-3 p-3" data-testid="addons-page">
      <div
        data-testid="addons-legend"
        className="flex flex-wrap items-center gap-2 border-b border-neutral-800 pb-2 text-[10px] text-neutral-400"
      >
        <span className="font-semibold uppercase tracking-wide">Legend:</span>
        <Chip id="kind-deck" label="deck" tone="deck" />
        <Chip id="kind-button" label="button" tone="button" />
        <LegendModifier emoji="◐" label="overlay" />
        <LegendModifier emoji="⠿" label="paginated" />
        <LegendModifier emoji="🔒" label="internal" />
        <LegendModifier emoji="📦" label="builtin" />
      </div>

      {data.addons.map((addon) => (
        <section
          key={addon.name}
          className="rounded-lg border border-neutral-800 bg-neutral-950 p-3"
        >
          <div className="flex items-baseline gap-2">
            <h3 className="font-mono text-sm font-semibold text-neutral-100">
              {addon.name}
              {addon.internal === true && (
                <span
                  title="builtin addon"
                  className="ml-1.5 font-mono text-[10px] text-neutral-500"
                >
                  📦
                </span>
              )}
            </h3>
            <span className="font-mono text-[10px] text-neutral-500">
              {addon.path}
            </span>
          </div>

          <div className="mt-2 flex flex-wrap gap-1.5">
            {groupPaginated(addon.decks).map((deck) => (
              <Chip
                key={deck.id}
                id={deck.id}
                label={stripAddonPrefix(deck.id)}
                tone="deck"
                modifiers={deckModifiers(deck)}
              />
            ))}
            {addon.buttonTypes.map((bt) => (
              <Chip
                key={bt.type}
                id={bt.type}
                label={stripAddonPrefix(bt.type)}
                tone="button"
                modifiers={bt.internal ? ["🔒"] : []}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
