import { cn } from "../utils/cn"
import type { ReactElement } from "react"

export const ProgressBar = ({
  value,
  className,
  bgColor = "bg-primary",
  bgColorAlt = "bg-primary/30",
}: {
  value: number
  className?: string
  bgColor?: string
  bgColorAlt?: string
}): ReactElement => {
  return (
    <div className={cn("h-2 w-full rounded-4xl", bgColorAlt, className)}>
      <div
        className={cn("h-2 rounded-4xl transition-all", bgColor)}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  )
}
