import type { ReactElement } from 'react'

import { Text } from '@/ui'

import { convertTemperature } from '../../domain/unit-conversion'
import type { DailyForecastEntry } from '../../domain/weather-controller'
import { WmoIcon } from './WmoIcon'

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const

function formatDayLabel(isoDate: string): string {
  const d = new globalThis.Date(`${isoDate}T12:00:00Z`)
  if (Number.isNaN(d.getTime())) return isoDate
  return DAY_LABELS[d.getUTCDay()] ?? isoDate
}

export function DailyForecast({
  entries,
  units,
}: {
  entries: DailyForecastEntry[]
  units: 'metric' | 'imperial'
}): ReactElement {
  if (entries.length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Text size="xs" tone="foreground">
          No daily forecast
        </Text>
      </div>
    )
  }
  return (
    <div className="flex h-full w-full items-stretch justify-between gap-0.5 px-1">
      {entries.map((entry, index) => {
        const high = convertTemperature(entry.tempMax, units)
        const low = convertTemperature(entry.tempMin, units)
        const precip = Math.round(entry.precipitationSum)
        return (
          <div
            className="flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5"
            // eslint-disable-next-line react/no-array-index-key
            key={`${entry.date}-${index}`}
          >
            <Text size="xs" tone="primary">
              {formatDayLabel(entry.date)}
            </Text>
            <WmoIcon code={entry.weatherCode} size={14} />
            <Text size="xs" tone="primary">
              {high.value}
              {high.units}
            </Text>
            <Text size="xs" tone="foreground">
              {low.value}
              {low.units}
            </Text>
            <Text size="xs" tone="foreground">{precip}mm</Text>
          </div>
        )
      })}
    </div>
  )
}
