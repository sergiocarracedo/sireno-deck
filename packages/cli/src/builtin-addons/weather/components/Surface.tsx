import type { ReactElement } from 'react'

import { ButtonSurface } from '@/addon/api'
import { Text } from '@/ui'

import type { WeatherSnapshot } from '../domain/weather-controller'
import { WmoIcon } from './WmoIcon'

export function Surface({
  snap,
  unavailable,
}: {
  snap?: WeatherSnapshot
  unavailable?: string
}): ReactElement {
  if (!snap?.available) {
    return (
      <ButtonSurface full>
        <div className="flex h-full w-full flex-col items-center justify-center gap-1">
          <WmoIcon code={0} />
          <Text size="xs" tone="foreground">
            {unavailable ?? 'Weather'}
          </Text>
        </div>
      </ButtonSurface>
    )
  }
  const windUnit = snap.source === 'wttr.in' ? 'mph' : 'km/h'
  return (
    <ButtonSurface full>
      <div className="flex h-full w-full flex-col items-center justify-center gap-1">
        <WmoIcon code={snap.weatherCode} />
        <Text size="xl" tone="primary">
          {Math.round(snap.temperature)}°
        </Text>
        <div className="flex w-full items-center justify-between px-2">
          <Text size="xs" tone="foreground">
            {snap.location}
          </Text>
          <Text size="xs" tone="foreground">
            {snap.windSpeed}
            {windUnit} {snap.humidity}%
          </Text>
        </div>
      </div>
    </ButtonSurface>
  )
}
