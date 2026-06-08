import { describe, expect, it } from 'vitest'

import { renderReactNodeToHtml } from '@/render/dom-host'
import { builtinWeatherButton } from './weather'
import type { WeatherSnapshot } from '../domain/weather-controller'

function createHarness(button: typeof builtinWeatherButton, config: unknown, snapshot: unknown) {
  const buttonStore: {
    snapshot: unknown
    set: (v: unknown) => void
  } = {
    snapshot,
    set(v) {
      buttonStore.snapshot = v
    },
  }
  const props = {
    button: { position: 0, type: button.type },
    config,
    frameState: 'idle' as const,
    hostContext: {
      os: { type: 'linux', variant: 'ubuntu', version: '24.04' },
      session: { capability: 'supported', state: 'unlocked' },
    },
    methods: { invalidate: () => {} } as never,
    pressed: false,
    store: {
      addon: { snapshot: undefined } as never,
      button: buttonStore as never,
    },
    theme: {} as never,
  } as never
  return {
    render: () => button.render(props),
  }
}

const availableSnapshot: WeatherSnapshot = {
  available: true,
  hourly: [],
  humidity: 65,
  location: 'London',
  source: 'open-meteo',
  temperature: 24,
  weatherCode: 3,
  windSpeed: 12,
}

describe('weather', () => {
  it("renders the unavailable_label when no snapshot is available", () => {
    const button = builtinWeatherButton
    const harness = createHarness(button, { units: 'metric' }, undefined)
    const html = renderReactNodeToHtml(harness.render() as never)
    expect(html).toContain('Weather')
  })

  it('renders the temperature number when available', () => {
    const button = builtinWeatherButton
    const harness = createHarness(
      button,
      { units: 'metric' },
      { snapshot: availableSnapshot },
    )
    const html = renderReactNodeToHtml(harness.render() as never)
    expect(html).toContain('24°')
  })

  it('renders the location text when available', () => {
    const button = builtinWeatherButton
    const harness = createHarness(
      button,
      { units: 'metric' },
      { snapshot: availableSnapshot },
    )
    const html = renderReactNodeToHtml(harness.render() as never)
    expect(html).toContain('London')
  })

  it('renders the humidity percentage when available', () => {
    const button = builtinWeatherButton
    const harness = createHarness(
      button,
      { units: 'metric' },
      { snapshot: availableSnapshot },
    )
    const html = renderReactNodeToHtml(harness.render() as never)
    expect(html).toContain('65%')
  })

  it('renders the correct WMO icon for clear-sky code (0)', () => {
    const button = builtinWeatherButton
    const harness = createHarness(
      button,
      { units: 'metric' },
      { snapshot: { ...availableSnapshot, weatherCode: 0 } },
    )
    const html = renderReactNodeToHtml(harness.render() as never)
    expect(html).toContain('sun')
  })

  it('renders the correct WMO icon for rain code (65)', () => {
    const button = builtinWeatherButton
    const harness = createHarness(
      button,
      { units: 'metric' },
      { snapshot: { ...availableSnapshot, weatherCode: 65 } },
    )
    const html = renderReactNodeToHtml(harness.render() as never)
    expect(html).toContain('cloud-rain')
  })

  it('renders the forecast page placeholder when hourly is empty', () => {
    const button = builtinWeatherButton
    const harness = createHarness(
      button,
      { units: 'metric' },
      { snapshot: availableSnapshot, page: 'hourly-forecast' },
    )
    const html = renderReactNodeToHtml(harness.render() as never)
    expect(html).toContain('No forecast')
  })

  it('renders hour labels and converted temperatures on the forecast page', () => {
    const button = builtinWeatherButton
    const harness = createHarness(
      button,
      { units: 'metric' },
      {
        snapshot: {
          ...availableSnapshot,
          hourly: [
            { precipitationChance: 10, temperature: 23, time: '14', weatherCode: 1 },
            { precipitationChance: 20, temperature: 22, time: '15', weatherCode: 2 },
            { precipitationChance: 30, temperature: 21, time: '16', weatherCode: 3 },
            { precipitationChance: 40, temperature: 20, time: '17', weatherCode: 45 },
            { precipitationChance: 50, temperature: 19, time: '18', weatherCode: 61 },
            { precipitationChance: 60, temperature: 18, time: '19', weatherCode: 71 },
          ],
        },
        page: 'hourly-forecast',
      },
    )
    const html = renderReactNodeToHtml(harness.render() as never)
    expect(html).toContain('14')
    expect(html).toContain('19')
    expect(html).toContain('23')
    expect(html).toContain('10%')
  })
})
