export type DeckTextOverflow = "clip"

export type DeckButtonWrapper = "shared"

export interface DeckTextProps {
  overflow?: DeckTextOverflow
  keyIndex: number
  text: string
}

export interface DeckButtonProps {
  detailLines?: string[]
  displayValue?: string
  overflow?: DeckTextOverflow
  keyIndex: number
  label?: string
  icon?: string
  progress?: number
  subtitle?: string
  variant?: "default" | "emoji" | "fan" | "media" | "metric" | "toggle"
  wrapper?: DeckButtonWrapper
}

export interface DeckSurfaceProps {
  buttons: DeckButtonProps[]
}
