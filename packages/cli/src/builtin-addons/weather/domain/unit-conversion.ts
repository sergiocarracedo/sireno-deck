export interface DisplayValue {
  value: number
  units: string
}

export function convertTemperature(
  celsius: number,
  to: 'metric' | 'imperial',
): DisplayValue {
  if (to === 'imperial') {
    return { value: Math.round(celsius * 9 / 5 + 32), units: '°F' }
  }
  return { value: Math.round(celsius), units: '°C' }
}

export function convertWindSpeed(
  kmh: number,
  to: 'metric' | 'imperial',
): DisplayValue {
  if (to === 'imperial') {
    return { value: Math.round(kmh * 0.621371), units: 'mph' }
  }
  return { value: Math.round(kmh), units: 'km/h' }
}
