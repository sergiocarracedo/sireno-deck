import type { WeatherSnapshot } from './weather-controller.js'

const WMO_FROM_WTTR: Record<string, number> = {
  '113': 0,
  '116': 2,
  '119': 3,
  '122': 3,
  '125': 51,
  '127': 63,
  '128': 75,
  '130': 0,
  '131': 0,
  '132': 51,
  '135': 73,
  '137': 75,
  '140': 95,
  '143': 51,
  '146': 73,
  '149': 51,
  '152': 51,
  '155': 51,
  '158': 3,
  '161': 51,
  '164': 63,
  '167': 75,
  '170': 75,
  '173': 75,
  '176': 51,
  '179': 63,
  '182': 63,
  '185': 75,
  '188': 75,
  '191': 75,
  '194': 95,
  '197': 95,
  '200': 0,
  '230': 95,
  '248': 0,
  '260': 0,
  '263': 0,
  '266': 0,
  '281': 51,
  '284': 51,
  '287': 51,
  '293': 51,
  '296': 51,
  '299': 51,
  '302': 51,
  '305': 95,
  '308': 95,
  '311': 95,
  '314': 95,
  '317': 95,
  '320': 51,
  '323': 75,
  '326': 75,
  '329': 75,
  '332': 75,
  '335': 75,
  '338': 95,
  '341': 95,
  '344': 95,
  '347': 95,
  '350': 95,
  '353': 75,
  '356': 51,
  '359': 95,
  '362': 95,
  '365': 51,
  '368': 75,
  '371': 75,
  '374': 95,
  '377': 51,
  '386': 51,
  '389': 51,
  '392': 51,
  '395': 51,
}

function mapWttrCodeToWmo(wttrCode: string | number | undefined): number {
  if (wttrCode === undefined) return 0
  return WMO_FROM_WTTR[String(wttrCode)] ?? 0
}

export async function fetchWttrInSnapshot(
  latitude: number,
  longitude: number,
  name: string,
  units: 'metric' | 'imperial',
): Promise<WeatherSnapshot> {
  const response = await fetch(
    `https://wttr.in/${latitude},${longitude}?format=j1`,
  )
  if (!response.ok) {
    throw new Error(`wttr.in ${response.status}`)
  }
  const json = (await response.json()) as {
    current_condition?: Array<{
      humidity?: string | number
      temp_C?: string
      temp_F?: string
      weatherCode?: string | number
      windspeedKmph?: string | number
      windspeedMiles?: string | number
    }>
  }
  const current = json.current_condition?.[0]
  if (!current) {
    throw new Error('wttr.in: no current_condition')
  }
  const temperature = units === 'imperial'
    ? Number(current.temp_F ?? '0')
    : Number(current.temp_C ?? '0')
  const windSpeed = units === 'imperial'
    ? Number(current.windspeedMiles ?? '0')
    : Number(current.windspeedKmph ?? '0')
  return {
    available: true,
    humidity: Number(current.humidity ?? '0'),
    location: name,
    source: 'wttr.in',
    temperature,
    weatherCode: mapWttrCodeToWmo(current.weatherCode),
    windSpeed,
  }
}
