export interface AddonGeneratedDeck {
  name?: string
  icon?: string
  background?: string
  buttonColor?: "blue" | "green" | "purple"
  buttons?: unknown[]
  paginated?: boolean
  trigger?: {
    process_name?: string | string[]
    window_name?: string | string[]
  }
  autoShow?: boolean
  isOverlay?: boolean
}

export type AddonDeckEntry = AddonGeneratedDeck & {
  id: string
  createDeck?: never
  createDecks?: never
}

export interface AddonManifestV1 {
  readonly apiVersion: 1
  readonly name: string
  readonly buttonTypes: Readonly<Record<string, unknown>>
  readonly decks?: ReadonlyArray<AddonDeckEntry>
}
