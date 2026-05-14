import type { DeckButtonProps, DeckSurfaceProps, DeckTextProps } from "./reconciler.js"

declare global {
  namespace JSX {
    interface IntrinsicElements {
      "deck-button": DeckButtonProps
      "deck-surface": DeckSurfaceProps
      "deck-text": DeckTextProps
    }
  }
}

export {}
