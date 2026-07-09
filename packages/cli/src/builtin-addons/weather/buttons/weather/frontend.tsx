import { useCallback, useEffect, useRef, useState } from "react"

import type { AddonFrontendButton } from "@/addon/api"
import { useAddonChannel } from "@/api/react"
import { Chip, Icon, Text } from "@/ui/index"
import { cityKey } from "../../provider/city-key"
import type { ConfigSchema, WeatherStateSnapshot } from "./config"

type SurfacePage = "main" | "data" | "hourly-forecast" | "daily-forecast"

const PAGES: SurfacePage[] = [
  "main",
  "data",
  "hourly-forecast",
  "daily-forecast",
]
const AUTO_RETURN_MS = 30_000

const lookupKey = (loc: NonNullable<ConfigSchema["location"]>) =>
  typeof loc === "string" ? loc : cityKey(loc)

const WMO_ICONS: Record<number, string> = {
  0: "☀",
  1: "🌤",
  2: "⛅",
  3: "☁",
  45: "🌫",
  48: "🌫",
  51: "🌦",
  53: "🌦",
  55: "🌧",
  56: "🌧",
  57: "🌧",
  61: "🌧",
  63: "🌧",
  65: "🌧",
  66: "🌧",
  67: "🌧",
  71: "🌨",
  73: "🌨",
  75: "🌨",
  77: "🌨",
  80: "🌦",
  81: "🌦",
  82: "🌧",
  85: "🌨",
  86: "🌨",
  95: "⛈",
  96: "⛈",
  99: "⛈",
}

const iconFor = (code?: number): string => {
  if (code === undefined) return "🌍"
  return WMO_ICONS[code] ?? "🌍"
}

const WeatherButtonFrontend: AddonFrontendButton<ConfigSchema> = ({
  config,
}) => {
  const [page, setPage] = useState<SurfacePage>("main")
  const [pageChangedAt, setPageChangedAt] = useState<number | undefined>()

  const name =
    typeof config?.location === "object"
      ? config.location.name
      : config?.location
  const { data } = useAddonChannel<WeatherStateSnapshot>("weather:current")
  const lastDataRef = useRef(data)

  const loc = config?.location
  const snapshot: WeatherStateSnapshot | undefined =
    loc !== undefined && data?.byCity !== undefined
      ? data.byCity[lookupKey(loc)]
      : undefined

  useEffect(() => {
    if (page === "main" || pageChangedAt === undefined) return
    const now = Date.now()
    if (now - pageChangedAt >= AUTO_RETURN_MS) {
      setPage("main")
      setPageChangedAt(undefined)
    }
  }, [page, pageChangedAt])

  useEffect(() => {
    if (lastDataRef.current !== data && lastDataRef.current !== undefined) {
      const nextIndex = (PAGES.indexOf(page) + 1) % PAGES.length
      const nextPage = PAGES[nextIndex]!
      setPage(nextPage)
      setPageChangedAt(nextPage === "main" ? undefined : Date.now())
    }
    lastDataRef.current = data
  }, [data, page])

  const handleTap = useCallback(() => {
    const nextIndex = (PAGES.indexOf(page) + 1) % PAGES.length
    const nextPage = PAGES[nextIndex]!
    setPage(nextPage)
    setPageChangedAt(nextPage === "main" ? undefined : Date.now())
  }, [page])

  if (!snapshot?.available) {
    return (
      <button
        className="flex h-full w-full flex-col items-center justify-center gap-2"
        onClick={handleTap}
      >
        <Text size="sm" tone="fg">
          {name ?? "Weather"}
        </Text>
      </button>
    )
  }

  const unitTemp = snapshot.units === "imperial" ? "°F" : "°C"
  const unitWind = snapshot.units === "imperial" ? "mph" : "km/h"

  if (page === "data") {
    return (
      <button
        className="flex h-full w-full flex-col items-center justify-center gap-1 overflow-hidden"
        onClick={handleTap}
      >
        <Text size="xs" tone="primary" fit="ellipsis">
          {name ?? "Weather"}
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
      </button>
    )
  }

  if (page === "hourly-forecast") {
    const entries = snapshot.hourly?.slice(0, 2) ?? []
    return (
      <button
        className="flex h-full w-full items-center justify-center gap-2 overflow-hidden"
        onClick={handleTap}
      >
        {entries.map((e) => (
          <span key={e.time} className="flex flex-col items-center gap-0.5">
            <Text size="xs" tone="fg">
              {e.time}h
            </Text>
            <Text size="2xl" tone="primary">
              {iconFor(e.weatherCode)}
            </Text>
            <Text size="xs" tone="fg">
              {e.temperature.toFixed(0)}
              {unitTemp}
            </Text>
          </span>
        ))}
      </button>
    )
  }

  if (page === "daily-forecast") {
    const entries = snapshot.daily?.slice(0, 4) ?? []
    const weekDays = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"]
    return (
      <button
        className="flex h-full w-full items-center justify-center gap-2 overflow-hidden"
        onClick={handleTap}
      >
        {entries.map((e) => {
          const d = new Date(e.date)
          const dayName = weekDays[d.getDay()] ?? e.date.slice(5)
          return (
            <span key={e.date} className="flex flex-col items-center gap-0.5">
              <Text size="xs" tone="fg">
                {dayName}
              </Text>
              <Text size="2xl" tone="primary">
                {iconFor(e.weatherCode)}
              </Text>
              <span className="flex items-center gap-0.5">
                <Text size="xs" tone="primary">
                  {e.tempMin.toFixed(0)}
                </Text>
                <Text size="xs" tone="fg">
                  /{e.tempMax.toFixed(0)}
                  {unitTemp}
                </Text>
              </span>
            </span>
          )
        })}
      </button>
    )
  }

  return (
    <button
      className="flex h-full w-full flex-col items-center justify-center gap-0.5"
      onClick={handleTap}
    >
      <Text size="3xl" tone="primary">
        {iconFor(snapshot.wmoCode)}
      </Text>
      <Text size="xl" tone="fg" className="font-semibold leading-none">
        {snapshot.temperature?.toFixed(0)}
        {unitTemp}
      </Text>
      {name && (
        <Text size="xs" tone="fg" fit="ellipsis">
          {name}
        </Text>
      )}
    </button>
  )
}

export default WeatherButtonFrontend
