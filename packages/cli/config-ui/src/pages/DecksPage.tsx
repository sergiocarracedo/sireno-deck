interface DeckLink {
  target: string
  label?: string
}

interface DeckNode {
  id: string
  name: string
  isOverlay: boolean
  links: DeckLink[]
}

interface DeckTree {
  rootId: string
  decks: DeckNode[]
}

const DeckNodeRow = ({
  node,
  depth,
  visited,
}: {
  node: DeckNode
  depth: number
  visited: Set<string>
}): React.ReactNode => {
  const paddingLeft = depth * 16
  return (
    <div key={node.id}>
      <div
        className="flex items-center gap-2 py-1 font-mono text-xs"
        style={{ paddingLeft }}
      >
        <span
          className={node.isOverlay ? "text-amber-400" : "text-neutral-300"}
        >
          {node.isOverlay ? "◎" : "○"}
        </span>
        <span className="text-neutral-200">{node.name}</span>
        <span className="text-neutral-600">#{node.id}</span>
      </div>
      {node.links.map((link) => {
        if (visited.has(link.target)) return null
        return (
          <div key={link.target} style={{ paddingLeft }}>
            <span className="mr-2 font-mono text-[10px] text-neutral-500">
              →
            </span>
            <span className="font-mono text-xs text-sky-400">
              {link.label ?? link.target}
            </span>
          </div>
        )
      })}
    </div>
  )
}

export const DecksPage = ({
  deckTree,
}: {
  deckTree: DeckTree | null
}): React.ReactElement => {
  if (deckTree === null) {
    return (
      <p className="font-mono text-xs uppercase tracking-widest text-neutral-500">
        No deck tree received.
      </p>
    )
  }

  const nodeMap = new Map<string, DeckNode>()
  for (const deck of deckTree.decks) {
    nodeMap.set(deck.id, deck)
  }

  const visited = new Set<string>()

  const render = (deckId: string, depth: number): React.ReactNode => {
    const node = nodeMap.get(deckId)
    if (node === undefined) return null
    visited.add(deckId)
    return (
      <div key={deckId}>
        <DeckNodeRow node={node} depth={depth} visited={visited} />
        {node.links.map((link) => {
          if (visited.has(link.target)) return null
          const child = nodeMap.get(link.target)
          if (child === undefined) return null
          return render(link.target, depth + 1)
        })}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="mb-2 font-mono text-[10px] uppercase tracking-widest text-neutral-500">
        Deck tree ({deckTree.decks.length} decks)
      </div>
      {render(deckTree.rootId, 0)}
    </div>
  )
}
