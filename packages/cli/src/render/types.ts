// Legacy compatibility-only render description seam.
// Phase 18 moves shipped button authoring to DOM-authored button components;
// these types remain only for the SVG fallback path and focused compatibility tests.
export type DeckTextFit = "shrink" | "wrap"

export type DeckButtonWrapper = "shared"

export interface DeckTextProps {
  background?: string
  fit?: DeckTextFit
  keyIndex: number
  text: string
}

export interface DeckButtonProps {
  accent?: string
  background?: string
  detailLines?: string[]
  displayValue?: string
  fit?: DeckTextFit
  full_surface?: boolean
  keyIndex: number
  label?: string
  icon?: string
  progress?: number
  style_id?: string
  subtitle?: string
  toggle_mode?: "get-set" | "internal" | "toggle-status"
  variant?: "analog-clock" | "calendar-sheet" | "default" | "emoji" | "error" | "fan" | "media" | "metric" | "toggle"
  wrapper?: DeckButtonWrapper
  wrapper_id?: string
}

export interface DeckSurfaceProps {
  background?: string
  buttons: DeckButtonProps[]
}
