import type { ReactElement } from 'react'

import { Icon, Text } from '@/ui'

import {
  convertTemperature,
  convertWindSpeed,
} from '../../domain/unit-conversion'
import type { WeatherSnapshot } from '../../domain/weather-controller'
import { SurfacePage } from '../../schemas'
import { DailyForecast } from './DailyForecast'
import { Forecast } from './Forecast' // rendered as the 'hourly-forecast' page
import { WmoIcon } from './WmoIcon'

export function Surface({
  snap,
  page,
  units,
}: {
  snap?: WeatherSnapshot
  page?: SurfacePage
  units?: 'metric' | 'imperial'
}): ReactElement {
  if (snap?.status === 'locating') {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-1">
        <Text size="xs" tone="foreground">
          Locating…
        </Text>
      </div>
    )
  }

  if (snap?.status === 'unavailable') {
    const message =
      snap.source === 'location-not-found' ? 'Location not found' : 'Unavailable'
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-1">
        <Text size="xs" tone="foreground">
          {message}
        </Text>
      </div>
    )
  }

  if (!snap) {
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
          {temp.value}
          {temp.units}
        </Text>
      </div>
    ),
    data: (
      <div className="flex h-full w-full flex-col items-center justify-center gap-1">
        <Text size="md" tone="primary">
          {snap.location}
        </Text>
        <div className="flex gap-1">
          <Icon icon="wind" size={14} />
          <Text size="sm" tone="primary">
            {wind.value} {wind.units}
          </Text>
        </div>

        <div className="flex gap-1">
          <Icon icon="droplet" size={14} />
          <Text size="sm" tone="primary">
            {snap.humidity} {wind.units}
          </Text>
        </div>
      </div>
    ),
    'hourly-forecast': <Forecast entries={snap.hourly} units={displayUnits} />,
    'daily-forecast': <DailyForecast entries={snap.daily} units={displayUnits} />,
  }

  return pages[page ?? 'main']
}
