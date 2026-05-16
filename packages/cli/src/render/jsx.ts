import type { DeckButtonProps, DeckSurfaceProps, DeckTextProps } from "./types.js"

interface DeckIntrinsicElements {
  "deck-button": DeckButtonProps
  "deck-surface": DeckSurfaceProps
  "deck-text": DeckTextProps
}

declare module "react" {
  namespace JSX {
    interface IntrinsicElements extends DeckIntrinsicElements {}
  }
}

declare module "react/jsx-runtime" {
  namespace JSX {
    interface IntrinsicElements extends DeckIntrinsicElements {}
  }
}

export {}
