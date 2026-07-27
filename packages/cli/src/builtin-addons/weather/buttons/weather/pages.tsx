import { type ReactElement } from "react"

import { Chip, Text } from "@/ui"
import { type WeatherSnapshot } from "../../provider/types"
import { WeatherIcon } from "./icons"

export interface WeatherPageProps {
  snapshot: WeatherSnapshot
  unitTemp: string
  unitWind: string
  city?: string
}

const MainPage = ({
  snapshot,
  unitTemp,
  city,
}: WeatherPageProps): ReactElement => (
  <div className="flex h-full w-full flex-col items-center justify-center gap-1">
    <WeatherIcon code={snapshot.wmoCode} className="h-10 w-10" />
    <div className="-mt-1 flex flex-col gap-0.5">
      <Text
        size="xl"
        tone="fg"
        className="font-semibold leading-none"
        text={`${snapshot.temperature?.toFixed(0) ?? ""}${unitTemp}`}
      />
      {city && <Text size="sm" tone="fg" fit="ellipsis" text={city} />}
    </div>
  </div>
)

const DataPage = ({
  snapshot,
  unitWind,
  city,
}: WeatherPageProps): ReactElement => (
  <div className="flex h-full w-full flex-col items-center justify-center gap-1">
    <Text size="sm" tone="primary" fit="ellipsis" text={city || "---"} />
    {snapshot.windSpeed !== undefined && (
      <Chip
        tone="foreground"
        size="sm"
        text={`${snapshot.windSpeed.toFixed(0)} ${unitWind}`}
      />
    )}
    {snapshot.description && (
      <Text size="xs" tone="fg" fit="ellipsis" text={snapshot.description} />
    )}
  </div>
)

const HourlyForecastPage = ({
  snapshot,
  unitTemp,
}: WeatherPageProps): ReactElement => {
  const entries = snapshot.hourly?.slice(0, 2) ?? []
  return (
    <div className="flex items-center justify-center gap-2">
      {entries.map((e) => (
        <span key={e.time} className="flex flex-col items-center gap-0.5">
          <Text size="xs" tone="fg" text={`${e.time}h`} />
          <WeatherIcon code={e.wmoCode} className="h-8 w-8" />
          <Text
            size="xs"
            tone="fg"
            text={`${e.temperature.toFixed(0)}${unitTemp}`}
          />
        </span>
      ))}
    </div>
  )
}

const DailyForecastPage = ({
  snapshot,
  unitTemp,
}: WeatherPageProps): ReactElement => {
  const entries = snapshot.daily?.slice(0, 2) ?? []
  const weekDays = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"]
  return (
    <div className="flex items-center justify-center gap-2">
      {entries.map((e) => {
        const d = new Date(e.date)
        const dayName = weekDays[d.getDay()] ?? e.date.slice(5)
        return (
          <span key={e.date} className="flex flex-col items-center gap-0.5">
            <Text size="xs" tone="fg" text={dayName} />
            <WeatherIcon code={e.wmoCode} className="h-8 w-8" />
            <Text
              size="xs"
              tone="primary"
              text={`${e.tempMin.toFixed(0)}${unitTemp}`}
            />
            <Text
              size="xs"
              tone="fg"
              text={`${e.tempMax.toFixed(0)}${unitTemp}`}
            />
          </span>
        )
      })}
    </div>
  )
}

export const weatherPageRenderers: ReadonlyArray<
  (props: WeatherPageProps) => ReactElement
> = Object.freeze([MainPage, DataPage, HourlyForecastPage, DailyForecastPage])
