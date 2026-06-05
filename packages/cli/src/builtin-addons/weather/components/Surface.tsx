import type { ReactElement } from 'react'

import { Text } from '@/ui'

import type { WeatherSnapshot } from '../domain/weather-controller'
import {
  convertTemperature,
  convertWindSpeed,
} from '../domain/unit-conversion'
import { WmoIcon } from './WmoIcon'

export const surfacePages = ['main', 'data', 'prev'] as const
export type SurfacePage = (typeof surfacePages)[number]

export function Surface({
  snap,
  page,
  units,
}: {
  snap?: WeatherSnapshot
  unavailable?: string
  page?: SurfacePage
  units?: 'metric' | 'imperial'
}): ReactElement {
  if (!snap?.available) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-1">
        <Text size="xs" tone="foreground">
          Unavailable
        </Text>
      </div>
    )
  }

  const displayUnits = units ?? 'metric'
  const temp = convertTemperature(snap.temperature, displayUnits)
  const wind = convertWindSpeed(snap.windSpeed, displayUnits)

  const pages: Record<SurfacePage, ReactElement> = {
    main: (
      <div className="flex h-full w-full flex-col items-center justify-center gap-1">
        <WmoIcon code={snap.weatherCode} />
        <Text size="xl" tone="primary">
          {temp.value}{temp.units}
        </Text>
      </div>
    ),
    data: (
      <div className="flex h-full w-full flex-col items-center justify-center gap-1">
        <Text size="md" tone="primary">
          {snap.location}
        </Text>
        <Text size="xl" tone="primary">
          W: {wind.value}{wind.units}
        </Text>
      </div>
    ),
  }

  return pages[page ?? 'main']
}
