import { cn } from "../utils/cn"
import type { ReactElement } from "react"

import { useThemeUiPresentation } from "../theme-presentation"

export interface ProgressBarProps {
  value: number
  className?: string
  bgColor?: string
  bgColorAlt?: string
}

export function ProgressBar(props: ProgressBarProps): ReactElement {
  const themeUi = useThemeUiPresentation()

  if (themeUi?.primitives?.progressBar) {
    return themeUi.primitives.progressBar(props, undefined, progressBarBase)
  }

  return progressBarBase(props)
}

export function progressBarBase(props: ProgressBarProps): ReactElement {
  const {
    value,
    className,
    bgColor = "bg-primary",
    bgColorAlt = "bg-primary/30",
  } = props
  return (
    <div className={cn("h-2 w-full rounded-4xl", bgColorAlt, className)}>
      <div
        className={cn("h-2 rounded-4xl transition-all", bgColor)}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  )
}
