import type { ReactElement } from 'react'

import { Icon, Text } from '@/ui'

import {
  convertTemperature,
  convertWindSpeed,
} from '../../domain/unit-conversion'
import type { WeatherSnapshot } from '../../domain/weather-controller'
import { SurfacePage } from '../../schemas'
import { Forecast } from './Forecast'
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
    // TODO(50-02): add daily-forecast page here
    'daily-forecast': <Forecast entries={snap.hourly} units={displayUnits} />,
  }

  return pages[page ?? 'main']
}
