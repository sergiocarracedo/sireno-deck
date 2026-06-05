import type { ReactElement } from 'react'

import { Text } from '@/ui'

import { convertTemperature } from '../../domain/unit-conversion'
import type { HourlyForecastEntry } from '../../domain/weather-controller'
import { WmoIcon } from './WmoIcon'

export function Forecast({
  entries,
  units,
}: {
  entries: HourlyForecastEntry[]
  units: 'metric' | 'imperial'
}): ReactElement {
  if (entries.length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Text size="xs" tone="foreground">
          No forecast
        </Text>
      </div>
    )
  }
  return (
    <div className="flex h-full w-full items-stretch justify-between gap-0.5 px-1">
      {entries.map((entry, index) => {
        const temp = convertTemperature(entry.temperature, units)
        return (
          <div
            className="flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5"
            // eslint-disable-next-line react/no-array-index-key
            key={`${entry.time}-${index}`}
          >
            <Text size="xs" tone="primary">
              {entry.time}
            </Text>
            <WmoIcon code={entry.weatherCode} size={14} />
            <Text size="xs" tone="primary">
              {temp.value}
              {temp.units}
            </Text>
            <Text size="xs" tone="foreground">
              {entry.precipitationChance}%
            </Text>
          </div>
        )
      })}
    </div>
  )
}
