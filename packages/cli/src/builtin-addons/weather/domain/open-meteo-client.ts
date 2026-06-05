import type {
  HourlyForecastEntry,
  WeatherSnapshot,
} from './weather-controller.js'

interface OpenMeteoHourly {
  time: string[]
  temperature_2m: number[]
  weather_code: number[]
  precipitation_probability: number[]
}

function buildHourlyEntries(
  hourly: OpenMeteoHourly | undefined,
): HourlyForecastEntry[] {
  if (!hourly?.time?.length) return []
  const now = globalThis.Date.now()
  const startIndex = hourly.time.findIndex((iso) => {
    const t = globalThis.Date.parse(iso)
    return Number.isFinite(t) && t >= now
  })
  if (startIndex < 0) return []

  // Prefer 2h cadence; fall back to 1h when fewer than 12 future slots remain
  // so the page can still render 6 columns instead of 3.
  const stride = startIndex + 10 < hourly.time.length ? 2 : 1
  const out: HourlyForecastEntry[] = []
  for (let offset = 0; out.length < 6; offset += stride) {
    const idx = startIndex + offset
    if (idx >= hourly.time.length) break
    const iso = hourly.time[idx]
    if (iso === undefined) break
    const date = new globalThis.Date(iso)
    if (Number.isNaN(date.getTime())) break
    out.push({
      time: String(date.getHours()).padStart(2, '0'),
      temperature: hourly.temperature_2m[idx] ?? 0,
      weatherCode: hourly.weather_code[idx] ?? 0,
      precipitationChance: hourly.precipitation_probability[idx] ?? 0,
    })
  }
  return out
}

export async function fetchOpenMeteoSnapshot(
  latitude: number,
  longitude: number,
  name: string,
): Promise<WeatherSnapshot> {
  const url =
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${latitude}&longitude=${longitude}` +
    `&current=temperature_2m,weather_code,wind_speed_10m,relative_humidity_2m` +
    `&hourly=temperature_2m,weather_code,precipitation_probability` +
    `&forecast_days=3` +
    `&temperature_unit=celsius&wind_speed_unit=kmh&timezone=auto`

  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`open-meteo ${response.status}`)
  }
  const json = (await response.json()) as {
    current?: {
      temperature_2m?: number
      weather_code?: number
      wind_speed_10m?: number
      relative_humidity_2m?: number
    }
    hourly?: OpenMeteoHourly
  }
  const current = json.current
  if (!current || typeof current.temperature_2m !== 'number') {
    throw new Error('open-meteo: missing current data')
  }
  return {
    available: true,
    humidity: current.relative_humidity_2m ?? 0,
    location: name,
    source: 'open-meteo',
    temperature: current.temperature_2m,
    weatherCode: current.weather_code ?? 0,
    windSpeed: current.wind_speed_10m ?? 0,
    hourly: buildHourlyEntries(json.hourly),
  }
}
