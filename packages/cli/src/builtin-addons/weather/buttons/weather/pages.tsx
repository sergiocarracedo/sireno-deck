import { Chip, Text } from '@/ui'
import { type WeatherSnapshot } from '../../provider/types'
import { iconFor } from './icons'

export const pages: ReadonlyArray<{
  name: string
  render: (props: {
    snapshot: WeatherSnapshot
    unitTemp: string
    unitWind: string
    city?: string
  }) => React.ReactNode
}> = [
  {
    name: 'main',
    render: ({ snapshot, unitTemp, city }) => (
      <div>
        <Text size="3xl" tone="primary">
          {iconFor(snapshot.wmoCode)}
        </Text>
        <Text size="xl" tone="fg" className="font-semibold leading-none">
          {snapshot.temperature?.toFixed(0)}
          {unitTemp}
        </Text>
        {city && (
          <Text size="xs" tone="fg" fit="ellipsis">
            {city}
          </Text>
        )}
      </div>
    ),
  },
  {
    name: 'data',
    render: ({ snapshot, unitWind, city }) => (
      <div>
        <Text size="xs" tone="primary" fit="ellipsis">
          {city || '---'}
        </Text>
        {snapshot.windSpeed !== undefined && (
          <Chip tone="foreground" size="sm">
            {snapshot.windSpeed.toFixed(0)} {unitWind}
          </Chip>
        )}
        {snapshot.description && (
          <Text size="xs" tone="fg" fit="ellipsis">
            {snapshot.description}
          </Text>
        )}
      </div>
    ),
  },
  {
    name: 'hourly-forecast',
    render: ({ snapshot, unitTemp }) => {
      const entries = snapshot.hourly?.slice(0, 2) ?? []
      return (
        <div className="flex items-center justify-center gap-2">
          {entries.map((e) => (
            <span key={e.time} className="flex flex-col items-center gap-0.5">
              <Text size="xs" tone="fg">
                {e.time}h
              </Text>
              <Text size="2xl" tone="primary">
                {iconFor(e.wmoCode)}
              </Text>
              <Text size="xs" tone="fg">
                {e.temperature.toFixed(0)}
                {unitTemp}
              </Text>
            </span>
          ))}
        </div>
      )
    },
  },
  {
    name: 'daily-forecast',
    render: ({ snapshot, unitTemp }) => {
      const entries = snapshot.daily?.slice(0, 2) ?? []
      const weekDays = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
      console.log(entries)
      return (
        <div className="flex items-center justify-center gap-2">
          {entries.map((e) => {
            const d = new Date(e.date)
            const dayName = weekDays[d.getDay()] ?? e.date.slice(5)
            return (
              <span key={e.date} className="flex flex-col items-center gap-0.5">
                <Text size="xs" tone="fg">
                  {dayName}
                </Text>
                <Text size="2xl" tone="primary">
                  {iconFor(e.wmoCode)}
                </Text>
                <Text size="xs" tone="primary">
                  {e.tempMin.toFixed(0)}
                  {unitTemp}
                </Text>
                <Text size="xs" tone="fg">
                  {e.tempMax.toFixed(0)}
                  {unitTemp}
                </Text>
              </span>
            )
          })}
        </div>
      )
    },
  },
]
