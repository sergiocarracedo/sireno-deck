export interface DeckTextProps {
  keyIndex: number
  text: string
}

export interface DeckButtonProps {
  detailLines?: string[]
  displayValue?: string
  keyIndex: number
  label?: string
  icon?: string
  progress?: number
  subtitle?: string
  variant?: "default" | "emoji" | "fan" | "media" | "metric" | "toggle"
}

export interface DeckSurfaceProps {
  buttons: DeckButtonProps[]
}
