import { describe, expect, it } from 'vitest'

import { convertTemperature, convertWindSpeed } from './unit-conversion'

describe('convertTemperature', () => {
  it('returns celsius with °C when target is metric', () => {
    const result = convertTemperature(24, 'metric')
    expect(result).toEqual({ value: 24, units: '°C' })
  })

  it('converts celsius to fahrenheit with °F when target is imperial', () => {
    const result = convertTemperature(24, 'imperial')
    expect(result).toEqual({ value: 75, units: '°F' })
  })

  it('rounds the converted value', () => {
    const result = convertTemperature(10, 'imperial')
    expect(result).toEqual({ value: 50, units: '°F' })
  })
})

describe('convertWindSpeed', () => {
  it('returns km/h with km/h when target is metric', () => {
    const result = convertWindSpeed(12, 'metric')
    expect(result).toEqual({ value: 12, units: 'km/h' })
  })

  it('converts km/h to mph with mph when target is imperial', () => {
    const result = convertWindSpeed(12, 'imperial')
    expect(result).toEqual({ value: 7, units: 'mph' })
  })
})
