export type DeckTextFit = "shrink" | "wrap"

export type DeckButtonWrapper = "shared"

export interface DeckTextProps {
  background?: string
  fit?: DeckTextFit
  keyIndex: number
  text: string
}

export interface DeckButtonProps {
  background?: string
  detailLines?: string[]
  displayValue?: string
  fit?: DeckTextFit
  keyIndex: number
  label?: string
  icon?: string
  progress?: number
  subtitle?: string
  variant?: "analog-clock" | "calendar-sheet" | "default" | "emoji" | "fan" | "media" | "metric" | "toggle"
  wrapper?: DeckButtonWrapper
}

export interface DeckSurfaceProps {
  background?: string
  buttons: DeckButtonProps[]
}
