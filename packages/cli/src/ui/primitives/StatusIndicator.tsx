import type { ReactElement } from "react"
import type { ChipTone } from "./Chip"

const TONE_CLASS: Record<ChipTone, string> = {
  accent: "bg-accent text-accent",
  danger: "bg-danger text-danger",
  foreground: "bg-foreground text-foreground",
  primary: "bg-primary text-primary",
  success: "bg-success text-success",
  muted: "bg-grey text-grey",
}

export interface StatusIndicatorProps {
  label: string
  tone: ChipTone
  glow?: boolean
}

export function StatusIndicator({
  label,
  tone,
  glow = false,
}: StatusIndicatorProps): ReactElement {
  return (
    <span
      role="img"
      aria-label={label}
      className={`inline-block shrink-0 rounded-full ${TONE_CLASS[tone]}`}
      style={{
        width: 40,
        height: 7,
        boxShadow: glow ? "0 0 6px currentColor" : undefined,
      }}
    />
  )
}
