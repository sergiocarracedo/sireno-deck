// ponytail: module-level bridge between the global backend (which sees live
// agent counts) and createAgentsDecks (which materializes the deck once per
// rebuild). The backend records the count and page shape here; the deck
// factory reads them to decide how many pages to materialize.
export const AGENTS_DECK_BASE = "coding-agents:agents"

let liveCount = 0
let pageCount = 1

export const setLiveCount = (n: number): void => {
  liveCount = n
}

export const getLiveCount = (): number => liveCount

export const setPageCount = (n: number): void => {
  pageCount = n
}

export const getPageCount = (): number => pageCount

// ponytail: the deck id the summary button should navigate to. Pagination
// names pages `base-pN`; a single page keeps the base id.
export const deckTarget = (): string =>
  pageCount > 1 ? `${AGENTS_DECK_BASE}-p1` : AGENTS_DECK_BASE
