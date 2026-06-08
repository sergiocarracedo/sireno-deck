import type { ReactElement } from "react"

import { Text } from "@/ui/index"

export interface BrightnessSurfaceProps {
  percentage: number
}

const CYCLE: readonly number[] = [0, 25, 50, 75, 100]

export function nextPercentage(current: number): number {
  for (let i = 0; i < CYCLE.length; i += 1) {
    const value = CYCLE[i]!
    if (value === current) {
      return CYCLE[(i + 1) % CYCLE.length]!
    }
  }
  return 25
}

export function BrightnessSurface(props: BrightnessSurfaceProps): ReactElement {
  const { percentage } = props
  return (
    <div
      className="flex h-full w-full flex-col items-center justify-center gap-1"
      data-sireno-brightness-surface="true"
    >
      <Text
        align="center"
        className="text-3xl font-bold"
        data-sireno-brightness-percentage="true"
        size="3xl"
        tone="primary"
        typography="main"
      >
        {percentage}%
      </Text>
      <Text
        align="center"
        className="sireno-brightness-tap-hint opacity-75"
        size="xs"
        tone="foreground"
        typography="aux"
      >
        Tap to cycle
      </Text>
    </div>
  )
}
