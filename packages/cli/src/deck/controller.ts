import type { DeckConfig } from "../core/schemas.js"

export interface DeckControllerOptions {
  decks: Record<string, DeckConfig>
  mainDeckId: string
}

export interface DeckController {
  canGoBack: () => boolean
  getActiveDeck: () => DeckConfig
  getActiveDeckId: () => string
  goBack: () => DeckConfig
  navigateTo: (deckId: string) => DeckConfig
}

export class DeckNavigationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "DeckNavigationError"
  }
}

export function createDeckController(options: DeckControllerOptions): DeckController {
  const mainDeck = options.decks[options.mainDeckId]
  if (!mainDeck) {
    throw new DeckNavigationError(`Main deck '${options.mainDeckId}' is not defined`)
  }

  const stack = [options.mainDeckId]

  function getDeck(deckId: string): DeckConfig {
    const deck = options.decks[deckId]
    if (!deck) {
      throw new DeckNavigationError(`Deck '${deckId}' is not defined`)
    }

    return deck
  }

  return {
    canGoBack() {
      return stack.length > 1
    },
    getActiveDeck() {
      return getDeck(stack[stack.length - 1] ?? options.mainDeckId)
    },
    getActiveDeckId() {
      return stack[stack.length - 1] ?? options.mainDeckId
    },
    goBack() {
      if (stack.length > 1) {
        stack.pop()
      }

      return getDeck(stack[stack.length - 1] ?? options.mainDeckId)
    },
    navigateTo(deckId) {
      const nextDeck = getDeck(deckId)
      stack.push(deckId)
      return nextDeck
    },
  }
}
