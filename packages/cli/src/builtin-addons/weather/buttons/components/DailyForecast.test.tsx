import { describe, expect, it } from 'vitest'

import { renderReactNodeToHtml } from '@/render/dom-host'

import type { DailyForecastEntry } from '../../domain/weather-controller'
import { DailyForecast } from './DailyForecast'

describe('DailyForecast', () => {
  it('renders the empty-state message when there are no entries', () => {
    const html = renderReactNodeToHtml(
      <DailyForecast entries={[]} units="metric" /> as never,
    )
    expect(html).toContain('No daily forecast')
  })

  it('renders one column per entry with day label, icon, high, low, and precip sum', () => {
    const entries: DailyForecastEntry[] = [
      {
        date: '2026-06-09',
        weatherCode: 0,
        tempMax: 25,
        tempMin: 15,
        precipitationSum: 5,
      },
      {
        date: '2026-06-10',
        weatherCode: 61,
        tempMax: 18,
        tempMin: 12,
        precipitationSum: 12,
      },
    ]
    const html = renderReactNodeToHtml(
      <DailyForecast entries={entries} units="metric" /> as never,
    )
    // Two columns → two day labels
    expect(html).toContain('Tue')
    expect(html).toContain('Wed')
    // Highs in °C, lows in °C
    expect(html).toContain('25')
    expect(html).toContain('°C')
    expect(html).toContain('15')
    expect(html).toContain('°C')
    // Precipitation sums (rounded to integer)
    expect(html).toContain('5mm')
    expect(html).toContain('12mm')
    // No daily-forecast placeholder
    expect(html).not.toContain('No daily forecast')
  })

  it('converts highs and lows to fahrenheit when units are imperial', () => {
    const entries: DailyForecastEntry[] = [
      {
        date: '2026-06-09',
        weatherCode: 0,
        tempMax: 0,
        tempMin: 0,
        precipitationSum: 0,
      },
    ]
    const html = renderReactNodeToHtml(
      <DailyForecast entries={entries} units="imperial" /> as never,
    )
    // 0°C → 32°F
    expect(html).toContain('32')
    expect(html).toContain('°F')
  })
})
