// ponytail: bridge between the global backend (which sees live agent counts)
// and createAgentsDecks (which materializes the deck once per rebuild). The
// backend records the count and page shape here; the deck factory reads them
// to decide how many pages to materialize.
// ponytail: the backend and the deck factory are loaded through two module
// graphs (register-builtins package import vs addon-loader file-path import),
// so plain module state duplicates. Keep the single store on globalThis so
// both graphs share one set of counters.
export const AGENTS_DECK_BASE = "coding-agents:agents"

interface LiveCountStore {
  liveCount: number
  pageCount: number
}

const GLOBAL_KEY = "__sirenoCodingAgentsLiveCount"

const store = (): LiveCountStore => {
  const g = globalThis as unknown as Record<string, LiveCountStore | undefined>
  g[GLOBAL_KEY] ??= { liveCount: 0, pageCount: 1 }
  return g[GLOBAL_KEY] as LiveCountStore
}

export const setLiveCount = (n: number): void => {
  store().liveCount = n
}

export const getLiveCount = (): number => store().liveCount

export const setPageCount = (n: number): void => {
  store().pageCount = n
}

export const getPageCount = (): number => store().pageCount

// ponytail: the deck id the summary button should navigate to. Pagination
// names pages `base-pN`; a single page keeps the base id.
export const deckTarget = (): string =>
  store().pageCount > 1 ? `${AGENTS_DECK_BASE}-p1` : AGENTS_DECK_BASE
